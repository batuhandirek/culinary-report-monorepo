import _ from 'lodash';

import type { GoogleMapsReviewsInput } from 'src/modules/apify/actors/google-maps-reviews.actor.js';

/**
 * What a caller asks the reviews actor for, in one of two modes. A caller never writes an actor
 * field: the atom builds the input here, so the shared flags are written once.
 */
export type ReviewsFetch =
	/** Every review of these places published from `since` (`YYYY-MM-DD`) on, newest first */
	| { mode: 'since'; placeIds: string[]; since: string }
	/**
	 * Each place's one newest review, to tell whether anything came since its day (a place with
	 * nothing new since a start date returns no item at all) and read its rating
	 */
	| { mode: 'newest'; places: { placeId: string; since: string }[] };

/** One fetch as a plan hands it to the atom: what to fetch, the run's cap and its purpose */
export interface ReviewsCall {
	fetch: ReviewsFetch;
	/** The run's cap, floored by the atom at the actor's lowest */
	maxCostUsd: number;
	/** The `ApifyRun`'s purpose: "google-reviews 2026-09 from 2026-09-01: 12 venues" */
	purpose: string;
}

// Newest first, English, no reviewer (personal data)
const NEWEST_FIRST = { reviewsSort: 'newest', language: 'en', personalData: false } as const;

/** The places a fetch asks about, in the order given (each once) */
export const placeIdsOf = (fetch: ReviewsFetch): string[] =>
	_.uniq(fetch.mode === 'since' ? fetch.placeIds : fetch.places.map(p => p.placeId));

/** The actor's input for a fetch */
export const reviewsInput = (fetch: ReviewsFetch): GoogleMapsReviewsInput =>
	fetch.mode === 'since' ?
		{ placeIds: placeIdsOf(fetch), reviewsStartDate: fetch.since, ...NEWEST_FIRST }
	:	{ placeIds: placeIdsOf(fetch), maxReviews: 1, ...NEWEST_FIRST };
