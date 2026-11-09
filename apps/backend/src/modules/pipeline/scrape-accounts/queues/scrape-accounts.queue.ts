import { defineDurableQueue } from 'src/modules/durable-workflows/queues/define-durable-queue.js';

/** The watched profiles of the brands, one city at a time */
export const SCRAPE_ACCOUNTS_QUEUE = defineDurableQueue('scrape-accounts', {
	workerConcurrency: 1,
});
