import { Injectable, Logger } from '@nestjs/common';

import { ModelRouterEmbeddingModel } from '@mastra/core/llm';

import { OpenAIAccountsService } from 'src/modules/llm/services/openai-accounts.service.js';

import { Embedding } from '../entities/embedding.entity.js';
import { EmbeddingRepository } from '../repositories/embedding.repository.js';

const EMBEDDING_MODEL = 'text-embedding-3-large';
const EMBEDDING_MODEL_ID = `openai/${EMBEDDING_MODEL}` as const;
const EMBEDDING_DIMENSIONS = 3072;

@Injectable()
export class EmbeddingsService {
	private readonly logger = new Logger(EmbeddingsService.name);
	/** One embedder per account key */
	private readonly embedders = new Map<string, ModelRouterEmbeddingModel>();
	/**
	 * Concurrent cache misses on the same input (e.g. parallel eval scenarios in
	 * separate EM forks) would race the unique constraint on `input` — the second
	 * flush throws. Callers for an in-flight input wait and re-read instead; the
	 * entity is always re-fetched in the caller's own EM context.
	 */
	private readonly inflight = new Map<string, Promise<void>>();

	constructor(
		private embeddingRepository: EmbeddingRepository,
		private openAIAccounts: OpenAIAccountsService,
	) {}

	private embed(input: string) {
		return this.openAIAccounts.run(EMBEDDING_MODEL_ID, account => {
			let embedder = this.embedders.get(account.apiKey);
			if (!embedder) {
				embedder = new ModelRouterEmbeddingModel({
					id: EMBEDDING_MODEL_ID,
					apiKey: account.apiKey,
				});
				this.embedders.set(account.apiKey, embedder);
			}
			return embedder.doEmbed({ values: [input] });
		});
	}

	/**
	 * The vector for `input`, without touching the `embeddings` cache.
	 *
	 * For text that is generated fresh per row — a listing's or alert's `embeddingText` — the
	 * cache never hits, so a row there is pure dead weight (~6 KB of TOAST each) that
	 * nothing references. Callers that own their vector (a `halfvec` column on their own
	 * table) use this; callers that look a vector up by its text keep {@link getEmbeddings}.
	 */
	async embedUncached(input: string): Promise<number[]> {
		this.logger.debug(`Embedding (uncached) "${input}"`);
		const embedded = await this.embed(input);
		return embedded.embeddings[0];
	}

	async getEmbeddings(input: string): Promise<Embedding> {
		const cached = await this.embeddingRepository.findByInput(input);
		if (cached) {
			this.logger.debug(`Cache hit for "${input}"`);
			return cached;
		}

		const pending = this.inflight.get(input);
		if (pending) {
			// Another caller is fetching this input — wait it out, then start over
			// so the entity is loaded in OUR EM context (theirs may be a different fork).
			await pending;
			return this.getEmbeddings(input);
		}

		// No await between the inflight check and set, so the claim is race-free.
		const task = this.fetchAndStore(input);
		this.inflight.set(
			input,
			task.then(
				() => undefined,
				() => undefined,
			),
		);
		try {
			return await task;
		} finally {
			this.inflight.delete(input);
		}
	}

	private async fetchAndStore(input: string): Promise<Embedding> {
		this.logger.debug(`Cache miss - fetching embeddings from OpenAI for "${input}"`);
		const embedded = await this.embed(input);
		const embedding = embedded.embeddings[0];
		const embeddingEntity = this.embeddingRepository.create({
			input,
			embedding,
			model: EMBEDDING_MODEL,
			dimensions: EMBEDDING_DIMENSIONS,
			tokensUsed: embedded.usage!.tokens!,
		});
		await this.embeddingRepository.getEntityManager().flush();

		return embeddingEntity;
	}
}
