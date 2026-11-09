import type { OperationRun } from '../../shared/util/operations.js';
import { SCRAPE_TIKTOK_QUEUE } from '../queues/scrape-tiktok.queue.js';

export const SCRAPE_TIKTOK_MONTH: OperationRun = {
	operation: 'scrape-tiktok',
	cadence: 'month',
	queue: SCRAPE_TIKTOK_QUEUE,
};
export const SCRAPE_TIKTOK_WEEK: OperationRun = {
	operation: 'scrape-tiktok',
	cadence: 'week',
	queue: SCRAPE_TIKTOK_QUEUE,
};

export {
	MONTH_CRON as SCRAPE_TIKTOK_MONTH_CRON,
	WEEK_CRON as SCRAPE_TIKTOK_WEEK_CRON,
} from '../../shared/constants/cadence.constant.js';
