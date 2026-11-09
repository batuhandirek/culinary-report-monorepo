import { defineDurableQueue } from 'src/modules/durable-workflows/queues/define-durable-queue.js';

/** The city blogs' feeds, one city at a time */
export const SCRAPE_BLOGS_QUEUE = defineDurableQueue('scrape-blogs', { workerConcurrency: 1 });
