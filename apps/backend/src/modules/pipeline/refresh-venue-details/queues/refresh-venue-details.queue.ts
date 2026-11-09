import { defineDurableQueue } from 'src/modules/durable-workflows/queues/define-durable-queue.js';

/** The report venues' Google Maps details, one city at a time */
export const REFRESH_VENUE_DETAILS_QUEUE = defineDurableQueue('refresh-venue-details', {
	workerConcurrency: 1,
});
