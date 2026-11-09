import { defineDurableQueue } from 'src/modules/durable-workflows/queues/define-durable-queue.js';

/** One workflow per post re-read (`RereadPostsWorkflow.rereadPost`); its agent calls wait on the `llm` queue */
export const REREAD_POSTS_QUEUE = defineDurableQueue('reread-posts', { workerConcurrency: 4 });
