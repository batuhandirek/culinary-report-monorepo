import type { OperationRun } from '../../shared/util/operations.js';
import { SCRAPE_COMMENTS_QUEUE } from '../queues/scrape-comments.queue.js';

export const SCRAPE_COMMENTS_MONTH: OperationRun = {
	operation: 'scrape-comments',
	cadence: 'month',
	queue: SCRAPE_COMMENTS_QUEUE,
};

export { MONTH_CRON as SCRAPE_COMMENTS_MONTH_CRON } from '../../shared/constants/cadence.constant.js';
