import { defineDurableQueue } from 'src/modules/durable-workflows/queues/define-durable-queue.js';

/**
 * An admin's report builds and analyses (`ReportBuildWorkflow`), two at a time: a run waiting for
 * an LLM account holds its slot, and every build waits on the same accounts anyway
 */
export const REPORTS_QUEUE = defineDurableQueue('reports', { workerConcurrency: 2 });
