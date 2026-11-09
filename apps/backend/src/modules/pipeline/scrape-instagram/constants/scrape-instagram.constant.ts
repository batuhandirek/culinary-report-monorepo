import type { OperationRun } from '../../shared/util/operations.js';
import { SCRAPE_INSTAGRAM_QUEUE } from '../queues/scrape-instagram.queue.js';

export const SCRAPE_INSTAGRAM_MONTH: OperationRun = {
	operation: 'scrape-instagram',
	cadence: 'month',
	queue: SCRAPE_INSTAGRAM_QUEUE,
};
export const SCRAPE_INSTAGRAM_WEEK: OperationRun = {
	operation: 'scrape-instagram',
	cadence: 'week',
	queue: SCRAPE_INSTAGRAM_QUEUE,
};
export const SCRAPE_INSTAGRAM_DAY: OperationRun = {
	operation: 'scrape-instagram',
	cadence: 'day',
	queue: SCRAPE_INSTAGRAM_QUEUE,
};

export {
	MONTH_CRON as SCRAPE_INSTAGRAM_MONTH_CRON,
	WEEK_CRON as SCRAPE_INSTAGRAM_WEEK_CRON,
} from '../../shared/constants/cadence.constant.js';

// Daily 04:00 UTC: each hashtag's newest page of posts
export const SCRAPE_INSTAGRAM_DAY_CRON = '0 4 * * *';

/** How far back the daily scrape keeps posts: the run before was a day ago, so two days leave no gap at a month's turn */
export const INSTAGRAM_DAY_KEEP_DAYS = 2;
