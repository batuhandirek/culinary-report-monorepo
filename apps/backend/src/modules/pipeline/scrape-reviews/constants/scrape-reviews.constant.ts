import type { OperationRun } from '../../shared/util/operations.js';
import { SCRAPE_REVIEWS_QUEUE } from '../queues/scrape-reviews.queue.js';

export const SCRAPE_REVIEWS_MONTH: OperationRun = {
	operation: 'scrape-reviews',
	cadence: 'month',
	queue: SCRAPE_REVIEWS_QUEUE,
};

export { MONTH_CRON as SCRAPE_REVIEWS_MONTH_CRON } from '../../shared/constants/cadence.constant.js';
