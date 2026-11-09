import type { OperationRun } from '../../shared/util/operations.js';
import { POST_COUNTS_QUEUE } from '../queues/post-counts.queue.js';

export const POST_COUNTS_DAY: OperationRun = {
	operation: 'post-counts',
	cadence: 'day',
	queue: POST_COUNTS_QUEUE,
};

// Daily 05:30 UTC: every post's counts are read at seven days, whatever day a scrape found it
export const POST_COUNTS_DAY_CRON = '30 5 * * *';
