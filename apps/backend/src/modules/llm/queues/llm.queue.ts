import type { DurableQueue } from 'src/modules/durable-workflows/interfaces/durable-workflows.interface.js';
import { defineDurableQueue } from 'src/modules/durable-workflows/queues/define-durable-queue.js';

import type { LlmTier } from '../constants/llm-models.constant.js';
import { LLM_QUEUE_CONCURRENCY } from '../constants/llm-workflows.constant.js';

/**
 * Every agent call made through `DurableLlmService` (`LlmWorkflows.generate`), one queue per tier
 * of the roster. A call no account can serve sleeps until the reset while holding its queue's
 * slot, so a tier out for the day (gpt-5.4's 1M tokens) must only hold its own tier's calls, never
 * the mini calls behind it. `mini` keeps the name `llm`, the one queue before the split: a run an
 * older process starts during a deploy still lands on a queue that exists.
 */
export const LLM_QUEUES: Record<LlmTier, DurableQueue> = {
	mini: defineDurableQueue('llm', { workerConcurrency: LLM_QUEUE_CONCURRENCY.mini }),
	full: defineDurableQueue('llm-full', { workerConcurrency: LLM_QUEUE_CONCURRENCY.full }),
	high: defineDurableQueue('llm-high', { workerConcurrency: LLM_QUEUE_CONCURRENCY.high }),
};

/**
 * The calls of agents that may pay (`paidFallback`), one queue per tier: once the free models are
 * out they move on to Claude while the free-only calls of their tier sleep in their slots until the
 * reset, so the two must never share a queue (on `llm`, the review reading's sleeping calls would
 * hold every slot and the post gate would wait for midnight with Haiku free to serve it).
 */
export const LLM_PAID_QUEUES: Record<LlmTier, DurableQueue> = {
	mini: defineDurableQueue('llm-paid', { workerConcurrency: LLM_QUEUE_CONCURRENCY.mini }),
	full: defineDurableQueue('llm-full-paid', { workerConcurrency: LLM_QUEUE_CONCURRENCY.full }),
	high: defineDurableQueue('llm-high-paid', { workerConcurrency: LLM_QUEUE_CONCURRENCY.high }),
};

/** The queue of a tier's calls: the paying agents' or the free-only ones' */
export const llmQueueOf = (tier: LlmTier, paying: boolean): DurableQueue =>
	(paying ? LLM_PAID_QUEUES : LLM_QUEUES)[tier];

/** Every agent call queue, free-only first */
export const ALL_LLM_QUEUES: DurableQueue[] = [
	...Object.values(LLM_QUEUES),
	...Object.values(LLM_PAID_QUEUES),
];
