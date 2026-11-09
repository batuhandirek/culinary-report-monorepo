import { defineDurableQueue } from 'src/modules/durable-workflows/queues/define-durable-queue.js';

/**
 * Aspect discovery over the cities (`AspectDiscoveryWorkflow.runAll`): one run at a time (`dedupe`
 * `ASPECT_DISCOVERY_DEDUPE`), since two over the same claims would create an aspect twice
 */
export const ASPECT_DISCOVERY_QUEUE = defineDurableQueue('aspect-discovery', {
	workerConcurrency: 1,
});

/** The dedupe key of a run over the cities: one in flight, whoever starts it */
export const ASPECT_DISCOVERY_DEDUPE = 'cities';
