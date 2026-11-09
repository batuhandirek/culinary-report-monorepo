import type { OperationRun } from '../../shared/util/operations.js';
import { FILL_COMPETITORS_QUEUE } from '../queues/fill-competitors.queue.js';

export const FILL_COMPETITORS_MONTH: OperationRun = {
	operation: 'fill-competitors',
	cadence: 'month',
	queue: FILL_COMPETITORS_QUEUE,
};

export { MONTH_CRON as FILL_COMPETITORS_MONTH_CRON } from '../../shared/constants/cadence.constant.js';
