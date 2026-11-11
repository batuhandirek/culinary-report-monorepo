import type { OperationRun } from '../../shared/util/operations.js';
import { REFRESH_VENUE_DETAILS_QUEUE } from '../queues/refresh-venue-details.queue.js';

export const REFRESH_VENUE_DETAILS_MONTH: OperationRun = {
	operation: 'refresh-venue-details',
	cadence: 'month',
	queue: REFRESH_VENUE_DETAILS_QUEUE,
};

/** One venue by hand ("Refresh from Google" on its page): the workflow's name */
export const REFRESH_VENUE_DETAILS_VENUE = 'refresh-venue-details.venue';

/**
 * What one venue's refresh may spend: the actor's lowest cap (a place's detail page is ~$0.006,
 * `GOOGLE_PLACE_USD`, so the cap is never reached)
 */
export const VENUE_DETAILS_REFRESH_USD = 0.5;

export { MONTH_CRON as REFRESH_VENUE_DETAILS_MONTH_CRON } from '../../shared/constants/cadence.constant.js';
