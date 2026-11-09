import { QueryOrder } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable, Logger } from '@nestjs/common';

import _ from 'lodash';

import type { ActorCall } from 'src/modules/apify/actors/actor.js';
import {
	type LieferandoItem,
	TAKEAWAY_ACTOR,
	type TakeawayInput,
} from 'src/modules/apify/actors/takeaway.actor.js';
import {
	WOLT_MENU_ACTOR,
	type WoltItem,
	type WoltMenuInput,
} from 'src/modules/apify/actors/wolt-menu.actor.js';
import { ApifyService } from 'src/modules/apify/services/apify.service.js';
import type { City } from 'src/modules/cities/entities/city.entity.js';
import { MenuTopicService } from 'src/modules/topics/services/menu-topic.service.js';
import { TopicService } from 'src/modules/topics/services/topic.service.js';
import { VenueTopicService } from 'src/modules/topics/services/venue-topic.service.js';
import type { TopicIndex } from 'src/modules/topics/util/topics.js';

import { MenuItem } from '../entities/menu-item.entity.js';
import { Venue } from '../entities/venue.entity.js';
import {
	DeliveryPlatformEnum,
	VenueDeliveryListing,
} from '../entities/venue-delivery-listing.entity.js';
import { VenueDeliverySnapshot } from '../entities/venue-delivery-snapshot.entity.js';
import { deliveryPlatformOf } from '../util/delivery.js';
import { previousMonth } from '../util/month.js';
import { isSameVenue, nameSimilarity, normalizeVenueName } from '../util/venue-names.js';

// A Wolt run is one restaurant (direct URL mode): its detail result costs ~$0.0015 plus the start
const WOLT_MIN_RUN_USD = 0.05;
// Lieferando is searched city-wide (the actor takes no restaurant URL): ~$0.002 a restaurant row,
// about $3 for the listing; the actor refuses a cap under $5 (checked 2026-10-19), so that is the floor
const LIEFERANDO_MAX_RESULTS = 1500;
const LIEFERANDO_MIN_RUN_USD = 5;
// Of the step's budget, what Wolt may spend; Lieferando's city listing takes the rest
const WOLT_BUDGET_SHARE = 0.3;

/** A listing with the menu of a month (`month` null when it has none stored). */
export interface DeliveryMenu {
	venueId: string;
	listing: VenueDeliveryListing;
	items: MenuItem[];
	month: string | null;
}

/** A listing's figures as of a month: that month's snapshot, and the month before's when stored. */
export interface DeliveryFigures {
	current: VenueDeliverySnapshot;
	previous?: VenueDeliverySnapshot;
}

export interface DeliveryScrapeResult {
	venues: number;
	wolt: { linked: number; saved: number; menuItems: number; failed: number };
	lieferando: { searched: number; matched: number };
}

/** The Wolt side as the `scrape-delivery` workflow runs it: one run per linked restaurant */
export interface WoltPlan {
	/** Venues with a Wolt link under Google's "Order online" */
	linked: number;
	runs: { venueId: string; url: string; call: ActorCall<WoltMenuInput, WoltItem> }[];
	/** Each run's cap */
	perRunUsd: number;
}

/** The Lieferando side: one city-wide listing for the venues not on Wolt */
export interface LieferandoPlan {
	venueIds: string[];
	call: ActorCall<TakeawayInput, LieferandoItem> | null;
}

/**
 * The one writer of delivery listings, their monthly snapshots and their menus. Wolt is read per restaurant from the
 * Wolt link Google lists under "Order online" (full menu, cents); Lieferando only by matching
 * the city's restaurant list by name and postcode (rating, fee, minimum order; the actor fetches
 * menus only for a whole search, so none are stored for Lieferando).
 */
@Injectable()
export class VenueDeliveryService {
	private readonly logger = new Logger(VenueDeliveryService.name);

	constructor(
		private readonly em: EntityManager,
		private readonly apifyService: ApifyService,
		private readonly topicService: TopicService,
		private readonly menuTopicService: MenuTopicService,
		private readonly venueTopicService: VenueTopicService,
	) {}

	/**
	 * The Wolt runs: one per venue with a Wolt link under Google's "Order online", each capped at
	 * its share of `WOLT_BUDGET_SHARE` of the budget (at least `WOLT_MIN_RUN_USD`).
	 */
	planWolt(venues: Venue[], budgetUsd: number): WoltPlan {
		const links: { venue: Venue; url: string }[] = [];
		for (const venue of venues) {
			const url = (venue.details?.orderBy ?? []).find(
				o => deliveryPlatformOf(o.url) === DeliveryPlatformEnum.WOLT,
			)?.url;
			if (url) links.push({ venue, url });
		}
		const woltBudget = venues.length ? budgetUsd * WOLT_BUDGET_SHARE : 0;
		const perRunUsd = Math.max(WOLT_MIN_RUN_USD, links.length ? woltBudget / links.length : 0);
		return {
			linked: links.length,
			perRunUsd,
			runs: links.map(({ venue, url }) => ({
				venueId: venue.id,
				url,
				call: {
					actor: WOLT_MENU_ACTOR,
					input: { restaurantUrl: url },
					maxCostUsd: perRunUsd,
					purpose: `wolt menu: ${venue.name}`,
				},
			})),
		};
	}

