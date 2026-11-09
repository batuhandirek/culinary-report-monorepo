import type { OperationRun } from '../../shared/util/operations.js';
import { PROFILE_TRACK_QUEUE } from '../queues/profile-track.queue.js';

export const PROFILE_TRACK_WEEK: OperationRun = {
	operation: 'profile-track',
	cadence: 'week',
	queue: PROFILE_TRACK_QUEUE,
};

// Wednesdays 04:45 UTC
export const PROFILE_TRACK_WEEK_CRON = '45 4 * * 3';
