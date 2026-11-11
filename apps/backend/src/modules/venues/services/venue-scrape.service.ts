import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable, Logger } from '@nestjs/common';

import _ from 'lodash';

import type { GooglePlaceItem } from 'src/modules/apify/actors/google-places.actor.js';
import { ApifyService } from 'src/modules/apify/services/apify.service.js';
import type { City } from 'src/modules/cities/entities/city.entity.js';
import { cityNames } from 'src/modules/cities/util/city.js';
import { PgBossService } from 'src/modules/pgboss/pgboss.service.js';
import { VenueTopicService } from 'src/modules/topics/services/venue-topic.service.js';

import { VenueScrapeSourceEnum } from '../constants/venue-status.constant.js';
import { Venue } from '../entities/venue.entity.js';
import { VenueLookup } from '../entities/venue-lookup.entity.js';
import { BrandAutoMergeJob } from '../jobs/brand-auto-merge.job.js';
import { cityStopwords, isFoodVenue, isInCity, normalizeVenueName } from '../util/venue-names.js';

import { VenueService } from './venue.service.js';

/** Google results kept per looked-up name; the matcher picks the right one */
export const LOOKUP_RESULTS_PER_NAME = 3;

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

/**
 * Which new places a save may add: `none` (the detail pages of known places), `food-in-city` (a
 * search: known venues updated, a new place added when Google puts it in the city and it serves
 * food or drink), `all` (the city's own list, a brand search: every place).
 */
export type NewPlacesRule = 'none' | 'food-in-city' | 'all';

export interface SavePlacesOptions {
	/** The city a new place joins (needed for any rule but `none`); a known venue keeps its own */
	city?: City;
	source: VenueScrapeSourceEnum;
	newPlaces: NewPlacesRule;
	/** A new place is an opening: only the city's own list, after its first (`VenueService.saveGooglePlace`) */
	openings?: boolean;
}

export interface SavePlacesResult {
	saved: number;
	/** Place id → venue id of the places saved */
	venueIds: Record<string, string>;
}

/**
 * The venue side of a Google Maps places run (the `places` atom): the one save path for what the
 * actor returns, and the pieces a lookup run plans and records. It runs no actor itself.
 */
@Injectable()
export class VenueScrapeService {
	private readonly logger = new Logger(VenueScrapeService.name);

	constructor(
		private readonly em: EntityManager,
		private readonly apifyService: ApifyService,
		private readonly venueService: VenueService,
		private readonly pgBossService: PgBossService,
		private readonly venueTopicService: VenueTopicService,
	) {}

	/**
	 * Saves a run's places: known venues are updated from their item whatever the rule, and a new
	 * place joins `city` by `newPlaces` (never one without a city). Each venue's rating snapshot of
	 * the day is written with it. The known venues are loaded in one query; flushes in chunks;
	 * fills the city's districts and queues the cities' brand merges and topic refresh once.
	 */
	async savePlaces(
		items: GooglePlaceItem[],
		opts: SavePlacesOptions,
		now = new Date(),
	): Promise<SavePlacesResult> {
		const ids = _.uniq(items.map(i => i.placeId).filter((id): id is string => !!id));
		const known = new Map<string, Venue>();
		for (const chunk of _.chunk(ids, 2000))
			for (const venue of await this.em.find(Venue, { placeId: { $in: chunk } }))
				known.set(venue.placeId, venue);
		const names = opts.city ? cityNames(opts.city) : [];
		const kept = items.filter(item => {
			if (!item.placeId) return false;
			if (known.has(item.placeId)) return true;
			if (!opts.city || opts.newPlaces === 'none') return false;
			return (
				opts.newPlaces === 'all' ||
				(isInCity(item.city, names) && isFoodVenue(item.categoryName))
			);
		});

		const status = { source: opts.source, openings: opts.openings };
		const venueIds: Record<string, string> = {};
		const cityIds = new Set<string>();
		let saved = 0;
		for (const item of kept) {
			const venue = await this.venueService.saveGooglePlace(
				item,
				now,
				opts.city,
				status,
				known.get(item.placeId!) ?? null,
			);
			if (!venue) continue;
			// A place two searches of the run found is updated by each, a venue once
			known.set(item.placeId!, venue);
			saved++;
			cityIds.add(venue.city.id);
			// Flush in chunks: thousands of places in one unit of work get slow
			if (saved % 200 === 0) await this.em.flush();
		}
		await this.em.flush();
		for (const item of kept) {
			const venue = known.get(item.placeId!);
			if (venue?.id) venueIds[item.placeId!] = venue.id;
		}
		if (opts.city) await this.venueService.fillDistricts(opts.city);
		await this.queueAutoMerge([...cityIds]);
		this.logger.log(`Saved ${saved} of ${items.length} places (${opts.newPlaces})`);
		return { saved, venueIds };
	}

