import type { OperationRun } from '../../shared/util/operations.js';
import { DEMAND_SAMPLE_QUEUE } from '../queues/demand-sample.queue.js';

export const SAMPLE_BUSYNESS_DAY: OperationRun = {
	operation: 'sample-busyness',
	cadence: 'day',
	queue: DEMAND_SAMPLE_QUEUE,
};
export const SAMPLE_RESERVATIONS_DAY: OperationRun = {
	operation: 'sample-reservations',
	cadence: 'day',
	queue: DEMAND_SAMPLE_QUEUE,
};

// Hourly: each city is sampled in its own evening (`dueDemandSamples`)
export const DEMAND_SAMPLE_CRON = '0 * * * *';

/**
 * How many venues one reservation sample takes at most: Google's booking page is free but paced
 * (two dates × two loads a venue, ~1.5 s apart), so 600 venues take about an hour
 */
export const RESERVATION_SAMPLE_MAX_VENUES = 600;
