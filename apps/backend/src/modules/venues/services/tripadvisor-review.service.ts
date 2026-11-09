import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable, Logger } from '@nestjs/common';

import type { ActorCall } from 'src/modules/apify/actors/actor.js';
import {
	GOOGLE_SEARCH_ACTOR,
	type GoogleSearchInput,
	type GoogleSearchPage,
} from 'src/modules/apify/actors/google-search.actor.js';
import {
	TRIPADVISOR_REVIEWS_ACTOR,
	type TripadvisorReviewItem,
	type TripadvisorReviewsInput,
} from 'src/modules/apify/actors/tripadvisor-reviews.actor.js';
import { ApifyService } from 'src/modules/apify/services/apify.service.js';
import type { City } from 'src/modules/cities/entities/city.entity.js';
import { cityNames } from 'src/modules/cities/util/city.js';

import { Review, ReviewPlatformEnum } from '../entities/review.entity.js';
import { Venue } from '../entities/venue.entity.js';
import {
	fromTripadvisorItem,
	tripadvisorLocationId,
	tripadvisorPageFromSearch,
	tripadvisorQuery,
} from '../util/tripadvisor.js';

// Newest first; a month of a busy tourist venue fits
const REVIEWS_PER_PLACE = 100;

/** The page search as the `scrape-reviews` workflow runs it: one Google search per venue never searched */
export interface TripadvisorPagesPlan {
	/** The query the result page echoes → the venue it was for */
	venueIds: Record<string, string>;
	call: ActorCall<GoogleSearchInput, GoogleSearchPage> | null;
}

/** The month's review fetch as the workflow runs it: every venue with a page */
export interface TripadvisorMonthPlan {
	/** TripAdvisor's location id → the venue whose page it is */
	venueIds: Record<string, string>;
	call: ActorCall<TripadvisorReviewsInput, TripadvisorReviewItem> | null;
}

/**
 * TripAdvisor reviews of the report venues: their page, found once by a web search, then each
 * month's reviews into the review table (`platform: tripadvisor`), analysed with the Google ones.
 * Both actor runs are children of the `scrape-reviews` run: `planPages` / `savePages` around the
 * search, `planMonth` / `saveMonth` around the fetch.
 */
@Injectable()
export class TripadvisorReviewService {
	private readonly logger = new Logger(TripadvisorReviewService.name);

	constructor(
		private readonly em: EntityManager,
		private readonly apifyService: ApifyService,
	) {}

	/**
	 * The page search of the venues never searched: a Google search on tripadvisor.com, one result
	 * page per venue, once. None when every venue was searched.
	 */
	planPages(
		city: City,
		venues: Pick<Venue, 'id' | 'name' | 'tripadvisorSearchedAt' | 'tripadvisorUrl'>[],
		budgetUsd: number,
	): TripadvisorPagesPlan {
		const todo = venues.filter(v => !v.tripadvisorSearchedAt && !v.tripadvisorUrl);
		const venueIds: Record<string, string> = {};
		for (const venue of todo) venueIds[tripadvisorQuery(venue.name, city.name)] ??= venue.id;
		if (!todo.length) return { venueIds, call: null };
		return {
			venueIds,
			call: {
				actor: GOOGLE_SEARCH_ACTOR,
				input: {
					queries: Object.keys(venueIds).join('\n'),
					maxPagesPerQuery: 1,
					countryCode: city.country.toLowerCase(),
					languageCode: 'en',
				},
				maxCostUsd: budgetUsd,
				purpose: `tripadvisor pages: ${todo.length} venues`,
			},
		};
	}

