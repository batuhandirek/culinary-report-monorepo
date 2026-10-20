import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable, Logger } from '@nestjs/common';

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

// ~$1.80–4.50 per 1k result pages: one page per venue, once
const GOOGLE_SEARCH_ACTOR = 'apify/google-search-scraper';
// $0.40 per 1k reviews; takes page URLs, no search
const TRIPADVISOR_REVIEWS_ACTOR = 'scrapeunblocker/tripadvisor-reviews-scraper';

// Newest first; a month of a busy tourist venue fits
const REVIEWS_PER_PLACE = 100;

/**
 * TripAdvisor reviews of the report venues: their page, found once by a web search, then each
 * month's reviews into the review table (`platform: tripadvisor`), analysed with the Google ones.
 */
@Injectable()
export class TripadvisorReviewService {
	private readonly logger = new Logger(TripadvisorReviewService.name);

	constructor(
		private readonly em: EntityManager,
		private readonly apifyService: ApifyService,
	) {}

	/**
	 * Looks for the TripAdvisor page of the venues never searched: a Google search on
	 * tripadvisor.com, the first restaurant page whose title is the venue (`isSameVenue`). The
	 * search runs once per venue, found or not. Flushes.
	 */
	async findPages(city: City, venues: Venue[], budgetUsd: number, now = new Date()): Promise<{ searched: number; found: number }> {
		const todo = venues.filter(v => !v.tripadvisorSearchedAt && !v.tripadvisorUrl);
		if (!todo.length) return { searched: 0, found: 0 };
		const byQuery = new Map(todo.map(v => [tripadvisorQuery(v.name, city.name), v]));
		const pages = await this.apifyService.runActor<any>(
			GOOGLE_SEARCH_ACTOR,
			{
				queries: [...byQuery.keys()].join('\n'),
				maxPagesPerQuery: 1,
				countryCode: city.country.toLowerCase(),
				languageCode: 'en',
			},
			{ maxCostUsd: budgetUsd, purpose: `tripadvisor pages: ${todo.length} venues` },
		);
		let found = 0;
		for (const page of pages) {
			const venue = byQuery.get(page?.searchQuery?.term);
			if (!venue || venue.tripadvisorUrl) continue;
			const url = tripadvisorPageFromSearch(page.organicResults ?? [], venue.name, cityNames(city));
			if (url) {
				venue.tripadvisorUrl = url;
				found++;
			}
		}
		for (const venue of todo) venue.tripadvisorSearchedAt = now;
		await this.em.flush();
		this.logger.log(`TripAdvisor pages: ${found} of ${todo.length} found`);
		return { searched: todo.length, found };
	}

	/**
	 * The month's TripAdvisor reviews of these venues (those with a page), stored once per
	 * review; every item repeats the place's all-time rating, which the venue keeps. The actor
	 * pages newest first and stops before `since`, so only the month is paid for. Flushes.
	 */
	async scrapeMonth(month: string, venueIds: string[], budgetUsd: number): Promise<number> {
		const venues = (await this.em.find(Venue, { id: { $in: venueIds }, tripadvisorUrl: { $ne: null } })).filter(v =>
			tripadvisorLocationId(v.tripadvisorUrl),
		);
		if (!venues.length) return 0;
		const byLocation = new Map(venues.map(v => [tripadvisorLocationId(v.tripadvisorUrl)!, v]));

		const items = await this.apifyService.runActor<any>(
			TRIPADVISOR_REVIEWS_ACTOR,
			{
				places: venues.map(v => v.tripadvisorUrl),
				max_reviews_per_place: REVIEWS_PER_PLACE,
				since: `${month}-01`,
				language: 'auto',
				concurrency: 2,
			},
			{ maxCostUsd: budgetUsd, purpose: `tripadvisor-reviews ${month}: ${venues.length} venues` },
		);

		let saved = 0;
		const rated = new Set<Venue>();
		for (const item of items) {
			const row = fromTripadvisorItem(item);
			const venue = row && byLocation.get(row.locationId);
			if (!row || !venue) continue;
			if (!rated.has(venue) && (row.placeRating != null || row.placeReviewsCount != null)) {
				venue.tripadvisorRating = row.placeRating ?? venue.tripadvisorRating;
				venue.tripadvisorReviewsCount = row.placeReviewsCount ?? venue.tripadvisorReviewsCount;
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
		this.logger.log(`Saved ${saved} TripAdvisor reviews from ${month} of ${venues.length} venues`);
		return saved;
	}
}
