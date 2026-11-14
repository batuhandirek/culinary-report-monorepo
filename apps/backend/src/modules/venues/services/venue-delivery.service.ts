import { QueryOrder } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable, Logger } from '@nestjs/common';

import _ from 'lodash';

import type { ActorCall } from 'src/modules/apify/actors/actor.js';
import {
	GOOGLE_SEARCH_ACTOR,
	type GoogleSearchInput,
	type GoogleSearchPage,
} from 'src/modules/apify/actors/google-search.actor.js';
import {
	LIEFERANDO_ACTOR,
	LIEFERANDO_PAGE_USD,
	LIEFERANDO_START_USD,
	type LieferandoInput,
	type LieferandoItem,
} from 'src/modules/apify/actors/lieferando.actor.js';
import {
	UBER_EATS_ACTOR,
	UBER_EATS_PAGE_USD,
	type UberEatsInput,
	type UberEatsItem,
} from 'src/modules/apify/actors/uber-eats.actor.js';
import {
	WOLT_MENU_ACTOR,
	WOLT_RUN_USD,
	type WoltItem,
	type WoltMenuInput,
} from 'src/modules/apify/actors/wolt-menu.actor.js';
import { ApifyService } from 'src/modules/apify/services/apify.service.js';
import type { City } from 'src/modules/cities/entities/city.entity.js';
import { MenuTermService } from 'src/modules/topics/services/menu-term.service.js';
import { MenuTopicService } from 'src/modules/topics/services/menu-topic.service.js';
import { TopicService } from 'src/modules/topics/services/topic.service.js';
import { VenueTopicService } from 'src/modules/topics/services/venue-topic.service.js';

import {
	DELIVERY_CAP_HEADROOM,
	DELIVERY_EXTRA_CANDIDATES,
	DELIVERY_MAX_CANDIDATES,
	DELIVERY_MIN_RUN_USD,
	DELIVERY_SEARCH_BUDGET_SHARE,
	DELIVERY_SEARCH_RETRY_MONTHS,
	GOOGLE_SEARCH_MIN_CAP_USD,
	GOOGLE_SEARCH_PAGE_USD,
} from '../constants/delivery.constant.js';
import { MenuItem } from '../entities/menu-item.entity.js';
import { MenuItemSnapshot } from '../entities/menu-item-snapshot.entity.js';
import { Venue } from '../entities/venue.entity.js';
import {
	DeliveryPlatformEnum,
	VenueDeliveryListing,
} from '../entities/venue-delivery-listing.entity.js';
import { VenueDeliverySnapshot } from '../entities/venue-delivery-snapshot.entity.js';
import {
	type DeliveryPage,
	deliveryPageOf,
	lieferandoPage,
	matchDeliveryVenue,
	menuChange,
	uberEatsPage,
	woltPage,
} from '../util/delivery-pages.js';
import { previousMonth } from '../util/month.js';
import { normalizeVenueName, plain } from '../util/venue-names.js';

/** A listing with its menu as of a month (`month` null when no month up to it has one). */
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

/** A brand whose pages are searched for: its name, the venues the search is for, its queries */
export interface DeliverySearchBrand {
	brandId: string;
	name: string;
	venueIds: string[];
	queries: string[];
}

/** The search for the pages of venues not on every platform: one web search, a result page a query */
export interface DeliverySearchPlan {
	call: ActorCall<GoogleSearchInput, GoogleSearchPage> | null;
	brands: DeliverySearchBrand[];
	/** Venues due a search the budget left for the next run */
	left: number;
}

/** One page to read: a listing we hold, or a page a search found that may be one of these venues' */
export interface DeliveryTarget {
	platform: DeliveryPlatformEnum;
	key: string;
	url: string;
	/** A held listing's venue; else the venues one of which the page may be (a brand's) */
	venueIds: string[];
	listingId?: string;
}

/** The reads of the pages: Uber Eats' and Lieferando's in one run each, Wolt's a run a page */
export interface DeliveryFetchPlan {
	targets: DeliveryTarget[];
	uberEats: ActorCall<UberEatsInput, UberEatsItem> | null;
	lieferando: ActorCall<LieferandoInput, LieferandoItem> | null;
	/** In the order of the Wolt targets */
	wolt: ActorCall<WoltMenuInput, WoltItem>[];
	/** The venues whose search these reads settle: stamped once every read came back */
	searchedVenueIds: string[];
	/** Pages a search found that the budget left unread: their venues are searched again */
	left: number;
}

