// The reading of reviews: hourly at :20, each unread written review its own workflow
export const READ_REVIEWS_CRON = '20 * * * *';

/** Reviews a city's run starts at most, the newest first; the rest wait for the next run */
export const READ_REVIEWS_PER_RUN = 1000;

/**
 * A review's workflow id is `read-reviews.review-<review id>`: whoever asks for it (the hourly run,
 * an operation that needs the city's reviews read) gets the one run, a finished one its result, and
 * a failed one is never started again by itself (an admin resumes it on `/admin/workflows`)
 */
export const readReviewWorkflowId = (reviewId: string) => `read-reviews.review-${reviewId}`;
