import type { OperationRun } from '../../shared/util/operations.js';
import { DISH_SEARCHES_QUEUE } from '../queues/dish-searches.queue.js';

export const DISH_SEARCHES_DAY: OperationRun = {
	operation: 'dish-searches',
	cadence: 'day',
	queue: DISH_SEARCHES_QUEUE,
};

// Daily 05:15 UTC: each city whose newest snapshot is `City.dishSearchEveryDays` old gets one
export const DISH_SEARCHES_DAY_CRON = '15 5 * * *';
