import { defineDurableQueue } from 'src/modules/durable-workflows/queues/define-durable-queue.js';

/** The report venues' Google Maps details, one city at a time */
export const REFRESH_VENUE_DETAILS_QUEUE = defineDurableQueue('refresh-venue-details', {
	workerConcurrency: 1,
});

/**
 * One venue's details refreshed by hand, apart from the month's run (which holds its queue while it
 * waits for the competitors), so an admin's refresh never waits behind it
 */
export const VENUE_DETAILS_REFRESH_QUEUE = defineDurableQueue('venue-details-refresh', {
	workerConcurrency: 2,
});
