import type { OperationRun } from '../../shared/util/operations.js';
import { REFRESH_VENUE_DETAILS_QUEUE } from '../queues/refresh-venue-details.queue.js';

export const REFRESH_VENUE_DETAILS_MONTH: OperationRun = {
	operation: 'refresh-venue-details',
	cadence: 'month',
	queue: REFRESH_VENUE_DETAILS_QUEUE,
};

export { MONTH_CRON as REFRESH_VENUE_DETAILS_MONTH_CRON } from '../../shared/constants/cadence.constant.js';
