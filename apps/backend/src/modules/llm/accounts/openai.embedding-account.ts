import { llmConfig } from '../config/llm.config.js';

import { defineEmbeddingAccount } from './embedding-account.js';

/** Embeddings on OpenAI (text-embedding-3-large), on the primary account's key (`OPENAI_KEY_PRIMARY`) */
export const OPENAI_EMBEDDING_ACCOUNT = defineEmbeddingAccount({
	id: 'openai-embeddings',
	provider: 'openai',
	apiKey: llmConfig.OPENAI_KEY_PRIMARY,
});
