import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable, Logger } from '@nestjs/common';

import _ from 'lodash';

import { VenueFoodTopicService } from 'src/modules/food-topics/services/venue-food-topic.service.js';
import { ApifyService } from 'src/modules/apify/services/apify.service.js';
import type { City } from 'src/modules/cities/entities/city.entity.js';
import { cityNames } from 'src/modules/cities/util/city.js';
import { PgBossService } from 'src/modules/pgboss/pgboss.service.js';

import { VenueScrapeSourceEnum } from '../constants/venue-status.constant.js';
import { Venue } from '../entities/venue.entity.js';
import { VenueLookup } from '../entities/venue-lookup.entity.js';
import { BrandAutoMergeJob } from '../jobs/brand-auto-merge.job.js';
import { isBrandName } from '../util/brands.js';
import { cityStopwords, isFoodVenue, isInCity, normalizeVenueName } from '../util/venue-names.js';

import { GooglePlaceItem, VenueService } from './venue.service.js';

const GOOGLE_PLACES_ACTOR = 'compass/crawler-google-places';

// Google results kept per looked-up name; the matcher picks the right one
const LOOKUP_RESULTS_PER_NAME = 3;

// A name still unmatched this long after its last lookup is searched again: creators post about
// a place in its first weeks, often before Google lists it
export const LOOKUP_RETRY_MONTHS = 3;
/** Names one lookup run searches at most, counted after the ones searched lately are dropped. */
export const LOOKUP_MAX_NAMES = 500;

/** Whether a lookup is old enough to pay for again. */
export const lookupStale = (lookedUpAt: Date, now = new Date()): boolean => {
	const due = new Date(lookedUpAt);
	due.setUTCMonth(due.getUTCMonth() + LOOKUP_RETRY_MONTHS);
	return due <= now;
};

// Places kept per brand search: Berlin's Burgermeister came back as 15 branches and 25
// look-alikes, Brammibal's as 9 and 3 (2026-10-18)
export const BRAND_SEARCH_RESULTS = 40;

@Injectable()
export class VenueScrapeService {
	private readonly logger = new Logger(VenueScrapeService.name);

	constructor(
		private readonly em: EntityManager,
		private readonly apifyService: ApifyService,
		private readonly venueService: VenueService,
		private readonly pgBossService: PgBossService,
		private readonly venueFoodTopicService: VenueFoodTopicService,
	) {}

	/** The venue master list: every place Google Maps finds for these terms in the city. */
	async scrapeCity(opts: {
		city: City;
		terms: string[];
		maxPerTerm: number;
		budgetUsd: number;
	}): Promise<{ saved: number; districtsFilled: number }> {
		const items = await this.apifyService.runActor<GooglePlaceItem>(
			GOOGLE_PLACES_ACTOR,
			{
				searchStringsArray: opts.terms,
				locationQuery: opts.city.locationQuery,
				maxCrawledPlacesPerSearch: opts.maxPerTerm,
				language: 'en',
				maxReviews: 0,
				maxImages: 0,
			},
			{
				maxCostUsd: opts.budgetUsd,
				purpose: `google-places ${opts.city.name}: ${opts.terms.join(', ')}`,
			},
		);
		// The city's first city-wide list is the baseline: what it finds is not new
		const saved = await this.saveAll(items, opts.city, {
			source: VenueScrapeSourceEnum.CITY,
			openings: !!opts.city.venuesScrapedAt,
		});
		opts.city.venuesScrapedAt = new Date();
		await this.em.flush();
		return { saved, districtsFilled: await this.venueService.fillDistricts(opts.city) };
	}

