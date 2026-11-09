import { llmConfig } from '../config/llm.config.js';

import { defineLlmAccount, tokensPerDay } from './llm-account.js';

/** The main OpenAI account (`OPENAI_KEY_PRIMARY`): 8M agent tokens a day */
export const OPENAI_PRIMARY_ACCOUNT = defineLlmAccount({
	id: 'openai-primary',
	provider: 'openai',
	apiKey: llmConfig.OPENAI_KEY_PRIMARY,
	limits: [tokensPerDay(8_000_000)],
});
