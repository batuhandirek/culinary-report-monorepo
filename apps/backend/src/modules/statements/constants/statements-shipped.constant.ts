/**
 * When statements replaced the feedback points on dev (`Migration20261030140000_statements`): a
 * review or post analysed before it was read by the old agents, and the re-read backlogs
 * (`reread-reviews`, `reread-posts`) take it again; one analysed after was read by agents A and B.
 */
export const STATEMENTS_SHIPPED_AT = new Date('2026-10-30T11:00:00Z');
// The dev run of the re-read raised `LLM_BACKLOG_DAILY_TOKENS` to 10M in `env/server/.env.local` (2026-10-30); put it back after.

/**
 * The pipeline posts are read by now (2026-11-02): one post a question (the gate, agent A, each
 * claim's parts), a long post in parts, places named, the aspects of 2026-11-02 (Dietary, On the
 * house, Occasion, Consistency, Pressure & rushing; clearer definitions). A post analysed before it
 * is read again by `reread-posts`, a little each night (the user's yes, 2026-11-02).
 */
export const POSTS_GATED_AT = new Date('2026-11-02T09:00:00Z');

/**
 * The pipeline reviews are read by now (2026-11-02): one review a question, each claim's parts one
 * claim a question, the aspects of 2026-11-02. A review analysed before it is read again by
 * `reread-reviews` (the user's yes, 2026-11-02).
 */
export const REVIEWS_QUOTED_AT = new Date('2026-11-02T09:00:00Z');
