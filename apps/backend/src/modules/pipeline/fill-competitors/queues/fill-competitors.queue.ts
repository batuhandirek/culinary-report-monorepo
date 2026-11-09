import { defineDurableQueue } from 'src/modules/durable-workflows/queues/define-durable-queue.js';

/** The report brands' competitors, one city at a time */
export const FILL_COMPETITORS_QUEUE = defineDurableQueue('fill-competitors', {
	workerConcurrency: 1,
});
