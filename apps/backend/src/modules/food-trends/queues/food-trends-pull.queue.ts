import { defineDurableQueue } from 'src/modules/durable-workflows/queues/define-durable-queue.js';

/** The anchored Google Trends pulls: one quarter at a time (each is ~30 actor runs the `apify` queue paces) */
export const FOOD_TRENDS_PULL_QUEUE = defineDurableQueue('food-trends-pull', {
	workerConcurrency: 1,
});
