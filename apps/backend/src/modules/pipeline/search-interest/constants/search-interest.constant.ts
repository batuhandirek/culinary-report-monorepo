import type { OperationRun } from '../../shared/util/operations.js';
import { SEARCH_INTEREST_QUEUE } from '../queues/search-interest.queue.js';

export const SEARCH_INTEREST_MONTH: OperationRun = {
	operation: 'search-interest',
	cadence: 'month',
	queue: SEARCH_INTEREST_QUEUE,
};

export { MONTH_CRON as SEARCH_INTEREST_MONTH_CRON } from '../../shared/constants/cadence.constant.js';
