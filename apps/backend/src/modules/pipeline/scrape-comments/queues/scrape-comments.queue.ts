import { defineDurableQueue } from 'src/modules/durable-workflows/queues/define-durable-queue.js';

/** The comments under the report brands' top posts, one city at a time */
export const SCRAPE_COMMENTS_QUEUE = defineDurableQueue('scrape-comments', {
	workerConcurrency: 1,
});