/** The runs' records, null for a run that failed (a platform without a run has none either) */
export interface DeliveryRunRecords {
	uberEats: string | null;
	lieferando: string | null;
	wolt: (string | null)[];
}

export interface DeliveryScrapeResult {
	/** Pages read, of them a held listing's, and those that came back */
	pages: number;
	listings: number;
	/** Listings a page was matched to, new ones among them */
	saved: number;
	found: number;
	/** Menu items on the menus read, newly listed, and no longer listed */
	menuItems: number;
	itemsAdded: number;
	itemsRemoved: number;
	/** Held listings whose page did not answer */
	gone: number;
	/** Pages a search found that are none of the brand's venues */
	unmatched: number;
	/** Pages whose run failed */
	failed: number;
	/** Venues whose search is settled */
	searched: number;
	byPlatform: Partial<Record<DeliveryPlatformEnum, number>>;
}

/** What a page read costs on each platform, for the plan (Wolt's run is capped higher than it spends) */
const PAGE_USD: Record<DeliveryPlatformEnum, number> = {
	[DeliveryPlatformEnum.WOLT]: 0.005,
	[DeliveryPlatformEnum.LIEFERANDO]: LIEFERANDO_PAGE_USD,
	[DeliveryPlatformEnum.UBER_EATS]: UBER_EATS_PAGE_USD,
};

/** The sites a country's delivery pages are on: Lieferando only where Takeaway.com trades under that name */
const deliverySites = (country: string): string[] => {
	const cc = country.toLowerCase();
	return [
		...(cc === 'de' || cc === 'at' ? [`lieferando.${cc}`] : []),
		'wolt.com',
		'ubereats.com',
	];
};

/**
 * The queries that find a brand's pages: its quoted name, the city and the platforms' sites. One
 * query for a brand with one venue; one per site for a chain, since a result page is ten links and
 * a chain's branches fill it.
 */
export const deliveryQueries = (
	name: string,
	city: Pick<City, 'name' | 'country'>,
	venues: number,
): string[] => {
	const sites = deliverySites(city.country);
	const head = `"${name.replaceAll('"', '')}" ${city.name}`;
	return venues > 1 ?
			sites.map(site => `${head} site:${site}`)
		:	[`${head} ${sites.map(site => `site:${site}`).join(' OR ')}`];
};

/** Whether a search result is about the brand: its title or the page's address spells the name */
const namesBrand = (result: { url?: string; title?: string }, name: string): boolean => {
	const wanted = normalizeVenueName(name) || plain(name);
	if (!wanted) return false;
	const said = plain(`${result.title ?? ''} ${decodeURIComponent(result.url ?? '').replace(/[-_/]+/g, ' ')}`);
	return ` ${said} `.includes(` ${wanted} `) || said.replaceAll(' ', '').includes(wanted.replaceAll(' ', ''));
};

/**
 * The one writer of delivery listings, their monthly snapshots and their menus, on Wolt,
 * Lieferando and Uber Eats alike.
 *
 * A venue's pages are found by one web search of its brand's name on the platforms' sites
 * (`planSearch`; Lieferando has no name search of its own, and the platforms' own searches rank
 * loosely), then every page (a held listing's, a search result's, a link Google lists under "Order
 * online") is read by its address (`planFetch`): Uber Eats' and Lieferando's pages in one run each,
 * Wolt's a run a page. A read page is the venue's when it is named like it and stands where it
 * does (`matchDeliveryVenue`); it becomes the venue's listing with the month's snapshot and its
 * menu (`saveFetched`), whose items are kept for good: a read adds, updates and marks the items no
 * longer listed `removedAt`. The three actor runs are children of the `scrape-delivery` run.
 */
@Injectable()
export class VenueDeliveryService {
	private readonly logger = new Logger(VenueDeliveryService.name);

