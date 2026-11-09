import type { OperationRun } from '../../shared/util/operations.js';
import { SCRAPE_PRESS_QUEUE } from '../queues/scrape-press.queue.js';

export const SCRAPE_PRESS_MONTH: OperationRun = {
	operation: 'scrape-press',
	cadence: 'month',
	queue: SCRAPE_PRESS_QUEUE,
};

export { MONTH_CRON as SCRAPE_PRESS_MONTH_CRON } from '../../shared/constants/cadence.constant.js';
