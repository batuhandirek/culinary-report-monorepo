import { defineDurableQueue } from 'src/modules/durable-workflows/queues/define-durable-queue.js';

/** The brands' accounts on the platform they lack, one city at a time */
export const FIND_OWN_ACCOUNTS_QUEUE = defineDurableQueue('find-own-accounts', {
	workerConcurrency: 1,
});
