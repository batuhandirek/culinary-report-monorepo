import { defineDurableQueue } from 'src/modules/durable-workflows/queues/define-durable-queue.js';

/** A city-wide review backfill, one at a time: each is tens of dollars of Apify */
export const BACKFILL_REVIEWS_QUEUE = defineDurableQueue('backfill-reviews', {
	workerConcurrency: 1,
});