	constructor(
		private readonly em: EntityManager,
		private readonly apifyService: ApifyService,
		private readonly topicService: TopicService,
		private readonly menuTopicService: MenuTopicService,
		private readonly menuTermService: MenuTermService,
		private readonly venueTopicService: VenueTopicService,
	) {}

	/**
	 * The search for the pages of the venues due one, in the order given: a venue not on every
	 * platform that was never searched or whose search is `DELIVERY_SEARCH_RETRY_MONTHS` old (every
	 * such venue with `force`: an admin's "Find menus"). A brand's venues share its queries; as many
	 * brands as `DELIVERY_SEARCH_BUDGET_SHARE` of the budget covers, the rest left for the next run.
	 */
	async planSearch(
		city: Pick<City, 'name' | 'country'>,
		venueIds: string[],
		options: { budgetUsd: number; now: Date; force?: boolean },
	): Promise<DeliverySearchPlan> {
		const ids = _.uniq(venueIds);
		if (!ids.length) return { call: null, brands: [], left: 0 };
		const [venues, listings] = await Promise.all([
			this.em.find(Venue, { id: { $in: ids } }, { populate: ['brand'] }),
			this.em.find(VenueDeliveryListing, { venue: { $in: ids } }, { fields: ['venue', 'platform'] }),
		]);
		const byId = new Map(venues.map(v => [v.id, v]));
		const listed = _.countBy(listings, l => l.venue.id);
		const stale = new Date(options.now);
		stale.setUTCMonth(stale.getUTCMonth() - DELIVERY_SEARCH_RETRY_MONTHS);
		const platforms = deliverySites(city.country).length;
		const due = ids
			.map(id => byId.get(id))
			.filter((v): v is Venue => !!v && !v.closed)
			.filter(
				v =>
					(listed[v.id] ?? 0) < platforms &&
					(options.force || !v.deliverySearchedAt || v.deliverySearchedAt < stale),
			);
		const groups = Object.values(_.groupBy(due, v => v.brand.id));
		const brands: DeliverySearchBrand[] = [];
		let queries = 0;
		let left = 0;
		const affordable = Math.floor(
			(options.budgetUsd * DELIVERY_SEARCH_BUDGET_SHARE) / GOOGLE_SEARCH_PAGE_USD,
		);
		for (const group of groups) {
			const name = group[0].brand.name;
			const own = deliveryQueries(name, city, group.length);
			if (queries + own.length > affordable) {
				left += group.length;
				continue;
			}
			queries += own.length;
			brands.push({ brandId: group[0].brand.id, name, venueIds: group.map(v => v.id), queries: own });
		}
		if (!brands.length) return { call: null, brands, left };
		return {
			brands,
			left,
			call: {
				actor: GOOGLE_SEARCH_ACTOR,
				input: {
					queries: _.uniq(brands.flatMap(b => b.queries)).join('\n'),
					maxPagesPerQuery: 1,
					countryCode: city.country.toLowerCase(),
					languageCode: 'en',
				},
				maxCostUsd: Math.max(
					GOOGLE_SEARCH_MIN_CAP_USD,
					queries * GOOGLE_SEARCH_PAGE_USD * DELIVERY_CAP_HEADROOM,
				),
				purpose: `delivery pages: ${brands.length} brands, ${queries} searches`,
			},
		};
	}

