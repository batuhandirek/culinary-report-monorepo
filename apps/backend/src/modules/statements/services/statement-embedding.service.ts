import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable, Logger, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';

import _ from 'lodash';

import { LlmBacklogRegistry } from 'src/modules/backlog/services/llm-backlog-registry.service.js';
import { EmbeddingsService } from 'src/modules/embeddings/services/embeddings.service.js';
import { accountErrorReason, errorChain } from 'src/modules/llm/util/provider-errors.js';
import { isFatalProviderError } from 'src/shared/util/pool.js';
import { toVectorLiteral } from 'src/shared/util/vector.js';

import {
	EMBEDDING_BATCH_CLAIMS,
	EMBEDDING_REQUEST_CLAIMS,
	STATEMENT_EMBEDDING_DIMENSIONS,
	STATEMENT_EMBEDDINGS_APPROVED_AT,
} from '../constants/embeddings.constant.js';

/** SQL: a statement (`s`) the embeddings backlog has still to embed: a claim with text and no vector */
export const EMBEDDING_PENDING_SQL = 's.text is not null and s.embedded_at is null';

/** Rows an update statement carries (each vector ~10 KB as text) */
const UPDATE_ROWS = 200;
/** Phrases of the Claims tables' "Similar to" kept in memory, so paging never embeds one again */
const PHRASE_CACHE = 200;

/**
 * The one writer of `Statement.embedding` / `embeddedAt`: every claim with text gets a vector of
 * its own (`text-embedding-3-large`, 1024 dimensions), through the `statement-embeddings` LLM
 * backlog (priority 60, after the re-reads), 2,000 claims a batch, most recent month first; new
 * claims get theirs the next night. The backlog waits (`waitsFor`) until the user approved the
 * spend (`STATEMENT_EMBEDDINGS_APPROVED_AT`). Also embeds
 * a search phrase for the Claims tables (`phraseVector`).
 */
@Injectable()
export class StatementEmbeddingService implements OnModuleInit {
	private readonly logger = new Logger(StatementEmbeddingService.name);
	private readonly phrases = new Map<string, number[]>();
	/** The user's yes to the spend; a field so tests can give it */
	approvedAt: Date | null = STATEMENT_EMBEDDINGS_APPROVED_AT;

	constructor(
		private readonly em: EntityManager,
		private readonly embeddingsService: EmbeddingsService,
		private readonly llmBacklogRegistry: LlmBacklogRegistry,
	) {}

	onModuleInit() {
		this.llmBacklogRegistry.register({
			key: 'statement-embeddings',
			label: 'Claim embeddings',
			priority: 60,
			remaining: () => this.countPending(),
			runBatch: async () => {
				const res = await this.embedPending({ limit: EMBEDDING_BATCH_CLAIMS });
				return { done: res.embedded, tokens: res.tokens };
			},
			waitsFor: () => this.waitsFor(),
		});
	}

	/** Why the backfill must not run yet, or null */
	async waitsFor(): Promise<string | null> {
		return this.approvedAt ? null : 'The spend is not approved yet (STATEMENT_EMBEDDINGS_APPROVED_AT)';
	}

	async countPending(): Promise<number> {
		const [row]: { n: number }[] = await this.em
			.getConnection()
			.execute(`select count(*)::int as n from statements s where ${EMBEDDING_PENDING_SQL}`);
		return row.n;
	}

	/**
	 * Embeds up to `limit` claims with text and no vector, most recent month first, in requests of
	 * `EMBEDDING_REQUEST_CLAIMS`, and writes each request's vectors as it returns, so a failure
	 * keeps what finished. A dish-only statement (no text) is never embedded.
	 */
	async embedPending(opts: { limit: number }): Promise<{ embedded: number; tokens: number }> {
		const rows: { id: number; text: string }[] = await this.em.getConnection().execute(
			`select s.id, s.text from statements s where ${EMBEDDING_PENDING_SQL}
			order by s.month desc nulls last, s.id asc limit ?`,
			[opts.limit],
		);
		let embedded = 0;
		let tokens = 0;
		for (const chunk of _.chunk(rows, EMBEDDING_REQUEST_CLAIMS)) {
			const res = await this.embeddingsService.embedManyUncached(
				chunk.map(r => r.text),
				{ dimensions: STATEMENT_EMBEDDING_DIMENSIONS },
			);
			tokens += res.tokens;
			await this.write(chunk.map((row, i) => ({ id: row.id, vector: res.embeddings[i] })));
			embedded += chunk.length;
		}
		if (rows.length) this.logger.log(`Embedded ${embedded} claims (${tokens} tokens)`);
		return { embedded, tokens };
	}

	/**
	 * The vector of a search phrase, at the claims' dimensions; the newest phrases are kept in
	 * memory. OpenAI refusing the account (no credits, a wrong key) answers 503 saying so: the
	 * page shows why "Similar to" is off rather than a bare 500.
	 */
	async phraseVector(phrase: string): Promise<number[]> {
		const key = phrase.trim().toLowerCase();
		const cached = this.phrases.get(key);
		if (cached) {
			this.phrases.delete(key);
			this.phrases.set(key, cached);
			return cached;
		}
		const { embeddings } = await this.embeddingsService
			.embedManyUncached([phrase.trim()], { dimensions: STATEMENT_EMBEDDING_DIMENSIONS })
			.catch((error: unknown) => {
				if (!errorChain(error).some(e => isFatalProviderError(e))) throw error;
				throw new ServiceUnavailableException(
					`Search by meaning is unavailable: ${accountErrorReason(error)}`,
				);
			});
		this.phrases.set(key, embeddings[0]);
		if (this.phrases.size > PHRASE_CACHE)
			this.phrases.delete(this.phrases.keys().next().value!);
		return embeddings[0];
	}

	private async write(rows: { id: number; vector: number[] }[]): Promise<void> {
		for (const chunk of _.chunk(rows, UPDATE_ROWS)) {
			const values = chunk
				.map(() => `(?::int, ?::halfvec(${STATEMENT_EMBEDDING_DIMENSIONS}))`)
				.join(', ');
			await this.em.getConnection().execute(
				`update statements s set embedding = v.embedding, embedded_at = now()
				from (values ${values}) as v(id, embedding) where s.id = v.id`,
				chunk.flatMap(row => [row.id, toVectorLiteral(row.vector)]),
			);
		}
	}
}
