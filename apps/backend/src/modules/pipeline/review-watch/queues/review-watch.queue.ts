import { defineDurableQueue } from 'src/modules/durable-workflows/queues/define-durable-queue.js';

/** The subscribers' new reviews and their alerts, one city at a time */
export const REVIEW_WATCH_QUEUE = defineDurableQueue('review-watch', { workerConcurrency: 1 });