	/**
	 * The pages to read, the venues' held listings first (a refresh), then for each venue the links
	 * Google lists under "Order online", then what the search found for each brand, in Google's
	 * order: a restaurant page whose title or address spells the brand, never one we hold, at most
	 * the brand's venues without a listing on that platform plus `DELIVERY_EXTRA_CANDIDATES`. As
	 * many as the budget covers after the search's spend; a brand with a page left unread is not
	 * settled, so its venues are searched again.
	 */
	async planFetch(
		city: Pick<City, 'name' | 'country' | 'language'>,
		venueIds: string[],
		search: DeliverySearchPlan,
		searchRecordId: string | null,
		budgetUsd: number,
	): Promise<DeliveryFetchPlan> {
		const ids = _.uniq(venueIds);
		const [venues, listings, pages] = await Promise.all([
			ids.length ? this.em.find(Venue, { id: { $in: ids } }, { fields: ['name', 'details'] }) : [],
			ids.length ?
				this.em.find(VenueDeliveryListing, { venue: { $in: ids } }, { orderBy: { createdAt: QueryOrder.ASC } })
			:	[],
			searchRecordId ? this.apifyService.storedItems<GoogleSearchPage>(searchRecordId) : [],
		]);
		const targets: DeliveryTarget[] = [];
		const taken = new Set<string>();
		const add = (target: DeliveryTarget): boolean => {
			if (taken.has(target.key)) return false;
			taken.add(target.key);
			targets.push(target);
			return true;
		};
		const has = new Set(listings.map(l => `${l.venue.id}:${l.platform}`));
		for (const listing of listings) {
			const ref = deliveryPageOf(listing.url);
			if (ref) add({ ...ref, venueIds: [listing.venue.id], listingId: listing.id });
		}
		const order = new Map(ids.map((id, i) => [id, i]));
		for (const venue of _.sortBy(venues, v => order.get(v.id)))
			for (const link of venue.details?.orderBy ?? []) {
				const ref = deliveryPageOf(link.url);
				if (ref && !has.has(`${venue.id}:${ref.platform}`)) add({ ...ref, venueIds: [venue.id] });
			}

		const byQuery = new Map<string, DeliverySearchBrand[]>();
		for (const brand of search.brands)
			for (const query of brand.queries) byQuery.set(query, [...(byQuery.get(query) ?? []), brand]);
		const found = new Map<string, number>();
		const candidates: (DeliveryTarget & { brandId: string })[] = [];
		for (const page of pages) {
			for (const brand of byQuery.get(page?.searchQuery?.term ?? '') ?? [])
				for (const result of page.organicResults ?? []) {
					const ref = deliveryPageOf(result.url);
					if (!ref || taken.has(ref.key) || !namesBrand(result, brand.name)) continue;
					const open = brand.venueIds.filter(id => !has.has(`${id}:${ref.platform}`));
					const slot = `${brand.brandId}:${ref.platform}`;
					const room = Math.min(DELIVERY_MAX_CANDIDATES, open.length + DELIVERY_EXTRA_CANDIDATES);
					if (!open.length || (found.get(slot) ?? 0) >= room) continue;
					found.set(slot, (found.get(slot) ?? 0) + 1);
					taken.add(ref.key);
					candidates.push({ ...ref, venueIds: open, brandId: brand.brandId });
				}
		}

		// The held listings are read whatever the budget says of the search: they are what was paid
		// to find. What is left after them and the search covers the candidates, in order
		const searched = _.uniq(search.brands.flatMap(b => b.queries)).length * GOOGLE_SEARCH_PAGE_USD;
		let spent = searched + _.sumBy(targets, t => PAGE_USD[t.platform]);
		const unsettled = new Set<string>();
		let left = 0;
		for (const { brandId, ...candidate } of candidates) {
			if (spent + PAGE_USD[candidate.platform] > budgetUsd) {
				unsettled.add(brandId);
				left++;
				continue;
			}
			spent += PAGE_USD[candidate.platform];
			targets.push(candidate);
		}
		const returned = new Set(pages.map(p => p?.searchQuery?.term).filter(Boolean));
		const settled = search.brands.filter(
			b => !unsettled.has(b.brandId) && b.queries.every(q => returned.has(q)),
		);
		const of = (platform: DeliveryPlatformEnum) => targets.filter(t => t.platform === platform);
		const cap = (planned: number) => Math.max(DELIVERY_MIN_RUN_USD, planned * DELIVERY_CAP_HEADROOM);
		const uber = of(DeliveryPlatformEnum.UBER_EATS);
		const lieferando = of(DeliveryPlatformEnum.LIEFERANDO);
		const note = (platform: DeliveryPlatformEnum) => {
			const all = of(platform);
			const known = all.filter(t => t.listingId).length;
			return `${known} held, ${all.length - known} to check`;
		};
		return {
			targets,
			searchedVenueIds: settled.flatMap(b => b.venueIds),
			left,
			uberEats:
				uber.length ?
					{
						actor: UBER_EATS_ACTOR,
						input: {
							urls: uber.map(t => t.url),
							locale: `${city.language.toLowerCase()}-${city.country.toUpperCase()}`,
						},
						maxCostUsd: cap(uber.length * UBER_EATS_PAGE_USD),
						purpose: `uber eats pages ${city.name}: ${note(DeliveryPlatformEnum.UBER_EATS)}`,
					}
				:	null,
			lieferando:
				lieferando.length ?
					{
						actor: LIEFERANDO_ACTOR,
						input: {
							country: city.country.toLowerCase(),
							startUrls: lieferando.map(t => ({ url: t.url })),
							outputMode: 'restaurants',
							fetchMenu: true,
							includeMenuItems: true,
							includeModifiers: false,
							proxy: { useApifyProxy: true, apifyProxyGroups: ['RESIDENTIAL'] },
						},
						maxCostUsd: cap(LIEFERANDO_START_USD + lieferando.length * LIEFERANDO_PAGE_USD),
						purpose: `lieferando pages ${city.name}: ${note(DeliveryPlatformEnum.LIEFERANDO)}`,
					}
				:	null,
			wolt: of(DeliveryPlatformEnum.WOLT).map(t => ({
				actor: WOLT_MENU_ACTOR,
				input: { restaurantUrl: t.url },
				maxCostUsd: WOLT_RUN_USD,
				purpose: `wolt page: ${t.url.split('/').pop()}`,
			})),
		};
	}

