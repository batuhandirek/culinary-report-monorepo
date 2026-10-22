// Pure: where a venue's all-time Google rating stands among comparable venues (its district's,
// its kind of food's). Shared by the report's rating benchmark and the lead score.

import { isFoodVenue } from './venue-names.js';

/** A venue counts as a peer from this many Google reviews: one-review places don't set the median. */
export const RATING_BENCHMARK_MIN_REVIEWS = 20;
/** A standing needs this many peers, the venue itself left out. */
export const RATING_BENCHMARK_MIN_VENUES = 5;

export interface RatingPeer {
	id: string;
	category?: string | null;
	district?: string | null;
	rating?: number | null;
	reviewsCount?: number | null;
}

/** Whether a venue counts among the peers: a food venue (open: the caller's query) with a rating and 20+ reviews. */
export const isRatingPeer = (v: RatingPeer): boolean =>
	isFoodVenue(v.category) && v.rating != null && (v.reviewsCount ?? 0) >= RATING_BENCHMARK_MIN_REVIEWS;

const median = (values: number[]): number => {
	const sorted = [...values].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

/**
 * `rating` against the peers' ratings (the venue already left out): their median, the share of
 * them it is ahead of (ties half, 0–100 rounded) and how many they are. Undefined below
 * `RATING_BENCHMARK_MIN_VENUES` peers.
 */
export const ratingStanding = (
	rating: number,
	peers: number[],
): { median: number; percentile: number; venues: number } | undefined => {
	if (peers.length < RATING_BENCHMARK_MIN_VENUES) return undefined;
	const below = peers.filter(v => v < rating).length;
	const ties = peers.filter(v => v === rating).length;
	return {
		median: Math.round(median(peers) * 100) / 100,
		percentile: Math.round(((below + ties / 2) / peers.length) * 100),
		venues: peers.length,
	};
};

/** The venue's standing among the peers of its district (same city is the caller's), or undefined. */
export const districtRatingStanding = (venue: RatingPeer, peers: RatingPeer[]) => {
	if (venue.rating == null || !venue.district) return undefined;
	return ratingStanding(
		venue.rating,
		peers.filter(p => p.id !== venue.id && p.district === venue.district && isRatingPeer(p)).map(p => p.rating!),
	);
};
