import { defineDurableQueue } from 'src/modules/durable-workflows/queues/define-durable-queue.js';

import { LLM_QUEUE_CONCURRENCY } from '../constants/llm-workflows.constant.js';

/** Every agent call made through `DurableLlmService` (`LlmWorkflows.generate`): one choke point on the calls in flight */
export const LLM_QUEUE = defineDurableQueue('llm', { workerConcurrency: LLM_QUEUE_CONCURRENCY });
