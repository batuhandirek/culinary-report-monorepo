import type { LeadSignalKey } from '../interfaces/lead-score.interface.js';

/** How much each signal weighs in the lead score; they add up to 1. Tune here. */
export const LEAD_SCORE_WEIGHTS: Record<LeadSignalKey, number> = {
	// Posts, views and creators from others, as a percentile among mentioned venues
	buzz: 0.35,
	// Own account posting, paid posts about it, a website
	spends: 0.2,
	// Something we can name from the reviews and posts
	problem: 0.3,
	// A phone, a website or an own account to write to
	reachable: 0.1,
	// Featured or listed by the press this window: they have a story the report can tell
	press: 0.05,
};

/** What each kind of press is worth to the press signal; the best one counts. */
export const LEAD_PRESS_VALUES = { feature: 1, listicle: 0.75, passing: 0.25 } as const;

/** Points added (out of 100) for a place that opened (a `VenueStatusChange`) within `LEAD_NEW_PLACE_MONTHS`, with few reviews. */
export const LEAD_NEW_PLACE_BONUS = 5;
export const LEAD_NEW_PLACE_MONTHS = 6;
export const LEAD_NEW_PLACE_MAX_REVIEWS = 300;

/** At or above this a venue is a prospect (`/admin/venues` "Prospects only"). */
export const LEAD_PROSPECT_SCORE = 60;

/**
 * What a chain or institution on the city's deny-list (`City.chainDenyList`, matched against the
 * normalized name) keeps of its score. Their buzz alone
 * would make them prospects. Fine dining with PR agencies is left to the admin's eye.
 */
export const LEAD_DENY_LIST_FACTOR = 0.5;
