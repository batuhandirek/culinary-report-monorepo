import { defineDurableQueue } from 'src/modules/durable-workflows/queues/define-durable-queue.js';

/** The report venues' delivery listings and menus, one city at a time */
export const SCRAPE_DELIVERY_QUEUE = defineDurableQueue('scrape-delivery', {
	workerConcurrency: 1,
});

/**
 * One brand's menus by hand ("Find menus"): a queue of its own, since the month's run holds its
 * queue for as long as its page reads take
 */
export const SCRAPE_DELIVERY_BRAND_QUEUE = defineDurableQueue('scrape-delivery-brand', {
	workerConcurrency: 2,
});
