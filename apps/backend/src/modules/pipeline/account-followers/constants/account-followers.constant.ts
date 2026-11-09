import type { OperationRun } from '../../shared/util/operations.js';
import { ACCOUNT_FOLLOWERS_QUEUE } from '../queues/account-followers.queue.js';

export const ACCOUNT_FOLLOWERS_DAY: OperationRun = {
	operation: 'account-followers',
	cadence: 'day',
	queue: ACCOUNT_FOLLOWERS_QUEUE,
};

// Daily 05:45 UTC
export const ACCOUNT_FOLLOWERS_DAY_CRON = '45 5 * * *';
