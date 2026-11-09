import { Inject, Injectable } from '@nestjs/common';

import { ModelRouterEmbeddingModel } from '@mastra/core/llm';

import { EMBEDDING_ACCOUNT, type EmbeddingAccount } from '../accounts/embedding-account.js';

import { LlmModelsService } from './llm-models.service.js';

const EMBEDDING_MODEL_ID = 'openai/text-embedding-3-large' as const;
/** text-embedding-3-large, paid per token: OpenAI's free daily tokens don't cover embeddings */
const EMBEDDING_USD_PER_MILLION_TOKENS = 0.13;

/**
 * Vectors for texts, on the embedding account (`*.embedding-account.ts`: never held by a limit),
 * every request filed in the ledger under it, whatever became of it. Nothing is cached: the
 * callers store their vectors on their own rows (`halfvec` columns).
 */
@Injectable()
export class EmbeddingsService {
	private embedder?: ModelRouterEmbeddingModel;

	constructor(
		private readonly llmModels: LlmModelsService,
		@Inject(EMBEDDING_ACCOUNT) private readonly account: EmbeddingAccount,
	) {}

	/**
	 * Vectors for many texts in one request, shortened by OpenAI to `dimensions` (text-embedding-3
	 * is trained for it). Up to 2,048 values a call. Throws when OpenAI returns another count of
	 * vectors or another length, so a vector of the wrong size is never stored. `tokens` is the
	 * request's reported usage.
	 */
	async embedMany(
		values: string[],
		{ dimensions }: { dimensions: number },
	): Promise<{ embeddings: number[][]; tokens: number }> {
		if (!values.length) return { embeddings: [], tokens: 0 };
		const embedded = await this.embed(values, dimensions);
		if (embedded.embeddings.length !== values.length)
			throw new Error(
				`Embedding returned ${embedded.embeddings.length} vectors for ${values.length} values`,
			);
		const wrong = embedded.embeddings.find(e => e.length !== dimensions);
		if (wrong)
			throw new Error(
				`Embedding returned a vector of ${wrong.length} values, asked for ${dimensions}`,
			);
		return { embeddings: embedded.embeddings, tokens: embedded.usage?.tokens ?? 0 };
	}

	private async embed(values: string[], dimensions: number) {
		const start = Date.now();
		try {
			this.embedder ??= new ModelRouterEmbeddingModel({
				id: EMBEDDING_MODEL_ID,
				apiKey: this.account.apiKey,
			});
			// The router hands the call to the AI SDK's OpenAI embedding model, which reads
			// `providerOptions.openai.dimensions` into the request body's `dimensions`
			const embedded = await this.embedder.doEmbed({
				values,
				providerOptions: { openai: { dimensions } },
			});
			this.record(embedded.usage?.tokens ?? 0, start);
			return embedded;
		} catch (error) {
			this.record(0, start, (error as Error).message);
			throw error;
		}
	}

	private record(tokens: number, start: number, error?: string): void {
		this.llmModels.recordCall({
			kind: 'embed',
			agentId: 'embeddings',
			model: error ? null : EMBEDDING_MODEL_ID,
			account: this.account.id,
			usage: { inputTokens: tokens, outputTokens: 0 },
			usd: (tokens / 1_000_000) * EMBEDDING_USD_PER_MILLION_TOKENS,
			durationMs: Date.now() - start,
			ok: !error,
			error,
		});
	}
}