	/**
	 * What the reads brought, stored: each page that came back is the listing it was read for, or
	 * the one of the brand's venues it is (`matchDeliveryVenue`; a venue takes one page a platform),
	 * with the month's snapshot and its menu (`menuChange`: items added, updated, and marked removed
	 * when no longer listed, every listed item with its month's row; a read without a menu changes none). A held listing whose page did not
	 * answer is marked `removedAt`, and unmarked once it answers again. The venues whose search these
	 * reads settle are stamped, unless a run failed (they are searched again). New items get their
	 * food topics, the venues' menus their wordings (`MenuTermService`), the cities' venue tags a
	 * refresh. Flushes.
	 */
	async saveFetched(
		plan: DeliveryFetchPlan,
		records: DeliveryRunRecords,
		month: string,
		now: Date,
	): Promise<DeliveryScrapeResult> {
		const result: DeliveryScrapeResult = {
			pages: plan.targets.length,
			listings: plan.targets.filter(t => t.listingId).length,
			saved: 0,
			found: 0,
			menuItems: 0,
			itemsAdded: 0,
			itemsRemoved: 0,
			gone: 0,
			unmatched: 0,
			failed: 0,
			searched: 0,
			byPlatform: {},
		};
		const read = await this.readPages(plan, records);
		const venueIds = _.uniq(plan.targets.flatMap(t => t.venueIds).concat(plan.searchedVenueIds));
		if (!venueIds.length) return result;
		const venues = await this.em.find(Venue, { id: { $in: venueIds } }, { populate: ['brand'] });
		const venueOf = new Map(venues.map(v => [v.id, v]));
		const listings = await this.em.find(VenueDeliveryListing, { venue: { $in: venueIds } });
		const listingOf = new Map(listings.map(l => [`${l.venue.id}:${l.platform}`, l]));
		const listingById = new Map(listings.map(l => [l.id, l]));
		const stored = listings.length ? await this.em.find(MenuItem, { listing: { $in: listings.map(l => l.id) } }) : [];
		const itemsOf = _.groupBy(stored, i => i.listing.id);
		// The month's rows of the stored items: a second read in a month replaces them
		const itemMonths = (
			await Promise.all(
				_.chunk(
					stored.map(i => i.id),
					2000,
				).map(ids => this.em.find(MenuItemSnapshot, { menuItem: { $in: ids }, month })),
			)
		).flat();
		const itemMonthOf = new Map(itemMonths.map(row => [row.menuItem.id, row]));
		const snapshots =
			listings.length ?
				await this.em.find(VenueDeliverySnapshot, { listing: { $in: listings.map(l => l.id) }, month })
			:	[];
		const snapshotOf = new Map(snapshots.map(s => [s.listing.id, s]));
		const index = await this.topicService.index();
		const savedListings = new Set<VenueDeliveryListing>();
		const savedVenues = new Set<string>();
		const filled = new Set<string>();

		for (const target of plan.targets) {
			const outcome = read.get(target.key);
			if (!outcome) {
				result.failed++;
				continue;
			}
			const held = target.listingId ? listingById.get(target.listingId) : undefined;
			if (!outcome.page) {
				if (held && !held.removedAt) held.removedAt = now;
				if (held) result.gone++;
				continue;
			}
			const page = outcome.page;
			const venue =
				held ?
					{ id: held.venue.id }
				:	matchDeliveryVenue(
						page,
						target.venueIds
							.filter(id => !filled.has(`${id}:${page.platform}`))
							.map(id => venueOf.get(id))
							.filter((v): v is NonNullable<typeof v> => !!v)
							.map(v => ({
								id: v.id,
								name: v.name,
								brandName: v.brand.name,
								street: v.street,
								postalCode: v.postalCode,
								lat: v.lat,
								lng: v.lng,
							})),
					);
			if (!venue) {
				result.unmatched++;
				continue;
			}
			const slot = `${venue.id}:${page.platform}`;
			if (filled.has(slot)) {
				result.unmatched++;
				continue;
			}
			filled.add(slot);
			const fields = {
				url: page.url,
				externalId: page.externalId ?? null,
				name: page.name,
				address: [page.street, page.postalCode].filter(Boolean).join(', ') || null,
				cuisines: page.cuisines.length ? page.cuisines : null,
				rating: page.rating ?? null,
				reviewsCount: page.reviewsCount ?? null,
				deliveryFee: page.deliveryFee ?? null,
				minOrder: page.minOrder ?? null,
				etaMin: page.etaMin ?? null,
				etaMax: page.etaMax ?? null,
				currency: page.currency,
				fetchedAt: now,
				removedAt: null,
				...(page.items.length && { menuFetchedAt: now }),
			};
			let listing = held ?? listingOf.get(slot);
			if (listing) this.em.assign(listing, fields);
			else {
				listing = this.em.create(VenueDeliveryListing, {
					venue: this.em.getReference(Venue, venue.id),
					platform: page.platform,
					...fields,
				});
				listingOf.set(slot, listing);
				result.found++;
			}
			const figures = {
				rating: fields.rating,
				reviewsCount: fields.reviewsCount,
				deliveryFee: fields.deliveryFee,
				minOrder: fields.minOrder,
				etaMin: fields.etaMin,
				etaMax: fields.etaMax,
				menuItems: page.items.length || null,
				fetchedAt: now,
			};
			const snapshot = listing.id ? snapshotOf.get(listing.id) : undefined;
			if (snapshot) this.em.assign(snapshot, figures);
			else this.em.create(VenueDeliverySnapshot, { listing, month, ...figures });

			const change = menuChange(listing.id ? (itemsOf[listing.id] ?? []) : [], page.items, now);
			// Every listed item's month: its price and rating as this read saw them
			const monthOf = (fields: (typeof change.added)[number]) => ({
				price: fields.price,
				likedShare: fields.likedShare ?? null,
				ratingsCount: fields.ratingsCount ?? null,
				seenAt: now,
			});
			for (const { item, fields: itemFields } of change.seen) {
				this.em.assign(item, itemFields);
				const had = itemMonthOf.get(item.id);
				if (had) this.em.assign(had, monthOf(itemFields));
				else this.em.create(MenuItemSnapshot, { menuItem: item, month, ...monthOf(itemFields) });
			}
			for (const item of change.removed) item.removedAt = now;
			for (const itemFields of change.added)
				this.em.create(MenuItemSnapshot, {
					menuItem: this.em.create(MenuItem, { listing, ...itemFields }),
					month,
					...monthOf(itemFields),
				});
			savedListings.add(listing);
			result.menuItems += page.items.length;
			result.itemsAdded += change.added.length;
			result.itemsRemoved += change.removed.length;
			result.saved++;
			result.byPlatform[page.platform] = (result.byPlatform[page.platform] ?? 0) + 1;
			savedVenues.add(venue.id);
		}
		if (!result.failed)
			for (const id of plan.searchedVenueIds) {
				const venue = venueOf.get(id);
				if (venue) venue.deliverySearchedAt = now;
				if (venue) result.searched++;
			}
		await this.em.flush();
		if (savedVenues.size) {
			// The items' food topics, new ones and those read again (a name or a section may have moved)
			await this.menuTopicService.relink(
				index,
				[...savedListings].map(listing => listing.id),
			);
			await this.menuTermService.relinkVenues([...savedVenues]);
			await this.venueTopicService.queueCityRefresh(
				_.uniq([...savedVenues].map(id => venueOf.get(id)!.city.id)),
			);
		}
		this.logger.log(
			`Delivery pages: ${result.saved} of ${result.pages} saved (${result.found} new), ${result.itemsAdded} items added, ${result.itemsRemoved} removed, ${result.gone} gone, ${result.unmatched} unmatched, ${result.failed} failed`,
		);
		return result;
	}

