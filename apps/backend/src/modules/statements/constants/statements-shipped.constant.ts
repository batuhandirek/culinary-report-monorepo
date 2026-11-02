/**
 * When statements replaced the feedback points on dev (`Migration20261030140000_statements`): a
 * review or post analysed before it was read by the old agents, and the re-read backlogs
 * (`reread-reviews`, `reread-posts`) take it again; one analysed after was read by agents A and B.
 */
export const STATEMENTS_SHIPPED_AT = new Date('2026-10-30T11:00:00Z');
// The dev run of the re-read raised `LLM_BACKLOG_DAILY_TOKENS` to 10M in `env/server/.env.local` (2026-10-30); put it back after.

/**
 * When posts got the gate (`PostGateAgent`: not digested with a reason), the food-places rule, a
 * venue's own posts in agent A, and claim model v2 (each claim's quote; agent B's kind): a post
 * analysed before it is read again by `reread-posts` (gate first). Reviews keep
 * `STATEMENTS_SHIPPED_AT` until their own re-read for quotes is approved.
 */
export const POSTS_GATED_AT = new Date('2026-10-31T18:25:00Z');

/**
 * When reviews got claim model v2 (each claim's quote in the review's own words, from its original
 * text; agent B's kind): a review analysed before it is read again by `reread-reviews` (the user's
 * yes, 2026-10-31).
 */
export const REVIEWS_QUOTED_AT = new Date('2026-10-31T18:25:00Z');
