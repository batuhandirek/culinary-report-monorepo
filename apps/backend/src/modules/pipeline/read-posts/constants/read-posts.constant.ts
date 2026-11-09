// The reading of posts: hourly at :10, each cron city's unread posts, each post its own workflow
export const READ_POSTS_CRON = '10 * * * *';

/** Posts a city's run starts at most, the most viewed first; the rest wait for the next run */
export const READ_POSTS_PER_RUN = 1000;

/**
 * A post's run has one id, `read-posts.post-<post id>`, so a post in flight is never started twice
 * (an hourly run and a dependent operation's both await the same run), and one that failed (its
 * own error, never a provider being out: that waits) stays failed until an admin resumes it on
 * `/admin/workflows`, never paid again by itself
 */
export const readPostRunId = (postId: string) => `read-posts.post-${postId}`;
