import { llmConfig } from '../config/llm.config.js';

import { defineLlmAccount, requestsPerDay } from './llm-account.js';

/**
 * OpenRouter (`OPENROUTER_AI_API_KEY`), for its free models: 1,000 requests a day (the cap once $10
 * of credit was ever bought; 50 without) and 20 a minute, which its calls are spaced to
 */
export const OPENROUTER_ACCOUNT = defineLlmAccount({
	id: 'openrouter',
	provider: 'openrouter',
	apiKey: llmConfig.OPENROUTER_AI_API_KEY,
	limits: [requestsPerDay(1_000)],
	requestsPerMinute: 20,
});
