import { defineActor } from './actor.js';

/**
 * `scrapeunblocker/tripadvisor-reviews-scraper`: TripAdvisor reviews of restaurant pages.
 *
 * - **Price.** $0.40 per 1,000 reviews.
 * - **Pages, not search.** It takes the pages' URLs (found once by a Google search on
 *   tripadvisor.com). It pages newest first and stops before `since`, so only that stretch is
 *   paid for.
 * - **Place figures for free.** Every item repeats its place's all-time `placeRating` and
 *   `placeReviewsCount`.
 * - **Never stored.** `user`, the reviewer.
 */
export interface TripadvisorReviewsInput {
	/** Restaurant page URLs (`Restaurant_Review-…`) */
	places: string[];
	max_reviews_per_place?: number;
	/** `YYYY-MM-DD` */
	since?: string;
	language?: string;
	concurrency?: number;
}

export interface TripadvisorReviewItem {
	id?: string | number;
	rating?: number;
	title?: string;
	text?: string;
	publishedDate?: string;
	language?: string;
	helpfulVotes?: number;
	ownerResponse?: { text?: string; publishedDate?: string } | null;
	placeUrl?: string;
	placeLocationId?: string | number;
	/** The place's all-time figures, repeated on every item */
	placeRating?: number;
	placeReviewsCount?: number;
}

export const TRIPADVISOR_REVIEWS_ACTOR = defineActor<
	TripadvisorReviewsInput,
	TripadvisorReviewItem
>('scrapeunblocker/tripadvisor-reviews-scraper');
