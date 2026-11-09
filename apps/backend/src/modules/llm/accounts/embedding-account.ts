/**
 * The account embeddings run on (`EmbeddingsService`): one `*.embedding-account.ts` file, its key
 * read from its own config variable. Never held by a limit (an embedding always goes); every
 * request is filed in the ledger under its id (`LlmCall.account`) with its tokens and cost.
 */
export interface EmbeddingAccount {
	readonly id: string;
	readonly provider: 'openai';
	readonly apiKey: string;
}

export const defineEmbeddingAccount = (account: EmbeddingAccount): EmbeddingAccount => account;

/** The embedding account `EmbeddingsService` runs on, provided by `LLMModule` */
export const EMBEDDING_ACCOUNT = Symbol('EMBEDDING_ACCOUNT');
