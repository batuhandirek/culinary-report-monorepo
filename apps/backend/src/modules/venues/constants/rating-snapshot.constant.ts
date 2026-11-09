import { GOOGLE_REVIEW_USD } from 'src/modules/apify/actors/google-maps-reviews.actor.js';

// Every open venue of the city gets a Google rating snapshot weekly (`SNAPSHOT_RATINGS`); a
// budget too small for all takes first the venues a post named in the last
// `RATING_SNAPSHOT_TALKED_DAYS` (a post naming a brand but no branch counts for its branches in
// the city), then the most reviewed.
export const RATING_SNAPSHOT_TALKED_DAYS = 30;

// A snapshot costs one Google review (`compass/Google-Maps-Reviews-Scraper`, Free plan): the
// newest review of each place repeats its all-time rating and review count. A place page through
// the Places actor costs $0.006 (Berlin, 2026-10-25)
export const RATING_SNAPSHOT_USD = GOOGLE_REVIEW_USD;

// The share of the budget a run plans on, so the cap never cuts the last places off
export const RATING_SNAPSHOT_BUDGET_HEADROOM = 0.8;
