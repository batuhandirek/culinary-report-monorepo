import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable, Logger } from '@nestjs/common';

import _ from 'lodash';

import { ApifyService } from 'src/modules/apify/services/apify.service.js';
import type { City } from 'src/modules/cities/entities/city.entity.js';
import { PgBossService } from 'src/modules/pgboss/pgboss.service.js';

import { VenueScrapeSourceEnum } from '../constants/venue-status.constant.js';
import type { Venue } from '../entities/venue.entity.js';
import { VenueLookup } from '../entities/venue-lookup.entity.js';
import { BrandAutoMergeJob } from '../jobs/brand-auto-merge.job.js';
import { isBrandName } from '../util/brands.js';
import { cityStopwords, isFoodVenue, normalizeVenueName } from '../util/venue-names.js';

import { GooglePlaceItem, VenueService } from './venue.service.js';

const GOOGLE_PLACES_ACTOR = 'compass/crawler-google-places';

// Google results kept per looked-up name; the matcher picks the right one
const LOOKUP_RESULTS_PER_NAME = 3;

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
	 * Names already searched there are skipped, so a name is never paid for twice.
	 */
	async lookupNames(
		city: City,
		names: string[],
		budgetUsd: number,
	): Promise<{ lookedUp: number; saved: number }> {
		const words = cityStopwords(city.nameStopwords);
		const looked = new Set(
			(await this.em.find(VenueLookup, { city }, { fields: ['query'] })).map(l => l.query),
		);
		const queries = new Map<string, string>();
		for (const name of names) {
			const key = normalizeVenueName(name, words);
			if (key && !looked.has(key) && !queries.has(key)) queries.set(key, name);
		}
		if (queries.size === 0) return { lookedUp: 0, saved: 0 };

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
		for (const key of queries.keys()) {
			this.em.create(VenueLookup, { city, query: key, results: found.get(key) ?? 0 });
		}
		const saved = await this.saveAll(items, city, { source: VenueScrapeSourceEnum.LOOKUP });
		await this.venueService.fillDistricts(city);
		return { lookedUp: queries.size, saved };
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
	}
}
