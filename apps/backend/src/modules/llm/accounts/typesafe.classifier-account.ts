import { llmConfig } from '../config/llm.config.js';

import { defineClassifierAccount } from './classifier-account.js';

/** TypeSafe (`TYPESAFE_AI_API_KEY`), Jev's decision models; unset, no classifier runs */
export const TYPESAFE_CLASSIFIER_ACCOUNT = defineClassifierAccount({
	id: 'typesafe',
	provider: 'typesafe',
	apiKey: llmConfig.TYPESAFE_AI_API_KEY,
});
