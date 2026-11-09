import { defineDurableQueue } from 'src/modules/durable-workflows/queues/define-durable-queue.js';

/** Google Trends for the city's topics and won brands, one city at a time */
export const SEARCH_INTEREST_QUEUE = defineDurableQueue('search-interest', {
	workerConcurrency: 1,
});