	/**
	 * Searches Google Maps in the city for venue names that mentions named but nothing matched.
	 * A name searched there within `LOOKUP_RETRY_MONTHS` is skipped, so it is not paid for
	 * twice; one still unmatched after that is searched again (its row is updated, never
	 * doubled), since a place named before Google listed it is there by then. `names` come most
	 * important first and the cap applies to what is left to search, so the names searched lately
	 * never take the run's room.
	 */
	async lookupNames(
		city: City,
		names: string[],
		budgetUsd: number,
		now = new Date(),
		maxNames = LOOKUP_MAX_NAMES,
	): Promise<{ lookedUp: number; retried: number; saved: number }> {
		const words = cityStopwords(city.nameStopwords);
		const lookups = new Map(
			(await this.em.find(VenueLookup, { city })).map(l => [l.query, l]),
		);
		const queries = new Map<string, string>();
		for (const name of names) {
			if (queries.size >= maxNames) break;
			const key = normalizeVenueName(name, words);
			if (!key || queries.has(key)) continue;
			const earlier = lookups.get(key);
			if (earlier && !lookupStale(earlier.lookedUpAt, now)) continue;
			queries.set(key, name);
		}
		if (queries.size === 0) return { lookedUp: 0, retried: 0, saved: 0 };

		const items = await this.apifyService.runActor<GooglePlaceItem>(
			GOOGLE_PLACES_ACTOR,
			{
				searchStringsArray: [...queries.values()],
				locationQuery: city.locationQuery,
				maxCrawledPlacesPerSearch: LOOKUP_RESULTS_PER_NAME,
				language: 'en',
				maxReviews: 0,
				maxImages: 0,
			},
			{
				maxCostUsd: budgetUsd,
				purpose: `google-places lookup ${city.name}: ${queries.size} names`,
			},
		);

		const found = new Map<string, number>();
		for (const item of items) {
			const key = normalizeVenueName(item.searchString ?? '', words);
			found.set(key, (found.get(key) ?? 0) + 1);
		}
		let retried = 0;
		for (const key of queries.keys()) {
			const earlier = lookups.get(key);
			if (earlier) {
				earlier.results = found.get(key) ?? 0;
				earlier.lookedUpAt = now;
				retried++;
			} else {
				this.em.create(VenueLookup, { city, query: key, results: found.get(key) ?? 0, lookedUpAt: now });
			}
		}
		// Known places are updated; a new one joins only when it serves food in the city
		const saved = await this.saveFound(items, city);
		return { lookedUp: queries.size, retried, saved };
	}

	/**
	 * Searches Google Maps in the city for each brand's name, `BRAND_SEARCH_RESULTS` places a
	 * name, in one run: Google lists a chain's branches together, look-alikes after them. Every
	 * place is saved like a lookup (never an opening, so matching gets the look-alikes too); the
	 * result gives, per brand key, the open food venues whose name is a branch name of it
	 * (`isBrandName`). Unlike `lookupNames`, a name can be searched again: new branches open.
	 */
	async searchBrands(
		city: City,
		brands: { name: string; key: string }[],
		budgetUsd: number,
	): Promise<{ found: number; saved: number; branches: Map<string, Venue[]> }> {
		const branches = new Map(brands.map(b => [b.key, [] as Venue[]]));
		if (brands.length === 0) return { found: 0, saved: 0, branches };
		const items = await this.apifyService.runActor<GooglePlaceItem>(
			GOOGLE_PLACES_ACTOR,
			{
				searchStringsArray: brands.map(b => b.name),
				locationQuery: city.locationQuery,
				maxCrawledPlacesPerSearch: BRAND_SEARCH_RESULTS,
				language: 'en',
				maxReviews: 0,
				maxImages: 0,
			},
			{
				maxCostUsd: budgetUsd,
				purpose: `google-places brands ${city.name}: ${brands.map(b => b.name).join(', ')}`,
			},
		);

		const words = cityStopwords(city.nameStopwords);
		const bySearch = new Map(brands.map(b => [b.name.trim().toLowerCase(), b]));
		const now = new Date();
		let saved = 0;
		for (const item of items) {
			const venue = await this.venueService.saveGooglePlace(item, now, city, {
				source: VenueScrapeSourceEnum.LOOKUP,
			});
			if (!venue) continue;
			saved++;
			const brand = bySearch.get((item.searchString ?? '').trim().toLowerCase());
			if (
				brand &&
				!venue.closed &&
				isFoodVenue(venue.category) &&
				isBrandName(venue.name, brand.key, words)
			) {
				const list = branches.get(brand.key)!;
				if (!list.includes(venue)) list.push(venue);
			}
		}
		await this.em.flush();
		await this.venueService.fillDistricts(city);
		if (saved) await this.queueAutoMerge([city.id]);
		this.logger.log(
			`Brand search in ${city.name}: ${items.length} places for ${brands.length} brands`,
		);
		return { found: items.length, saved, branches };
	}

	/**
	 * Google Maps searches typed as a guest types them, the city in the text (no `locationQuery`:
	 * no map grid, Google's own order), `perSearch` places each, list data only. What comes back
	 * is saved like `saveFound`; the items are returned for the caller to read (`searchString`,
	 * `rank`).
	 */
	async searchPlaces<T extends GooglePlaceItem>(
		city: City,
		searches: string[],
		perSearch: number,
		budgetUsd: number,
		purpose: string,
	): Promise<{ items: T[]; saved: number }> {
		if (searches.length === 0) return { items: [], saved: 0 };
		const items = await this.apifyService.runActor<T>(
			GOOGLE_PLACES_ACTOR,
			{
				searchStringsArray: searches,
				maxCrawledPlacesPerSearch: perSearch,
				language: 'en',
				maxReviews: 0,
				maxImages: 0,
				maxQuestions: 0,
			},
			{ maxCostUsd: budgetUsd, purpose },
		);
		return { items, saved: await this.saveFound(items, city) };
	}

