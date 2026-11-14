import { defineActor } from './actor.js';

/**
 * `compass/Google-Maps-Reviews-Scraper`: Google reviews of places by place id, newest first.
 *
 * - **Price.** $0.0006 a review on the Free plan: the unit a run's cap counts in. A run that spent
 *   90 % of its cap may have been cut, its last place's older reviews missing.
 * - **Start date only.** `reviewsStartDate` takes a day; everything since comes back. A place with
 *   no review since then returns **no item at all**, so silence isn't "no reviews": ask it for
 *   its one newest review (`maxReviews: 1`) to tell.
 * - **Place figures for free.** Every item repeats its place's all-time `totalScore` and
 *   `reviewsCount`: the day's rating snapshot. It also repeats `permanentlyClosed` and
 *   `temporarilyClosed`, so the weekly fetch notices closures (checked 2026-11-14 on two closed,
 *   two temporarily closed and one open Berlin place: all five right).
 * - **Personal data.** `reviewUrl` and the reviewer are personal data: `personalData: false`.
 * - **Cap.** A cap under ~$0.05 risks a refused start for a small group.
 */
export interface GoogleMapsReviewsInput {
	placeIds: string[];
	/** `YYYY-MM-DD`: reviews published since (and paid for) */
	reviewsStartDate?: string;
	/** Reviews a place keeps at most */
	maxReviews?: number;
	reviewsSort?: 'newest' | 'mostRelevant' | 'highestRanking' | 'lowestRanking';
	language?: string;
	personalData?: boolean;
}

export interface GoogleMapsReviewItem {
	reviewId?: string;
	placeId?: string;
	publishedAtDate?: string;
	stars?: number;
	text?: string;
	/** Google's English translation, when the review is in another language */
	textTranslated?: string;
	originalLanguage?: string;
	likesCount?: number;
	responseFromOwnerText?: string;
	responseFromOwnerDate?: string;
	/** The place's all-time figures, repeated on every item */
	totalScore?: number;
	reviewsCount?: number;
	/** The place's state, repeated on every item */
	permanentlyClosed?: boolean | null;
	temporarilyClosed?: boolean | null;
}

export const GOOGLE_MAPS_REVIEWS_ACTOR = defineActor<GoogleMapsReviewsInput, GoogleMapsReviewItem>(
	'compass/Google-Maps-Reviews-Scraper',
);

/** What the actor bills a review on the Free plan: the unit every cap and plan counts in */
export const GOOGLE_REVIEW_USD = 0.0006;

/** The lowest cap a run gets: under it Apify may refuse a small group's start */
export const GOOGLE_REVIEWS_MIN_CAP_USD = 0.05;
