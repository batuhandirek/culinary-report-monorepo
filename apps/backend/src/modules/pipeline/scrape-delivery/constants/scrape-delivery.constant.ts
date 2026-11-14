import type { OperationRun } from '../../shared/util/operations.js';
import { SCRAPE_DELIVERY_QUEUE } from '../queues/scrape-delivery.queue.js';

export const SCRAPE_DELIVERY_MONTH: OperationRun = {
	operation: 'scrape-delivery',
	cadence: 'month',
	queue: SCRAPE_DELIVERY_QUEUE,
};

/** One brand by hand ("Find menus" on the brand page): the workflow's name */
export const SCRAPE_DELIVERY_BRAND = 'scrape-delivery.brand';

export { MONTH_CRON as SCRAPE_DELIVERY_MONTH_CRON } from '../../shared/constants/cadence.constant.js';
