import { defineDurableQueue } from 'src/modules/durable-workflows/queues/define-durable-queue.js';

/** The brands' lead scores, one city at a time */
export const SCORE_LEADS_QUEUE = defineDurableQueue('score-leads', { workerConcurrency: 1 });
