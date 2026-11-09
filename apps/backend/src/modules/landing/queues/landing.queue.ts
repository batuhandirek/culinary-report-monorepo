import { defineDurableQueue } from 'src/modules/durable-workflows/queues/define-durable-queue.js';

/** The front page's builds (`LandingEditionWorkflow.build`): one in flight per city (`dedupe` the city id) */
export const LANDING_QUEUE = defineDurableQueue('landing', { workerConcurrency: 2 });
