import type { EntityManager } from '@mikro-orm/postgresql';

import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { BacklogRun } from 'src/modules/backlog/entities/backlog-run.entity.js';
import { LlmBacklogService } from 'src/modules/backlog/services/llm-backlog.service.js';
import { LlmBacklogRegistry } from 'src/modules/backlog/services/llm-backlog-registry.service.js';
import type { City } from 'src/modules/cities/entities/city.entity.js';
import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { EmbeddingsService } from 'src/modules/llm/services/embeddings.service.js';
import { PgBossService } from 'src/modules/pgboss/pgboss.service.js';
import { TopicService } from 'src/modules/topics/services/topic.service.js';
import { seedTopics } from 'src/modules/topics/tests/factories/topic.factory.js';
import { Review } from 'src/modules/venues/entities/review.entity.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { AdminStatementsController } from '../controllers/admin.statements.controller.js';
import type { AdminStatementsInputDto } from '../dto/admin-statements.dto.js';
import { StatementService } from '../services/statement.service.js';
import { StatementEmbeddingService } from '../services/statement-embedding.service.js';
import { StatementInsightService } from '../services/statement-insight.service.js';

import { addStatements } from './factories/statement.factory.js';

/** A 1024-long vector starting with the given values, zeros after */
const vec = (...lead: number[]) => [...lead, ...Array(1024 - lead.length).fill(0)];

/** What the mocked embedder answers per text; anything else points along a fifth axis */
const VECTORS: Record<string, number[]> = {
	'the fries arrived lukewarm': vec(1, 0.1),
	'the soup was cold': vec(0.9, 0.3),
	'friendly staff': vec(0, 1),
	'the burger was cold in the middle': vec(0.8, 0, 0.6),
	'they take cards': vec(0, 0, 0, 1),
	'cold food': vec(1, 0.15, 0.2),
};

/*
 * Claim embeddings: the `statement-embeddings` backlog (waiting for the user's yes only, not for
 * the re-read of posts, then embedding claims with text and no vector, newest month first, 1024 long,
 * dish-only statements skipped, tokens counted) and the Claims tables' `like` (ordered by cosine
 * distance with every other filter applied, claims without a vector left out and counted). The
 * embedder is mocked.
 */