	/**
	 * Each target's outcome by its key, read from the runs' rows: its page, null when its run came
	 * back without it (the page is gone), and no entry when its run failed.
	 */
	private async readPages(
		plan: DeliveryFetchPlan,
		records: DeliveryRunRecords,
	): Promise<Map<string, { page: DeliveryPage | null }>> {
		const out = new Map<string, { page: DeliveryPage | null }>();
		const batch = async <Item>(
			platform: DeliveryPlatformEnum,
			recordId: string | null,
			toPage: (item: Item) => DeliveryPage | null,
		) => {
			if (!recordId) return;
			const pages = new Map<string, DeliveryPage>();
			for (const item of await this.apifyService.storedItems<Item>(recordId)) {
				const page = toPage(item);
				if (page) pages.set(page.key, page);
			}
			for (const target of plan.targets.filter(t => t.platform === platform))
				out.set(target.key, { page: pages.get(target.key) ?? null });
		};
		await batch<UberEatsItem>(DeliveryPlatformEnum.UBER_EATS, records.uberEats, item =>
			item?.isLost ? null : uberEatsPage(item),
		);
		await batch<LieferandoItem>(DeliveryPlatformEnum.LIEFERANDO, records.lieferando, lieferandoPage);
		const wolt = plan.targets.filter(t => t.platform === DeliveryPlatformEnum.WOLT);
		for (const [i, target] of wolt.entries()) {
			const recordId = records.wolt[i];
			if (!recordId) continue;
			const [item] = await this.apifyService.storedItems<WoltItem>(recordId);
			// A read under another address is still the page asked for: Wolt answers in its own spelling
			const page = woltPage(item, target.url);
			out.set(target.key, { page: page && { ...page, key: target.key, url: target.url } });
		}
		return out;
	}

