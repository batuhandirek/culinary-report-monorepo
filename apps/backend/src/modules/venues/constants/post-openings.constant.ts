/**
 * When a post saying a place just opened (`Mention.isNewOpening`) is enough to list it as opened
 * (`postOpeningsSql`). One post is not: own-account posts never count, and one outside author
 * needs a second signal from these.
 */

/** Distinct people (creators, else accounts) whose flagged posts list a place on their own. */
export const OPENING_MIN_AUTHORS = 2;

/**
 * The place's first stored Google review within this many days of the first flagged post agrees.
 * Only a review history we hold nearly whole (`OPENING_REVIEW_HISTORY_SHARE` of its Google
 * count) has a first review that is the place's own first.
 */
export const OPENING_FIRST_REVIEW_DAYS = 42;
export const OPENING_REVIEW_HISTORY_SHARE = 0.8;

/**
 * Review counts that start low and climb fast agree: a snapshot from
 * `OPENING_FIRST_REVIEW_DAYS` before the first flagged post on, under
 * `OPENING_GROWTH_MAX_START_REVIEWS`, and a later one `OPENING_GROWTH_MIN_DAYS`+ days on that
 * gained `OPENING_GROWTH_PER_30_DAYS`+ reviews per 30 days.
 */
export const OPENING_GROWTH_MAX_START_REVIEWS = 100;
export const OPENING_GROWTH_MIN_DAYS = 14;
export const OPENING_GROWTH_PER_30_DAYS = 15;

/** A city scrape that saw the place open within this many days of the first flagged post agrees. */
export const OPENING_SCRAPE_DAYS = 92;
