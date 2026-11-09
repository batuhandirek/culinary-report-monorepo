import { defineDurableQueue } from 'src/modules/durable-workflows/queues/define-durable-queue.js';

/** OpenStreetMap's checklist of a city's food places, one city at a time */
export const OSM_PLACES_QUEUE = defineDurableQueue('osm-places', { workerConcurrency: 1 });
