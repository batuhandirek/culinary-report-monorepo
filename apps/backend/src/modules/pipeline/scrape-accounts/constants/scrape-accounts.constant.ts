import type { OperationRun } from '../../shared/util/operations.js';
import { SCRAPE_ACCOUNTS_QUEUE } from '../queues/scrape-accounts.queue.js';

export const SCRAPE_ACCOUNTS_MONTH: OperationRun = {
	operation: 'scrape-accounts',
	cadence: 'month',
	queue: SCRAPE_ACCOUNTS_QUEUE,
};
export const SCRAPE_ACCOUNTS_WEEK: OperationRun = {
	operation: 'scrape-accounts',
	cadence: 'week',
	queue: SCRAPE_ACCOUNTS_QUEUE,
};

export { MONTH_CRON as SCRAPE_ACCOUNTS_MONTH_CRON } from '../../shared/constants/cadence.constant.js';
export { WEEK_CRON as SCRAPE_ACCOUNTS_WEEK_CRON } from '../../shared/constants/cadence.constant.js';

/**
 * How far back a week's run keeps a brand account's posts: two weeks and a day, so each post is
 * seen again at 7 to 14 days old and that read is its count at seven days
 * (`SocialPostService.readCounts`); the paid count refresh leaves those posts out. Instagram's
 * profile carries its latest posts free; TikTok pays each video twice, still under the refresh's
 * price for one.
 */
export const OWN_ACCOUNTS_KEEP_DAYS = 15;
