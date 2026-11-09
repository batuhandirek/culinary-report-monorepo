import { defineDurableQueue } from 'src/modules/durable-workflows/queues/define-durable-queue.js';

/** The city's dish search snapshots, one city at a time */
export const DISH_SEARCHES_QUEUE = defineDurableQueue('dish-searches', { workerConcurrency: 1 });
