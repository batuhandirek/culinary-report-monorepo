import { defineDurableQueue } from 'src/modules/durable-workflows/queues/define-durable-queue.js';

/** The report brands' press, one city at a time */
export const SCRAPE_PRESS_QUEUE = defineDurableQueue('scrape-press', { workerConcurrency: 1 });
