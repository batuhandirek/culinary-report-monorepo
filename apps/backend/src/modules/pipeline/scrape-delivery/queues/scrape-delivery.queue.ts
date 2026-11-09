import { defineDurableQueue } from 'src/modules/durable-workflows/queues/define-durable-queue.js';

/** The report venues' delivery listings and menus, one city at a time */
export const SCRAPE_DELIVERY_QUEUE = defineDurableQueue('scrape-delivery', {
	workerConcurrency: 1,
});
