/** `LlmWorkflows.generate` by name, for `DurableLlmService` (it starts the workflow for any caller) */
export const LLM_GENERATE_WORKFLOW = { className: 'LlmWorkflows', name: 'generate' } as const;

/** Agent calls at once across the app (`LLM_QUEUE`): OpenAI's allowance serves this many in flight comfortably; OpenRouter's spacing stays in the roster */
export const LLM_QUEUE_CONCURRENCY = 8;
