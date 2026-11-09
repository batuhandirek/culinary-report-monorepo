import { defineDurableQueue } from 'src/modules/durable-workflows/queues/define-durable-queue.js';

/** One workflow per press page (`ClassifyPressWorkflow.classifyPage`); the agent call is a child on `llm` */
export const CLASSIFY_PRESS_QUEUE = defineDurableQueue('classify-press', { workerConcurrency: 8 });

/** A city's run (`ClassifyPressWorkflow.classifyCity`): one waiting or running per city */
export const CLASSIFY_PRESS_CITY_QUEUE = defineDurableQueue('classify-press-city', {
	workerConcurrency: 2,
});
