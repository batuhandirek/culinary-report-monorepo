import { defineDurableQueue } from 'src/modules/durable-workflows/queues/define-durable-queue.js';

/** The names posts gave that nothing matched, looked up, one city at a time */
export const LOOKUP_VENUES_QUEUE = defineDurableQueue('lookup-venues', { workerConcurrency: 1 });
