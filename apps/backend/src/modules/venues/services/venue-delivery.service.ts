import { QueryOrder } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable, Logger } from '@nestjs/common';

import { ApifyService } from 'src/modules/apify/services/apify.service.js';
import type { City } from 'src/modules/cities/entities/city.entity.js';

import { MenuItem } from '../entities/menu-item.entity.js';
import { Venue } from '../entities/venue.entity.js';
import {
	DeliveryPlatformEnum,
	VenueDeliveryListing,
} from '../entities/venue-delivery-listing.entity.js';
import { deliveryPlatformOf } from '../util/delivery.js';
import { isSameVenue, nameSimilarity, normalizeVenueName } from '../util/venue-names.js';

const WOLT_ACTOR = 'needy_hammock/wolt-restaurant-menu-scraper';
const LIEFERANDO_ACTOR = 'studio-amba/takeaway-scraper';
// A Wolt run is one restaurant (direct URL mode): its detail result costs ~$0.0015 plus the start
const WOLT_MIN_RUN_USD = 0.05;
// Lieferando is searched city-wide (the actor takes no restaurant URL): ~$0.002 a restaurant row,
// about $3 for the listing; the actor refuses a cap under $5 (checked 2026-10-19), so that is the floor
const LIEFERANDO_MAX_RESULTS = 1500;
const LIEFERANDO_MIN_RUN_USD = 5;
// Of the step's budget, what Wolt may spend; Lieferando's city listing takes the rest
const WOLT_BUDGET_SHARE = 0.3;

/** The `needy_hammock/wolt-restaurant-menu-scraper` item (its output schema), as far as we read it. */
export interface WoltItem {
	id?: string;
	name?: string;
	url?: string;
	postCode?: string | null;
	// 0–5 band; `ratingScore` is the 0–10 score
	rating?: number | null;
	ratingScore?: number | null;
	reviewCount?: number | null;
	currency?: string;
	deliveryBasePriceInCents?: number | null;
	menuItems?: {
		id?: string;
		name: string;
		priceInCents: number;
		category?: string | null;
	}[];
}

/** The `studio-amba/takeaway-scraper` restaurant row (Lieferando), menus off. */
export interface LieferandoItem {
	restaurantId?: string;
	name?: string;
	rating?: number | null;
	ratingCount?: number | null;
	deliveryFee?: number | null;
	minimumOrderValue?: number | null;
	currency?: string;
	postcode?: string | null;
	url?: string | null;
}

/** A listing with the menu of a month (`month` null when it has none stored). */
export interface DeliveryMenu {
	venueId: string;
	listing: VenueDeliveryListing;
	items: MenuItem[];
	month: string | null;
}

export interface DeliveryScrapeResult {
	venues: number;
	wolt: { linked: number; saved: number; menuItems: number; failed: number };
	lieferando: { searched: number; matched: number };
}

