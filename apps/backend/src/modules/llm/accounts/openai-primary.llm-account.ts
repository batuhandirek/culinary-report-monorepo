import { llmConfig } from '../config/llm.config.js';

import { defineLlmAccount, tokensPerDay } from './llm-account.js';

/**
 * The main OpenAI account (`OPENAI_KEY_PRIMARY`): a day's tokens per model pool, under OpenAI's
 * complimentary 10M on the mini models and 1M on the full ones
 */
export const OPENAI_PRIMARY_ACCOUNT = defineLlmAccount({
	id: 'openai-primary',
	provider: 'openai',
	apiKey: llmConfig.OPENAI_KEY_PRIMARY,
	limits: [
		tokensPerDay(9_200_000, { models: ['openai/gpt-5.4-mini'] }),
		tokensPerDay(920_000, { models: ['openai/gpt-5.4'] }),
	],
});
