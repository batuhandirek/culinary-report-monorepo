// A post's counts (views, likes, shares, comments, saves) are compared at one age: the first read
// at or after `POST_COUNTS_AGE_DAYS` is final (`SocialPost.countsFinalAt`), and the daily
// `REFRESH_POST_COUNTS` pays to read the posts no scrape read at that age (`PostCountsService`).

/** The age a post's counts are read at and then kept: most of a video's views come in its first week. */
export const POST_COUNTS_AGE_DAYS = 7;

/**
 * The oldest a post is still refreshed at: a week of slack for missed daily runs. A post past it
 * keeps its last read, never final, rather than being read at an age nothing else is compared at.
 */
export const POST_COUNTS_LATE_DAYS = 14;

/** Per post on Apify's Free plan, measured on 2026-10-25: clockworks $0.0037 a result plus its run start. */
export const TIKTOK_POST_COUNTS_USD = 0.0039;
/** Per post on Apify's Free plan: `apify/instagram-scraper` charges a result even for a deleted post. */
export const INSTAGRAM_POST_COUNTS_USD = 0.0027;

/** `clockworks/tiktok-scraper` refuses a run capped under this (a cap, not a spend). */
export const CLOCKWORKS_MIN_CAP_USD = 0.5;
