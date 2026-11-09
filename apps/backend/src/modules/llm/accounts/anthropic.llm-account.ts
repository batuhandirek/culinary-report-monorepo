import { llmConfig } from '../config/llm.config.js';

import { defineLlmAccount } from './llm-account.js';

/**
 * Claude (`ANTHROPIC_API_KEY`), paid per token and served only inside `llmPaid` (or to the agents
 * with `paidFallback`): no limit of its own, the spend is capped in the Anthropic Console
 */
export const ANTHROPIC_ACCOUNT = defineLlmAccount({
	id: 'anthropic',
	provider: 'anthropic',
	apiKey: llmConfig.ANTHROPIC_API_KEY,
	limits: [],
});