	/**
	 * These venues' listings, each with its menu as of `month`: the items with a monthly row
	 * (`MenuItemSnapshot`) for the listing's latest month up to it that has any; Wolt's first.
	 * `month` null for a listing with no menu by then.
	 */
	async menus(venueIds: string[], month: string): Promise<DeliveryMenu[]> {
		if (venueIds.length === 0) return [];
		const listings = await this.em.find(
			VenueDeliveryListing,
			{ venue: { $in: venueIds } },
			{ orderBy: { platform: QueryOrder.ASC } },
		);
		if (!listings.length) return [];
		const rows: { listing_id: string; month: string; menu_item_id: number }[] = await this.em
			.getConnection()
			.execute(
				`select mi.listing_id, s.month, s.menu_item_id from menu_item_snapshots s
					join menu_items mi on mi.id = s.menu_item_id
					where mi.listing_id in (${listings.map(() => '?').join(', ')})
					and s.month = (select max(s2.month) from menu_item_snapshots s2
						join menu_items x on x.id = s2.menu_item_id
						where x.listing_id = mi.listing_id and s2.month <= ?)`,
				[...listings.map(l => l.id), month],
			);
		const items = (
			await Promise.all(
				_.chunk(
					rows.map(r => r.menu_item_id),
					2000,
				).map(ids => this.em.find(MenuItem, { id: { $in: ids } })),
			)
		).flat();
		const itemsOf = _.groupBy(items, i => i.listing.id);
		const monthOf = new Map(rows.map(r => [r.listing_id, r.month]));
		return listings.map(listing => ({
			venueId: listing.venue.id,
			listing,
			items: itemsOf[listing.id] ?? [],
			month: monthOf.get(listing.id) ?? null,
		}));
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
