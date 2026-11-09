import { defineDurableQueue } from 'src/modules/durable-workflows/queues/define-durable-queue.js';

/** The daily drain (`LlmBacklogWorkflows.drain`): one at a time, one waiting (`LLM_BACKLOG_SINGLETON_KEY`) */
export const LLM_BACKLOG_QUEUE = defineDurableQueue('llm-backlog', { workerConcurrency: 1 });
