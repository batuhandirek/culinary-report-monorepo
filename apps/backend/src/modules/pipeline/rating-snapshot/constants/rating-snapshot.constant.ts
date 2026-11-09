import type { OperationRun } from '../../shared/util/operations.js';
import { RATING_SNAPSHOT_QUEUE } from '../queues/rating-snapshot.queue.js';

export const RATING_SNAPSHOT_WEEK: OperationRun = {
	operation: 'rating-snapshot',
	cadence: 'week',
	queue: RATING_SNAPSHOT_QUEUE,
};

// Tuesdays 04:30 UTC
export const RATING_SNAPSHOT_WEEK_CRON = '30 4 * * 2';
