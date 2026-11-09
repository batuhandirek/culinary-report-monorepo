import type { OperationRun } from '../../shared/util/operations.js';
import { READ_MENTIONED_PROFILES_QUEUE } from '../queues/read-mentioned-profiles.queue.js';

export const READ_MENTIONED_PROFILES_WEEK: OperationRun = {
	operation: 'read-mentioned-profiles',
	cadence: 'week',
	queue: READ_MENTIONED_PROFILES_QUEUE,
};

export { WEEK_CRON as READ_MENTIONED_PROFILES_WEEK_CRON } from '../../shared/constants/cadence.constant.js';

// The share of a run's budget the profile reads take first; the address searches get what is left
export const MENTIONED_PROFILES_SHARE = 0.6;
