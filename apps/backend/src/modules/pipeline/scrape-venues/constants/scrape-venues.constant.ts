import type { OperationRun } from '../../shared/util/operations.js';
import { SCRAPE_VENUES_QUEUE } from '../queues/scrape-venues.queue.js';

export const SCRAPE_VENUES_MONTH: OperationRun = {
	operation: 'scrape-venues',
	cadence: 'month',
	queue: SCRAPE_VENUES_QUEUE,
};

/** The city's own list: every place Google Maps finds for these terms on the city's grid */
export const CITY_LIST_TERMS: string[] = ['restaurant', 'bar', 'cafe'];
/** Places a term keeps at most (the actor's ceiling): the list is a capped slice, OpenStreetMap the checklist */
export const CITY_LIST_PER_TERM = 1000;

export { MONTH_CRON as SCRAPE_VENUES_MONTH_CRON } from '../../shared/constants/cadence.constant.js';
