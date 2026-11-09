import { defineDurableQueue } from 'src/modules/durable-workflows/queues/define-durable-queue.js';

/** One workflow per post re-flagged (`ReflagOpeningsWorkflow.reflagPost`); its agent calls wait on the `llm` queue */
export const REFLAG_OPENINGS_QUEUE = defineDurableQueue('reflag-openings', {
	workerConcurrency: 8,
});