	/**
	 * The search's result pages read from the run's row: the first restaurant page whose title is
	 * the venue (`isSameVenue`) becomes its page; every searched venue is stamped, found or not.
	 * Flushes.
	 */
	async savePages(
		city: City,
		plan: TripadvisorPagesPlan,
		recordId: string | null,
		now: Date,
	): Promise<{ searched: number; found: number }> {
		const ids = Object.values(plan.venueIds);
		if (!ids.length) return { searched: 0, found: 0 };
		const venues = await this.em.find(Venue, { id: { $in: ids } });
		const byId = new Map(venues.map(v => [v.id, v]));
		const pages =
			recordId ? await this.apifyService.storedItems<GoogleSearchPage>(recordId) : [];
		let found = 0;
		for (const page of pages) {
			const term = page?.searchQuery?.term;
			const venue = term ? byId.get(plan.venueIds[term] ?? '') : undefined;
			if (!venue || venue.tripadvisorUrl) continue;
			const url = tripadvisorPageFromSearch(
				page.organicResults ?? [],
				venue.name,
				cityNames(city),
			);
			if (url) {
				venue.tripadvisorUrl = url;
				found++;
			}
		}
		for (const venue of venues) venue.tripadvisorSearchedAt = now;
		await this.em.flush();
		this.logger.log(`TripAdvisor pages: ${found} of ${venues.length} found`);
		return { searched: venues.length, found };
	}

	/**
	 * The month's review fetch of these venues (those with a page): the actor pages newest first
	 * and stops before `since`, so only the month is paid for. None without a page.
	 */
	async planMonth(
		month: string,
		venueIds: string[],
		budgetUsd: number,
	): Promise<TripadvisorMonthPlan> {
		const venues = (
			await this.em.find(Venue, { id: { $in: venueIds }, tripadvisorUrl: { $ne: null } })
		).filter(v => tripadvisorLocationId(v.tripadvisorUrl));
		const byLocation: Record<string, string> = {};
		for (const venue of venues)
			byLocation[tripadvisorLocationId(venue.tripadvisorUrl)!] = venue.id;
		if (!venues.length) return { venueIds: byLocation, call: null };
		return {
			venueIds: byLocation,
			call: {
				actor: TRIPADVISOR_REVIEWS_ACTOR,
				input: {
					places: venues.map(v => v.tripadvisorUrl!),
					max_reviews_per_place: REVIEWS_PER_PLACE,
					since: `${month}-01`,
					language: 'auto',
					concurrency: 2,
				},
				maxCostUsd: budgetUsd,
				purpose: `tripadvisor-reviews ${month}: ${venues.length} venues`,
			},
		};
	}

	/**
	 * The fetch's items read from the run's row and stored once per review (`reviewId`
	 * `ta_<id>`); every item repeats the place's all-time rating, which the venue keeps. Flushes;
	 * the month's reviews written.
	 */
	async saveMonth(
		month: string,
		plan: TripadvisorMonthPlan,
		recordId: string | null,
	): Promise<number> {
		if (!recordId) return 0;
		const items = await this.apifyService.storedItems<TripadvisorReviewItem>(recordId);
		const venues = await this.em.find(Venue, { id: { $in: Object.values(plan.venueIds) } });
		const byId = new Map(venues.map(v => [v.id, v]));
		let saved = 0;
		const rated = new Set<Venue>();
		for (const item of items) {
			const row = fromTripadvisorItem(item);
			const venue = row && byId.get(plan.venueIds[row.locationId] ?? '');
			if (!row || !venue) continue;
			if (!rated.has(venue) && (row.placeRating != null || row.placeReviewsCount != null)) {
				venue.tripadvisorRating = row.placeRating ?? venue.tripadvisorRating;
				venue.tripadvisorReviewsCount =
					row.placeReviewsCount ?? venue.tripadvisorReviewsCount;
				rated.add(venue);
			}
			if (!row.publishedAt.toISOString().startsWith(month)) continue;
			const review =
				(await this.em.findOne(Review, { reviewId: row.reviewId })) ??
				this.em.create(Review, {
					reviewId: row.reviewId,
					platform: ReviewPlatformEnum.TRIPADVISOR,
					venue,
					publishedAt: row.publishedAt,
				});
			review.stars = row.stars;
			review.text = row.text;
			review.language = row.language;
			review.likes = row.likes;
			review.ownerResponse = row.ownerResponse;
			review.ownerResponseAt = row.ownerResponseAt;
			saved++;
		}
		await this.em.flush();
		this.logger.log(
			`Saved ${saved} TripAdvisor reviews from ${month} of ${venues.length} venues`,
		);
		return saved;
	}
}
