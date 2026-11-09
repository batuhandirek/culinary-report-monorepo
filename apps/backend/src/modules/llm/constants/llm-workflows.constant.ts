import type { LlmTier } from './llm-models.constant.js';

/** `LlmWorkflows.generate` by name, for `DurableLlmService` (it starts the workflow for any caller) */
export const LLM_GENERATE_WORKFLOW = { className: 'LlmWorkflows', name: 'generate' } as const;

/**
 * Agent calls at once per tier (`LLM_QUEUES`): OpenAI's allowance serves this many in flight
 * comfortably; OpenRouter's spacing stays in the roster. `full` reads posts on a 1M-token day,
 * `high` is rare
 */
export const LLM_QUEUE_CONCURRENCY: Record<LlmTier, number> = { mini: 8, full: 4, high: 2 };
