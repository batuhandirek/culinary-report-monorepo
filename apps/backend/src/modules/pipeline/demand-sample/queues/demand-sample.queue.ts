import { defineDurableQueue } from 'src/modules/durable-workflows/queues/define-durable-queue.js';

/** The busyness and open-table samples, one city at a time */
export const DEMAND_SAMPLE_QUEUE = defineDurableQueue('demand-sample', { workerConcurrency: 1 });
