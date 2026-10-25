// Which venues get a Google rating snapshot twice a week (`SNAPSHOT_RATINGS`): every open venue
// of the city with at least this many reviews, and every one a post named in the last
// `RATING_SNAPSHOT_TALKED_DAYS` (a post naming a brand but no branch counts for its branches in
// the city). A rolling window, so the first days of a month don't empty the set.
export const RATING_SNAPSHOT_MIN_REVIEWS = 500;
export const RATING_SNAPSHOT_TALKED_DAYS = 30;

// A snapshot costs one Google review (`compass/Google-Maps-Reviews-Scraper`, Free plan): the
// newest review of each place repeats its all-time rating and review count. A place page through
// the Places actor costs $0.006 (Berlin, 2026-10-25)
export const RATING_SNAPSHOT_USD = 0.0006;

// The share of the budget a run plans on, so the cap never cuts the last places off
export const RATING_SNAPSHOT_BUDGET_HEADROOM = 0.8;
