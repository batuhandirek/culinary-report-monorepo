import { defineDurableQueue } from 'src/modules/durable-workflows/queues/define-durable-queue.js';

/** Brand searches one at a time: the quarter's run of a city's chains, and an admin's "Find branches" */
export const BRAND_BRANCH_SEARCH_QUEUE = defineDurableQueue('brand-branch-search', {
	workerConcurrency: 1,
});
