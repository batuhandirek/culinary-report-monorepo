import { defineDurableQueue } from 'src/modules/durable-workflows/queues/define-durable-queue.js';

/** The city TikTok searches, one city at a time */
export const SCRAPE_TIKTOK_QUEUE = defineDurableQueue('scrape-tiktok', { workerConcurrency: 1 });
