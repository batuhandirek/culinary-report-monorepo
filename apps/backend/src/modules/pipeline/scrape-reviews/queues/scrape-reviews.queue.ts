import { defineDurableQueue } from 'src/modules/durable-workflows/queues/define-durable-queue.js';

/** The report venues' month of reviews, one city at a time */
export const SCRAPE_REVIEWS_QUEUE = defineDurableQueue('scrape-reviews', { workerConcurrency: 1 });
