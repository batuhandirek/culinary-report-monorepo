import { POST_STREAM_PRIORITY, type OperationRun } from '../../shared/util/operations.js';
import { SCRAPE_VENUE_SOCIAL_QUEUE } from '../queues/scrape-venue-social.queue.js';

export const SCRAPE_VENUE_SOCIAL_MONTH: OperationRun = {
	operation: 'scrape-venue-social',
	cadence: 'month',
	queue: SCRAPE_VENUE_SOCIAL_QUEUE,
};
export const SCRAPE_VENUE_SOCIAL_WEEK: OperationRun = {
	operation: 'scrape-venue-social',
	cadence: 'week',
	queue: SCRAPE_VENUE_SOCIAL_QUEUE,
	priority: POST_STREAM_PRIORITY,
};

export { MONTH_CRON as SCRAPE_VENUE_SOCIAL_MONTH_CRON } from '../../shared/constants/cadence.constant.js';
export { WEEK_CRON as SCRAPE_VENUE_SOCIAL_WEEK_CRON } from '../../shared/constants/cadence.constant.js';
