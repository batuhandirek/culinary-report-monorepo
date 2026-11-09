import { defineDurableQueue } from 'src/modules/durable-workflows/queues/define-durable-queue.js';

/** The city Instagram hashtag scrapes, one city at a time */
export const SCRAPE_INSTAGRAM_QUEUE = defineDurableQueue('scrape-instagram', {
	workerConcurrency: 1,
});
