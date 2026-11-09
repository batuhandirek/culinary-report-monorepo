import { defineDurableQueue } from 'src/modules/durable-workflows/queues/define-durable-queue.js';

import { APIFY_QUEUE_CONCURRENCY } from '../constants/apify.constant.js';

/**
 * Every actor run (`ApifyWorkflows.runActor`), whoever asked for it: the one choke point on the
 * account's concurrent runs (the plan's 16 GB of actor memory), so hourly, weekly and monthly
 * work never fire more runs at once than the plan serves.
 */
export const APIFY_QUEUE = defineDurableQueue('apify', {
	workerConcurrency: APIFY_QUEUE_CONCURRENCY,
});
