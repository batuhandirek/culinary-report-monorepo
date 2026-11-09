import { defineDurableQueue } from 'src/modules/durable-workflows/queues/define-durable-queue.js';

/**
 * One workflow per post (`ReadPostsWorkflow.readPost`). A post's agent calls are children on the
 * `llm` queue, which holds the providers' limits, so this queue only bounds how many posts are
 * open at once.
 */
export const READ_POSTS_QUEUE = defineDurableQueue('read-posts', { workerConcurrency: 8 });

/**
 * A city's reading of its unread posts (`ReadPostsWorkflow.readCity`): one in flight per city
 * (`dedupe` the city id), so the hourly run and a dependent operation share it
 */
export const READ_POSTS_CITY_QUEUE = defineDurableQueue('read-posts-city', {
	workerConcurrency: 4,
});
