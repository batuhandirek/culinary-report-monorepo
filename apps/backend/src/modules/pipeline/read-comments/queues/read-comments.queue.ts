import { defineDurableQueue } from 'src/modules/durable-workflows/queues/define-durable-queue.js';

/** One workflow per post's comments (`ReadCommentsWorkflow.readPost`); the agent calls are children on `llm` */
export const READ_COMMENTS_QUEUE = defineDurableQueue('read-comments', { workerConcurrency: 4 });

/** A city's run (`ReadCommentsWorkflow.readCity`): one waiting or running per city */
export const READ_COMMENTS_CITY_QUEUE = defineDurableQueue('read-comments-city', {
	workerConcurrency: 2,
});
