import type { OperationRun } from '../../shared/util/operations.js';
import { REVIEW_WATCH_QUEUE } from '../queues/review-watch.queue.js';

export const REVIEW_WATCH_WEEK: OperationRun = {
	operation: 'review-watch',
	cadence: 'week',
	queue: REVIEW_WATCH_QUEUE,
};

// Mondays 05:00 UTC
export const REVIEW_WATCH_WEEK_CRON = '0 5 * * 1';

/** How far back the watch scrapes: a week plus slack for a late run */
export const REVIEW_WATCH_DAYS = 10;
