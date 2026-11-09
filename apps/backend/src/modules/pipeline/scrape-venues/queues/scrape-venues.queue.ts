import { defineDurableQueue } from 'src/modules/durable-workflows/queues/define-durable-queue.js';

/** The quarterly city venue list and branch search, one city at a time */
export const SCRAPE_VENUES_QUEUE = defineDurableQueue('scrape-venues', { workerConcurrency: 1 });
