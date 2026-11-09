import { llmConfig } from '../config/llm.config.js';

import { defineLlmAccount, tokensPerDay } from './llm-account.js';

/** The second OpenAI account (`OPENAI_KEY_SECONDARY`, optional): 3M agent tokens a day */
export const OPENAI_SECONDARY_ACCOUNT = defineLlmAccount({
	id: 'openai-secondary',
	provider: 'openai',
	apiKey: llmConfig.OPENAI_KEY_SECONDARY,
	limits: [tokensPerDay(3_000_000)],
});