/**
 * The one writer of delivery listings and their menus. Wolt is read per restaurant from the
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
	) {}

	/** Scrapes these venues' delivery listings for `month`, replacing that month's menus. Flushes. */
	async scrape(
		venues: Venue[],
		city: Pick<City, 'name'>,
		month: string,
		budgetUsd: number,
		now = new Date(),
	): Promise<DeliveryScrapeResult> {
		const result: DeliveryScrapeResult = {
			venues: venues.length,
			wolt: { linked: 0, saved: 0, menuItems: 0, failed: 0 },
			lieferando: { searched: 0, matched: 0 },
		};
		const woltLinks = new Map<Venue, string>();
		for (const venue of venues) {
			const link = (venue.details?.orderBy ?? []).find(
				o => deliveryPlatformOf(o.url) === DeliveryPlatformEnum.WOLT,
			)?.url;
			if (link) woltLinks.set(venue, link);
		}
		result.wolt.linked = woltLinks.size;

		// Wolt: one run per restaurant, one after another (they share the entity manager)
		const woltBudget = venues.length ? budgetUsd * WOLT_BUDGET_SHARE : 0;
		const perRun = Math.max(WOLT_MIN_RUN_USD, woltLinks.size ? woltBudget / woltLinks.size : 0);
		const onWolt = new Set<string>();
		for (const [venue, url] of woltLinks) {
			try {
				const [item] = await this.apifyService.runActor<WoltItem>(
					WOLT_ACTOR,
					{ restaurantUrl: url },
					{ maxCostUsd: perRun, purpose: `wolt menu: ${venue.name}` },
				);
				if (!item?.name) continue;
				const items = await this.saveWolt(venue, url, item, month, now);
				result.wolt.saved++;
				result.wolt.menuItems += items;
				onWolt.add(venue.id);
			} catch (e) {
				result.wolt.failed++;
				this.logger.warn(`Wolt ${venue.name} failed: ${(e as Error).message}`);
			}
		}
		await this.em.flush();

		// Lieferando for the rest: one city-wide listing, matched by name (and postcode when both have one)
		const rest = venues.filter(v => !onWolt.has(v.id));
		if (rest.length) {
			const rows = await this.apifyService.runActor<LieferandoItem>(
				LIEFERANDO_ACTOR,
				{
					country: 'de',
					location: city.name,
					serviceType: 'delivery',
					maxResults: LIEFERANDO_MAX_RESULTS,
					scrapeMenus: false,
				},
				{
					maxCostUsd: Math.max(LIEFERANDO_MIN_RUN_USD, budgetUsd - woltLinks.size * perRun),
					purpose: `lieferando listing ${city.name}: ${rest.length} venues`,
				},
			);
			result.lieferando.searched = rows.length;
			for (const venue of rest) {
				const row = matchLieferando(venue, rows);
				if (!row) continue;
				await this.upsertListing(venue, DeliveryPlatformEnum.LIEFERANDO, {
					url: row.url ?? `https://www.lieferando.de/speisekarte/${row.restaurantId ?? ''}`,
					externalId: row.restaurantId ?? null,
					rating: row.rating ?? null,
					reviewsCount: row.ratingCount ?? null,
					deliveryFee: row.deliveryFee ?? null,
					minOrder: row.minimumOrderValue ?? null,
					currency: row.currency ?? 'EUR',
					fetchedAt: now,
				});
				result.lieferando.matched++;
			}
			await this.em.flush();
		}
		return result;
	}

	private async upsertListing(
		venue: Venue,
		platform: DeliveryPlatformEnum,
		fields: Omit<VenueDeliveryListing, 'id' | 'venue' | 'platform' | 'menuItems' | 'createdAt' | 'updatedAt' | 'deletedAt'>,
	): Promise<VenueDeliveryListing> {
		const listing =
			(await this.em.findOne(VenueDeliveryListing, { venue, platform })) ??
			this.em.create(VenueDeliveryListing, { venue, platform, ...fields });
		this.em.assign(listing, fields);
		return listing;
	}

	private async saveWolt(venue: Venue, url: string, item: WoltItem, month: string, now: Date): Promise<number> {
		const listing = await this.upsertListing(venue, DeliveryPlatformEnum.WOLT, {
			url: item.url ?? url,
			externalId: item.id ?? null,
			// The 0–10 score halved is finer than the 0–5 band
			rating: item.ratingScore != null ? item.ratingScore / 2 : (item.rating ?? null),
			reviewsCount: item.reviewCount ?? null,
			deliveryFee: item.deliveryBasePriceInCents != null ? item.deliveryBasePriceInCents / 100 : null,
			// Wolt shows no minimum order, only a small-order surcharge
			minOrder: null,
			currency: item.currency ?? 'EUR',
			fetchedAt: now,
		});
		await this.em.flush();
		await this.em.nativeDelete(MenuItem, { listing, month });
		const items = (item.menuItems ?? []).filter(i => i.name && i.priceInCents > 0);
		for (const menuItem of items)
			this.em.create(MenuItem, {
				listing,
				month,
				name: menuItem.name,
				price: menuItem.priceInCents / 100,
				category: menuItem.category ?? null,
			});
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
			const items = latest ? await this.em.find(MenuItem, { listing, month: latest.month }) : [];
			out.push({ venueId: listing.venue.id, listing, items, month: latest?.month ?? null });
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
		(a, b) => nameSimilarity(normalizeVenueName(b.name!), own) - nameSimilarity(normalizeVenueName(a.name!), own),
	)[0];
};
