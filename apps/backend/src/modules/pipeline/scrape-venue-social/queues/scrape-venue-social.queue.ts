import { defineDurableQueue } from 'src/modules/durable-workflows/queues/define-durable-queue.js';

/** The searches by brand name, one city at a time */
export const SCRAPE_VENUE_SOCIAL_QUEUE = defineDurableQueue('scrape-venue-social', {
	workerConcurrency: 1,
});