	/**
	 * Each Wolt run's item read from its row and stored as the venue's listing, the month's
	 * snapshot and menu (items with their food topics); a failed run (`null`) or an empty item
	 * counts as failed. A new menu moves its venues' tags: their cities' by job. Flushes; the
	 * venues now on Wolt.
	 */
	async saveWolt(
		plan: WoltPlan,
		recordIds: (string | null)[],
		month: string,
		now: Date,
	): Promise<{ saved: number; menuItems: number; failed: number; onWolt: string[] }> {
		const result = { saved: 0, menuItems: 0, failed: 0, onWolt: [] as string[] };
		if (!plan.runs.length) return result;
		const venues = await this.em.find(Venue, { id: { $in: plan.runs.map(r => r.venueId) } });
		const byId = new Map(venues.map(v => [v.id, v]));
		const index = await this.topicService.index();
		for (const [i, run] of plan.runs.entries()) {
			const venue = byId.get(run.venueId);
			const recordId = recordIds[i];
			const [item] =
				recordId ? await this.apifyService.storedItems<WoltItem>(recordId) : [undefined];
			if (!venue || !item?.name) {
				result.failed++;
				continue;
			}
			result.menuItems += await this.saveWoltItem(venue, run.url, item, month, now, index);
			result.saved++;
			result.onWolt.push(venue.id);
		}
		await this.em.flush();
		if (result.saved)
			await this.venueTopicService.queueCityRefresh(_.uniq(venues.map(v => v.city.id)));
		return result;
	}

	/**
	 * The Lieferando run for the venues not on Wolt: one city-wide listing (the actor takes no
	 * restaurant URL), capped at what the budget has left, at least the actor's $5 floor. None
	 * without a venue.
	 */
	planLieferando(
		venueIds: string[],
		city: Pick<City, 'name'>,
		budgetUsd: number,
	): LieferandoPlan {
		if (!venueIds.length) return { venueIds, call: null };
		return {
			venueIds,
			call: {
				actor: TAKEAWAY_ACTOR,
				input: {
					country: 'de',
					location: city.name,
					serviceType: 'delivery',
					maxResults: LIEFERANDO_MAX_RESULTS,
					scrapeMenus: false,
				},
				maxCostUsd: Math.max(LIEFERANDO_MIN_RUN_USD, budgetUsd),
				purpose: `lieferando listing ${city.name}: ${venueIds.length} venues`,
			},
		};
	}

	/**
	 * The listing's rows read from the run's row and matched to the venues by name (and postcode
	 * when both have one): rating, fees and minimum order as the venue's listing and the month's
	 * snapshot; no menu (the actor fetches menus only for a whole search). Flushes.
	 */
	async saveLieferando(
		plan: LieferandoPlan,
		recordId: string | null,
		month: string,
		now: Date,
	): Promise<{ searched: number; matched: number }> {
		if (!recordId || !plan.venueIds.length) return { searched: 0, matched: 0 };
		const rows = await this.apifyService.storedItems<LieferandoItem>(recordId);
		const venues = await this.em.find(Venue, { id: { $in: plan.venueIds } });
		let matched = 0;
		for (const venue of venues) {
			const row = matchLieferando(venue, rows);
			if (!row) continue;
			await this.upsertListing(venue, DeliveryPlatformEnum.LIEFERANDO, month, {
				url: row.url ?? `https://www.lieferando.de/speisekarte/${row.restaurantId ?? ''}`,
				externalId: row.restaurantId ?? null,
				rating: row.rating ?? null,
				reviewsCount: row.ratingCount ?? null,
				deliveryFee: row.deliveryFee ?? null,
				minOrder: row.minimumOrderValue ?? null,
				currency: row.currency ?? 'EUR',
				fetchedAt: now,
			});
			matched++;
		}
		await this.em.flush();
		return { searched: rows.length, matched };
	}

