import type { OperationRun } from '../../shared/util/operations.js';
import { FIND_OWN_ACCOUNTS_QUEUE } from '../queues/find-own-accounts.queue.js';

export const FIND_OWN_ACCOUNTS_WEEK: OperationRun = {
	operation: 'find-own-accounts',
	cadence: 'week',
	queue: FIND_OWN_ACCOUNTS_QUEUE,
};

export { WEEK_CRON as FIND_OWN_ACCOUNTS_WEEK_CRON } from '../../shared/constants/cadence.constant.js';