describe('statement embeddings (pglite)', () => {
	let harness: PgliteTestingModule;
	let em: EntityManager;
	let city: City;
	let service: StatementEmbeddingService;
	let controller: AdminStatementsController;
	const registry = () => harness.moduleRef.get(LlmBacklogRegistry);
	const embedder = {
		embedMany: jest.fn(async (values: string[], opts: { dimensions: number }) => ({
			embeddings: values.map(v => VECTORS[v] ?? vec(0, 0, 0, 0, 1)),
			tokens: values.length * 5,
			opts,
		})),
	};
	const reread = { left: 3 };
	const vectors = async () =>
		Object.fromEntries(
			(
				(await em
					.getConnection()
					.execute(
						`select text, vector_dims(embedding) as dims, embedded_at is not null as stamped from statements order by id`,
					)) as { text: string | null; dims: number | null; stamped: boolean }[]
			).map(r => [r.text ?? '(dish only)', r.dims && r.stamped ? r.dims : null]),
		);
	const list = (query: Partial<AdminStatementsInputDto>) =>
		controller.listStatements({ cityId: city.id, page: 1, size: 50, ...query });

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				StatementService,
				StatementEmbeddingService,
				StatementInsightService,
				TopicService,
				AdminStatementsController,
				LlmBacklogRegistry,
				LlmBacklogService,
				{ provide: EmbeddingsService, useValue: embedder },
				{ provide: PgBossService, useValue: { sendJob: jest.fn() } },
			],
		});
		entityManagerManager.setEntityManager(harness.orm.em);
		em = harness.orm.em as EntityManager;
		service = harness.moduleRef.get(StatementEmbeddingService);
		controller = harness.moduleRef.get(AdminStatementsController);
		service.onModuleInit();
		// The posts' re-read, which the embeddings no longer wait for
		registry().register({
			key: 'reread-posts',
			label: 'Re-read posts as claims',
			priority: 35,
			remaining: async () => reread.left,
			runBatch: async () => ({ done: 0 }),
		});
		// The migration's index (the harness skips indexes): the HNSW on the vectors' prefix works here too
		await em
			.getConnection()
			.execute(
				'create index statements_embedding_prefix_hnsw_index on statements using hnsw ((subvector(embedding, 1, 256)::halfvec(256)) halfvec_cosine_ops)',
			);

		seedTopics(em, ['wait_for_food']);
		city = testCity(em, { name: 'Berlin', aliases: [] });
		const venue = em.create(Venue, { city, placeId: 'se-1', name: 'Imbiss' });
		await em.flush();
		const index = await harness.moduleRef.get(TopicService).index();
		const october = em.create(Review, {
			venue,
			reviewId: 'se-r1',
			text: 'Lukewarm fries, cold soup, friendly staff.',
			publishedAt: new Date('2026-10-05T12:00:00Z'),
		});
		const september = em.create(Review, {
			venue,
			reviewId: 'se-r2',
			text: 'Cold burger. Card payment works.',
			publishedAt: new Date('2026-09-05T12:00:00Z'),
		});
		addStatements(
			em,
			september,
			[
				{ text: 'the burger was cold in the middle', sentiment: 'negative' },
				{ text: 'they take cards', sentiment: 'neutral' },
			],
			{ index },
		);
		addStatements(
			em,
			october,
			[
				{ text: 'the fries arrived lukewarm', sentiment: 'negative' },
				{ text: 'the soup was cold', sentiment: 'negative' },
				{ text: 'friendly staff', sentiment: 'positive' },
				// A dish the review listed that no claim names: nothing to embed
				{ foods: ['Pommes'] },
			],
			{ index },
		);
		await em.flush();
		em.clear();
	});

	afterAll(async () => {
		await harness.stop();
	});

	beforeEach(() => {
		embedder.embedMany.mockClear();
	});

	it('is the `statement-embeddings` backlog: priority 60, the claims with text and no vector left', async () => {
		const backlog = registry().get('statement-embeddings')!;
		expect([backlog.label, backlog.priority]).toEqual(['Claim embeddings', 60]);
		expect(
			registry()
				.list()
				.map(b => b.key),
		).toEqual(['reread-posts', 'statement-embeddings']);
		expect(await backlog.remaining()).toBe(5);
	});

	it('waits for the yes to the spend only, not for the re-read of posts, and embeds nothing while it waits', async () => {
		service.approvedAt = null;
		expect(await service.waitsFor()).toBe(
			'The spend is not approved yet (STATEMENT_EMBEDDINGS_APPROVED_AT)',
		);

		const runs = await harness.moduleRef
			.get(LlmBacklogService)
			.drain({ now: () => new Date('2026-11-01T22:00:00Z') });
		const run = runs.find(r => r.key === 'statement-embeddings')!;
		expect([run.stopReason, run.error, run.batches, run.remaining]).toEqual([
			'waiting',
			'The spend is not approved yet (STATEMENT_EMBEDDINGS_APPROVED_AT)',
			0,
			5,
		]);
		expect(embedder.embedMany).not.toHaveBeenCalled();

		// Once approved it may run while posts are still being re-read
		service.approvedAt = new Date('2026-11-02T00:00:00Z');
		expect(reread.left).toBe(3);
		expect(await service.waitsFor()).toBeNull();
		reread.left = 0;
		await em.nativeDelete(BacklogRun, {});
	});

	it('embeds the newest month first, 1024 values a claim, and reports the tokens', async () => {
		expect(await service.embedPending({ limit: 3 })).toEqual({ embedded: 3, tokens: 15 });
		expect(embedder.embedMany).toHaveBeenCalledWith(
			['the fries arrived lukewarm', 'the soup was cold', 'friendly staff'],
			{ dimensions: 1024 },
		);
		expect(await vectors()).toEqual({
			'the burger was cold in the middle': null,
			'they take cards': null,
			'the fries arrived lukewarm': 1024,
			'the soup was cold': 1024,
			'friendly staff': 1024,
			'(dish only)': null,
		});
	});

	it('is drained by the nightly run once it may, and never embeds a dish-only statement', async () => {
		const runs = await harness.moduleRef
			.get(LlmBacklogService)
			.drain({ now: () => new Date('2026-11-02T22:00:00Z') });
		const run = runs.find(r => r.key === 'statement-embeddings')!;
		expect([run.stopReason, run.batches, run.done, run.tokens, run.remaining]).toEqual([
			'empty',
			1,
			2,
			10,
			0,
		]);
		expect(await vectors()).toEqual({
			'the burger was cold in the middle': 1024,
			'they take cards': 1024,
			'the fries arrived lukewarm': 1024,
			'the soup was cold': 1024,
			'friendly staff': 1024,
			'(dish only)': null,
		});
	});

	it('orders a `like` search by meaning, with every other filter applied, and counts what is not embedded', async () => {
		// One claim loses its vector: the search can't see it, and says so
		await em
			.getConnection()
			.execute(
				`update statements set embedding = null, embedded_at = null where text = 'they take cards'`,
			);

		const all = await list({ like: 'cold food' });
		expect(all.items.map(s => s.text)).toEqual([
			'the fries arrived lukewarm',
			'the soup was cold',
			'the burger was cold in the middle',
			'friendly staff',
		]);
		expect([all.totalItems, all.notEmbedded]).toEqual([4, 1]);

		const negative = await list({ like: 'cold food', sentiment: 'negative' });
		expect(negative.items.map(s => s.text)).toEqual([
			'the fries arrived lukewarm',
			'the soup was cold',
			'the burger was cold in the middle',
		]);
		expect(negative.notEmbedded).toBe(0);

		const october = await list({ like: 'cold food', month: '2026-10', page: 2, size: 2 });
		expect([october.items.map(s => s.text), october.totalItems]).toEqual([
			['friendly staff'],
			3,
		]);

		// The phrase was embedded once, at the claims' dimensions, whatever the page
		expect(embedder.embedMany).toHaveBeenCalledTimes(1);
		expect(embedder.embedMany).toHaveBeenCalledWith(['cold food'], {
			dimensions: 1024,
		});
	});

	it("orders Explore's claims by meaning too, through the prefix index, with the table's filters and pages", async () => {
		const insight = harness.moduleRef.get(StatementInsightService);
		const scope = { cityId: city.id, from: '2026-09', to: '2026-10' };
		const texts = (res: { items: { text?: string | null }[] }) => res.items.map(s => s.text);

		const all = await insight.claims(scope, { offset: 0, limit: 50, like: 'cold food' });
		expect(texts(all)).toEqual([
			'the fries arrived lukewarm',
			'the soup was cold',
			'the burger was cold in the middle',
			'friendly staff',
		]);
		expect([all.total, all.notEmbedded]).toEqual([4, 1]);

		const negative = await insight.claims(scope, {
			offset: 1,
			limit: 1,
			like: 'cold food',
			sentiment: 'negative',
		});
		expect([texts(negative), negative.total]).toEqual([['the soup was cold'], 3]);
	});

	it('keeps the newest first without `like`, and no count of the unembedded', async () => {
		const res = await list({});
		// October's claims, the newest row first (the dish-only one)
		expect(res.items.map(s => s.text ?? '(dish only)').slice(0, 3)).toEqual([
			'(dish only)',
			'friendly staff',
			'the soup was cold',
		]);
		expect(res.notEmbedded).toBeUndefined();
		expect(embedder.embedMany).not.toHaveBeenCalled();
	});

	it("finds a filter's claims behind more nearer claims outside it than the index scan's depth", async () => {
		// 900 September claims all nearer "cold food" than any October one: more than the scan's
		// `ef_search` (400), so a scan that stopped there would leave nothing once October is asked.
		// Each varies on its own in 20 values (`hashtext`, so the same every run): near-identical
		// vectors make an HNSW graph that never reaches the October claims at all
		const conn = em.getConnection();
		const zeros = Array(1001).fill(0).join(',');
		await conn.execute(
			`insert into statements (source_kind, review_id, subject, city_id, month, said_at, text, sentiment, embedding, embedded_at)
			select s.source_kind, s.review_id, s.subject, s.city_id, s.month, s.said_at, 'decoy ' || g, 'negative',
				('[1,0.15,0.2,' || (select string_agg(round((0.05 * (hashtext(g || ':' || k) % 1000) / 1000.0)::numeric, 4)::text, ',' order by k)
					from generate_series(1, 20) k) || ',${zeros}]')::halfvec(1024), now()
			from generate_series(1, 900) g, statements s where s.text = 'the burger was cold in the middle'`,
		);
		// PGlite runs one session: a small table would be scanned whole, so make the planner take the index
		await conn.execute('set enable_seqscan = off');
		try {
			const october = await list({ like: 'cold food', month: '2026-10' });
			expect([october.items.map(s => s.text), october.totalItems]).toEqual([
				['the fries arrived lukewarm', 'the soup was cold', 'friendly staff'],
				3,
			]);
			const explore = await harness.moduleRef
				.get(StatementInsightService)
				.claims(
					{ cityId: city.id, from: '2026-10', to: '2026-10' },
					{ offset: 0, limit: 50, like: 'cold food' },
				);
			expect(explore.items.map(s => s.text)).toEqual([
				'the fries arrived lukewarm',
				'the soup was cold',
				'friendly staff',
			]);
		} finally {
			await conn.execute('reset enable_seqscan');
			await conn.execute(`delete from statements where text like 'decoy %'`);
		}
	});
});