	/**
	 * The names to search on Google Maps: those not looked up within `LOOKUP_RETRY_MONTHS` (a name
	 * searched lately is not paid for twice; one still unmatched after that is searched again,
	 * since a place named before Google listed it is there by then), most important first, and
	 * `maxNames` at most once the recent ones are dropped, so they never take the run's room. The
	 * plan step of `lookup-venues`; `recordLookups` the step after its run.
	 */
	async planLookups(
		city: City,
		names: string[],
		now = new Date(),
		maxNames = LOOKUP_MAX_NAMES,
	): Promise<{ queries: string[] }> {
		const words = cityStopwords(city.nameStopwords);
		const lookups = new Map((await this.em.find(VenueLookup, { city })).map(l => [l.query, l]));
		const queries = new Map<string, string>();
		for (const name of names) {
			if (queries.size >= maxNames) break;
			const key = normalizeVenueName(name, words);
			if (!key || queries.has(key)) continue;
			const earlier = lookups.get(key);
			if (earlier && !lookupStale(earlier.lookedUpAt, now)) continue;
			queries.set(key, name);
		}
		return { queries: [...queries.values()] };
	}

	/**
	 * The searched names stamped (`VenueLookup`: a row per normalized name with how many places its
	 * search returned, a retried name's row updated, never doubled). Flushes.
	 */
	async recordLookups(
		city: City,
		queries: string[],
		byQuery: Record<string, string[]>,
		now = new Date(),
	): Promise<{ lookedUp: number; retried: number }> {
		const words = cityStopwords(city.nameStopwords);
		const lookups = new Map((await this.em.find(VenueLookup, { city })).map(l => [l.query, l]));
		let retried = 0;
		for (const name of queries) {
			const key = normalizeVenueName(name, words);
			const results = byQuery[name]?.length ?? 0;
			const earlier = lookups.get(key);
			if (earlier) {
				earlier.results = results;
				earlier.lookedUpAt = now;
				retried++;
			} else {
				lookups.set(
					key,
					this.em.create(VenueLookup, { city, query: key, results, lookedUpAt: now }),
				);
			}
		}
		await this.em.flush();
		return { lookedUp: queries.length, retried };
	}

	/** The city's own list taken: `venuesScrapedAt` stamped (the next list records openings; a quarter later it is due again). Flushes. */
	async markCityScraped(city: City, now = new Date()): Promise<void> {
		city.venuesScrapedAt = now;
		await this.em.flush();
	}

	/** One venue's place id, name and city: what a by-hand refresh of its detail page needs (404 for none) */
	async detailsTarget(venueId: string): Promise<{ placeId: string; name: string; cityId: string }> {
		const venue = await this.em.findOneOrFail(Venue, venueId, { fields: ['placeId', 'name', 'city'] });
		return { placeId: venue.placeId, name: venue.name, cityId: venue.city.id };
	}

	/** What a detail-page run brought: how many places came with popular times (Google often shows none) */
	async detailsSummary(recordId: string): Promise<{ withPopularTimes: number }> {
		const items = await this.apifyService.storedItems<GooglePlaceItem>(recordId);
		return {
			withPopularTimes: items.filter(
				item => Object.keys(item.popularTimesHistogram ?? {}).length > 0,
			).length,
		};
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
		// A saved place may have new categories or review tags: its city's topic links by job
		await this.venueTopicService.queueCityRefresh(cityIds);
	}
}
