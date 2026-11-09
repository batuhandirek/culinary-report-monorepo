import { defineDurableQueue } from 'src/modules/durable-workflows/queues/define-durable-queue.js';

/** The brand accounts with no follower count, one city at a time */
export const ACCOUNT_FOLLOWERS_QUEUE = defineDurableQueue('account-followers', {
	workerConcurrency: 1,
});
