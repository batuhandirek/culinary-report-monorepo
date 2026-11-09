import { defineDurableQueue } from 'src/modules/durable-workflows/queues/define-durable-queue.js';

/** The posts turning seven days old, one city at a time */
export const POST_COUNTS_QUEUE = defineDurableQueue('post-counts', { workerConcurrency: 1 });
