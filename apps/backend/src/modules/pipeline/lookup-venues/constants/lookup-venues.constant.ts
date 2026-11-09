import type { OperationRun } from '../../shared/util/operations.js';
import { LOOKUP_VENUES_QUEUE } from '../queues/lookup-venues.queue.js';

export const LOOKUP_VENUES_MONTH: OperationRun = {
	operation: 'lookup-venues',
	cadence: 'month',
	queue: LOOKUP_VENUES_QUEUE,
};
export const LOOKUP_VENUES_WEEK: OperationRun = {
	operation: 'lookup-venues',
	cadence: 'week',
	queue: LOOKUP_VENUES_QUEUE,
};

export { MONTH_CRON as LOOKUP_VENUES_MONTH_CRON } from '../../shared/constants/cadence.constant.js';
export { WEEK_CRON as LOOKUP_VENUES_WEEK_CRON } from '../../shared/constants/cadence.constant.js';
