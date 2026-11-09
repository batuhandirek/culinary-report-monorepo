// The reading of comments: hourly at :30, each post's unread comments their own workflow
export const READ_COMMENTS_CRON = '30 * * * *';

/** Posts a city's run starts at most */
export const READ_COMMENTS_POSTS_PER_RUN = 500;

/**
 * A post's comments' workflow id is `read-comments.post-<post id>`: a post's comments are scraped
 * once (`commentsScrapedAt`), so one run reads them all; a failed one waits for an admin's resume
 */
export const readCommentsWorkflowId = (postId: string) => `read-comments.post-${postId}`;
