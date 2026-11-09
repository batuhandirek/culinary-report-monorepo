import { defineDurableQueue } from 'src/modules/durable-workflows/queues/define-durable-queue.js';

/** Every open venue's new reviews and rating, one city at a time */
export const RATING_SNAPSHOT_QUEUE = defineDurableQueue('rating-snapshot', {
	workerConcurrency: 1,
});
