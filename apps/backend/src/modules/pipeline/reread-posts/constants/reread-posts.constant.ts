import { POSTS_GATED_AT } from 'src/modules/statements/constants/statements-shipped.constant.js';

// The re-read of posts read before the gate and the food-places rule (`POSTS_GATED_AT`): nightly at
// 22:00 UTC, as the backlogs, so the day's reading has had the allowance first
export const REREAD_POSTS_CRON = '0 22 * * *';

/** Posts a night's run starts at most (~3 agent calls each), the most viewed first */
export const REREAD_POSTS_PER_NIGHT = 200;

/**
 * A post's re-read has one id per cutoff, `reread-posts.post-<cutoff day>-<post id>`: a post in
 * flight is never started twice, and moving `POSTS_GATED_AT` re-reads every post again
 */
export const rereadPostRunId = (postId: string) =>
	`reread-posts.post-${POSTS_GATED_AT.toISOString().slice(0, 10)}-${postId}`;
