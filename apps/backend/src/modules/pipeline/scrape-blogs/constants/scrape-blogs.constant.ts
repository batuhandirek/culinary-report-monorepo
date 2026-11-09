import type { OperationRun } from '../../shared/util/operations.js';
import { SCRAPE_BLOGS_QUEUE } from '../queues/scrape-blogs.queue.js';

export const SCRAPE_BLOGS_MONTH: OperationRun = {
	operation: 'scrape-blogs',
	cadence: 'month',
	queue: SCRAPE_BLOGS_QUEUE,
};
export const SCRAPE_BLOGS_WEEK: OperationRun = {
	operation: 'scrape-blogs',
	cadence: 'week',
	queue: SCRAPE_BLOGS_QUEUE,
};

export {
	MONTH_CRON as SCRAPE_BLOGS_MONTH_CRON,
	WEEK_CRON as SCRAPE_BLOGS_WEEK_CRON,
} from '../../shared/constants/cadence.constant.js';