	private async upsertListing(
		venue: Venue,
		platform: DeliveryPlatformEnum,
		month: string,
		fields: Omit<
			VenueDeliveryListing,
			'id' | 'venue' | 'platform' | 'menuItems' | 'createdAt' | 'updatedAt' | 'deletedAt'
		>,
	): Promise<VenueDeliveryListing> {
		const existing = await this.em.findOne(VenueDeliveryListing, { venue, platform });
		const listing =
			existing ?? this.em.create(VenueDeliveryListing, { venue, platform, ...fields });
		this.em.assign(listing, fields);
		const figures = {
			rating: fields.rating ?? null,
			reviewsCount: fields.reviewsCount ?? null,
			deliveryFee: fields.deliveryFee ?? null,
			minOrder: fields.minOrder ?? null,
			fetchedAt: fields.fetchedAt,
		};
		// A new listing has no snapshot yet (and no id to look one up by)
		const snapshot =
			existing &&
			(await this.em.findOne(VenueDeliverySnapshot, { listing: existing, month }));
		if (snapshot) this.em.assign(snapshot, figures);
		else this.em.create(VenueDeliverySnapshot, { listing, month, ...figures });
		return listing;
	}

	private async saveWoltItem(
		venue: Venue,
		url: string,
		item: WoltItem,
		month: string,
		now: Date,
		index: TopicIndex,
	): Promise<number> {
		const listing = await this.upsertListing(venue, DeliveryPlatformEnum.WOLT, month, {
			url: item.url ?? url,
			externalId: item.id ?? null,
			// The 0–10 score halved is finer than the 0–5 band
			rating: item.ratingScore != null ? item.ratingScore / 2 : (item.rating ?? null),
			reviewsCount: item.reviewCount ?? null,
			deliveryFee:
				item.deliveryBasePriceInCents != null ? item.deliveryBasePriceInCents / 100 : null,
			// Wolt shows no minimum order, only a small-order surcharge
			minOrder: null,
			currency: item.currency ?? 'EUR',
			fetchedAt: now,
		});
		await this.em.flush();
		await this.em.nativeDelete(MenuItem, { listing, month });
		const items = (item.menuItems ?? []).filter(i => i.name && i.priceInCents > 0);
		const created = items.map(menuItem =>
			this.em.create(MenuItem, {
				listing,
				month,
				name: menuItem.name,
				price: menuItem.priceInCents / 100,
				category: menuItem.category ?? null,
			}),
		);
		this.menuTopicService.linkItems(created, index);
		return items.length;
	}

	/** These venues' listings, with the menu of `month` (or of the latest month that has one). */
	async menus(venueIds: string[], month: string): Promise<DeliveryMenu[]> {
		if (venueIds.length === 0) return [];
		const listings = await this.em.find(
			VenueDeliveryListing,
			{ venue: { $in: venueIds } },
			{ orderBy: { platform: QueryOrder.ASC } },
		);
		const out: DeliveryMenu[] = [];
		for (const listing of listings) {
			const latest = await this.em.findOne(
				MenuItem,
				{ listing, month: { $lte: month } },
				{ orderBy: { month: QueryOrder.DESC }, fields: ['month'] },
			);
			const items =
				latest ? await this.em.find(MenuItem, { listing, month: latest.month }) : [];
			out.push({ venueId: listing.venue.id, listing, items, month: latest?.month ?? null });
		}
		return out;
	}

	/**
	 * These listings' figures as of `month`, by listing id: the latest snapshot up to it, and the
	 * month before's only when the latest is `month` itself. A listing without one is left out.
	 */
	async figures(listingIds: string[], month: string): Promise<Map<string, DeliveryFigures>> {
		const out = new Map<string, DeliveryFigures>();
		if (listingIds.length === 0) return out;
		const before = previousMonth(new Date(`${month}-01T00:00:00Z`));
		const snapshots = await this.em.find(
			VenueDeliverySnapshot,
			{ listing: { $in: listingIds }, month: { $lte: month } },
			{ orderBy: { month: QueryOrder.DESC } },
		);
		for (const snapshot of snapshots) {
			const id = snapshot.listing.id;
			const seen = out.get(id);
			if (!seen) out.set(id, { current: snapshot });
			else if (!seen.previous && seen.current.month === month && snapshot.month === before)
				seen.previous = snapshot;
		}
		return out;
	}
}

/**
 * The Lieferando row that is this venue: the same name (`isSameVenue`), in the same postcode
 * when both have one; the closest name wins.
 */
export const matchLieferando = (
	venue: Pick<Venue, 'name' | 'postalCode'>,
	rows: LieferandoItem[],
): LieferandoItem | undefined => {
	const own = normalizeVenueName(venue.name);
	const candidates = rows.filter(
		row =>
			row.name &&
			isSameVenue(row.name, venue.name) &&
			(!venue.postalCode || !row.postcode || row.postcode === venue.postalCode),
	);
	return candidates.sort(
		(a, b) =>
			nameSimilarity(normalizeVenueName(b.name!), own) -
			nameSimilarity(normalizeVenueName(a.name!), own),
	)[0];
};
