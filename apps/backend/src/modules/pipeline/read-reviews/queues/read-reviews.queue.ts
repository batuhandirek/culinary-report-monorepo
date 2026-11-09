import { defineDurableQueue } from 'src/modules/durable-workflows/queues/define-durable-queue.js';

/**
 * One workflow per review (`ReadReviewsWorkflow.readReview`). Its agent call is a child on the
 * `llm` queue, which holds the provider's limits, so this queue only bounds how many are open.
 */
export const READ_REVIEWS_QUEUE = defineDurableQueue('read-reviews', { workerConcurrency: 8 });

/** A city's run (`ReadReviewsWorkflow.readCity`): one waiting or running per city (`dedupe` = the city id) */
export const READ_REVIEWS_CITY_QUEUE = defineDurableQueue('read-reviews-city', {
	workerConcurrency: 2,
});
