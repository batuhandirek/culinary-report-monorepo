/**
 * How many months before the report month a venue's first month scrape starts (a venue with no
 * Google review stored from before the month): the report's previous month and the
 * correlations' six-month window need them. Paid once per venue.
 */
export const REVIEW_BACKFILL_MONTHS = 6;

/**
 * The backfill's share of the month scrape's Google budget at most, so the month's own reviews
 * of the venues already tracked always fit. All of it when no venue is tracked yet.
 */
export const REVIEW_BACKFILL_BUDGET_SHARE = 0.4;

/** The share of the month scrape's budget for TripAdvisor: reviews cost $0.40 per 1k there */
export const TRIPADVISOR_BUDGET_SHARE = 0.1;
