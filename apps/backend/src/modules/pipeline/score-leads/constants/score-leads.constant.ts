import type { OperationRun } from '../../shared/util/operations.js';
import { SCORE_LEADS_QUEUE } from '../queues/score-leads.queue.js';

export const SCORE_LEADS_MONTH: OperationRun = {
	operation: 'score-leads',
	cadence: 'month',
	queue: SCORE_LEADS_QUEUE,
};

export { MONTH_CRON as SCORE_LEADS_MONTH_CRON } from '../../shared/constants/cadence.constant.js';
