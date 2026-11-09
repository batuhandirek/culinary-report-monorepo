import type { OperationRun } from '../../shared/util/operations.js';
import { OSM_PLACES_QUEUE } from '../queues/osm-places.queue.js';

export const OSM_PLACES_MONTH: OperationRun = {
	operation: 'osm-places',
	cadence: 'month',
	queue: OSM_PLACES_QUEUE,
};

export { MONTH_CRON as OSM_PLACES_MONTH_CRON } from '../../shared/constants/cadence.constant.js';