	/**
	 * Saves what a search returned besides what it was run for: known venues are updated, and a
	 * new place joins `city` when Google places it there (`item.city`, a search can cross the
	 * border) and it serves food or drinks. Never an opening: a search finds old places too.
	 */
	async saveFound(items: GooglePlaceItem[], city: City): Promise<number> {
		const ids = [...new Set(items.map(i => i.placeId).filter(Boolean))] as string[];
		if (ids.length === 0) return 0;
		const known = new Set(
			(await this.em.find(Venue, { placeId: { $in: ids } }, { fields: ['placeId'] })).map(
				v => v.placeId,
			),
		);
		const names = cityNames(city);
		const kept = items.filter(
			item =>
				known.has(item.placeId!) ||
				(isInCity(item.city, names) && isFoodVenue(item.categoryName)),
		);
		const saved = await this.saveAll(kept, city, { source: VenueScrapeSourceEnum.LOOKUP });
		await this.venueService.fillDistricts(city);
		return saved;
	}

	/**
	 * Re-scrapes these places' Google Maps detail pages (by place id: about $3.50 per 1,000) for
	 * what a list scrape lacks — popular times, every amenity section, menu, delivery platforms,
	 * "people also search" — and saves them through `saveGooglePlace`, which also records the
	 * day's rating snapshot.
	 */
	async refreshDetails(
		placeIds: string[],
		budgetUsd: number,
	): Promise<{ requested: number; saved: number; withPopularTimes: number }> {
		const ids = [...new Set(placeIds)];
		if (ids.length === 0) return { requested: 0, saved: 0, withPopularTimes: 0 };
		const { items, saved } = await this.scrapeDetailPages(
			ids,
			budgetUsd,
			`google-places details: ${ids.length} venues`,
		);
		const withPopularTimes = items.filter(
			item => Object.keys(item.popularTimesHistogram ?? {}).length > 0,
		).length;
		return { requested: ids.length, saved, withPopularTimes };
	}

	/**
	 * Scrapes these places' detail pages and saves them (known venues only), returning the raw
	 * items for callers that read more from them, e.g. the busyness sample's live percent.
	 */
	async scrapeDetailPages(
		placeIds: string[],
		budgetUsd: number,
		purpose: string,
	): Promise<{ items: GooglePlaceItem[]; saved: number }> {
		const ids = [...new Set(placeIds)];
		if (ids.length === 0) return { items: [], saved: 0 };
		const items = await this.apifyService.runActor<GooglePlaceItem>(
			GOOGLE_PLACES_ACTOR,
			{
				placeIds: ids,
				scrapePlaceDetailPage: true,
				// Google's "Order online" section (Wolt, Lieferando links): its own flag since 2026
				scrapeOrderOnline: true,
				language: 'en',
				maxReviews: 0,
				maxImages: 0,
				// Questions and answers carry personal data and are out of scope
				maxQuestions: 0,
			},
			{ maxCostUsd: budgetUsd, purpose },
		);
		return {
			items,
			saved: await this.saveAll(items, undefined, { source: VenueScrapeSourceEnum.DETAILS }),
		};
	}

	/**
	 * Saves the items; new places join `city`, and without one only known venues are updated.
	 * The cities saved in get their brands merged (`queueAutoMerge`).
	 */
	private async saveAll(
		items: GooglePlaceItem[],
		city: City | undefined,
		status: { source: VenueScrapeSourceEnum; openings?: boolean },
	): Promise<number> {
		const now = new Date();
		let saved = 0;
		const cityIds = new Set<string>();
		for (const item of items) {
			const venue = await this.venueService.saveGooglePlace(item, now, city, status);
			if (venue) {
				saved++;
				cityIds.add(venue.city.id);
			}
			// Flush in chunks: thousands of places in one unit of work get slow
			if (saved % 200 === 0) await this.em.flush();
		}
		await this.em.flush();
		await this.queueAutoMerge([...cityIds]);
		this.logger.log(`Saved ${saved} venues`);
		return saved;
	}

	/**
	 * Queues `BrandService.autoMerge` for each city (`BrandAutoMergeJob`): a chain's new
	 * branches join it, and branches of one site become a chain, as they come in. One waits per
	 * city.
	 */
	private async queueAutoMerge(cityIds: string[]): Promise<void> {
		for (const cityId of _.uniq(cityIds))
			await this.pgBossService.sendJob(
				BrandAutoMergeJob.jobName,
				new BrandAutoMergeJob({ cityId }),
				{
					singletonKey: cityId,
				},
			);
		// A saved place may have new categories or review tags: its city's food-topic links by job
		await this.venueFoodTopicService.queueCityRefresh(cityIds);
	}
}
