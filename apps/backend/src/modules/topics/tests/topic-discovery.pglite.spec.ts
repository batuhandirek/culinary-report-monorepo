import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { LlmBacklogRegistry } from 'src/modules/backlog/services/llm-backlog-registry.service.js';
import type { City } from 'src/modules/cities/entities/city.entity.js';
import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { PgBossService } from 'src/modules/pgboss/pgboss.service.js';
import { Statement } from 'src/modules/statements/entities/statement.entity.js';
import { addStatements } from 'src/modules/statements/tests/factories/statement.factory.js';
import { FOODS_SQL, type StatementFood } from 'src/modules/statements/util/statement-foods.js';
import { Review } from 'src/modules/venues/entities/review.entity.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { mockAgent } from 'src/tests/mock-agent.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { TermTopicAgent } from '../agents/term-topic.agent.js';
import {
	type DiscoveryInputWording,
	TopicDiscoveryAgent,
} from '../agents/topic-discovery.agent.js';
import { Term } from '../entities/term.entity.js';
import { TopicRelinkJob } from '../jobs/topic-relink.job.js';
import { TermTopic } from '../entities/term-topic.entity.js';
import { Topic } from '../entities/topic.entity.js';
import { TermService } from '../services/term.service.js';
import { TopicService } from '../services/topic.service.js';
import { REGROUP_DAYS, TopicDiscoveryService } from '../services/topic-discovery.service.js';
import { TopicRelinkService } from '../services/topic-relink.service.js';

import { seedTopics } from './factories/topic.factory.js';

/** Agent D's groups for a call, worked out from the wordings it was sent (by name) */
type Groups = (wordings: DiscoveryInputWording[]) => object[];

/*
 * Topic discovery: wordings no topic is the same thing as are grouped into topics: a finer one is
 * created live under its parent (above the floors) and linked first, the wording's old links kept;
 * an existing one is linked, never duplicated; every wording sent is stamped, and grouped again after
 * `REGROUP_DAYS`. A finer topic never takes counts from its parent: the food readers count parents.
 */
describe('TopicDiscoveryService (pglite)', () => {
	let harness: PgliteTestingModule;
	let city: City;
	let venue: Venue;
	let groups: Groups = () => [];
	const pgBoss = { sendJob: jest.fn(async (..._args: unknown[]) => 'job-id') };
	const discoveryAgent = mockAgent((input: unknown) => {
		const { wordings } = JSON.parse(input as string) as { wordings: DiscoveryInputWording[] };
		return { groups: groups(wordings) };
	});
	const em = () => harness.orm.em;
	const service = () => harness.moduleRef.get(TopicDiscoveryService);
	const ids = (wordings: DiscoveryInputWording[], ...names: string[]) =>
		wordings.filter(w => names.includes(w.name)).map(w => ({ id: w.id, relation: 'same' }));

	let n = 0;
	/**
	 * `count` reviews of the venue, each naming `name` in one claim; the term decided by agent C as
	 * `links` (none given: a seed alias keeps its admin decision, a new wording is agent C's "none")
	 */
	const said = async (
		name: string,
		count: number,
		links?: [string, 'same' | 'kind_of' | 'with'][],
	) => {
		const index = await harness.moduleRef.get(TopicService).index();
		// Known wordings (the seed's aliases) into the unit of work, so the factory reuses them
		await em().find(Term, {});
		for (let i = 0; i < count; i++) {
			const review = em().create(Review, {
				venue,
				reviewId: `td-${n++}`,
				publishedAt: new Date('2026-09-10T12:00:00Z'),
			});
			addStatements(
				em(),
				review,
				[{ text: `the ${name} was great`, sentiment: 'positive', foods: [name] }],
				{ index },
			);
		}
		await em().flush();
		const term = await em().findOneOrFail(Term, { name }, { populate: ['topics'] });
		if (links || term.decidedBy !== 'admin') {
			term.topics.removeAll();
			(links ?? []).forEach(([key, relation], rank) =>
				term.topics.add(
					em().create(TermTopic, {
						term,
						topic: em().getReference(Topic, index.get(key)!.id!),
						rank,
						relation,
					}),
				),
			);
			term.decidedBy = 'ai';
			term.decidedAt = new Date();
		}
		await em().flush();
		return term;
	};
	const linksOf = async (name: string) => {
		const rows: { key: string; relation: string }[] = await em()
			.getConnection()
			.execute(
				`select x.key, tt.relation from terms t join term_topics tt on tt.term_id = t.id join topics x on x.id = tt.topic_id
				where t.name = ? order by tt.rank`,
				[name],
			);
		return rows.map(r => [r.key, r.relation]);
	};

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				TopicDiscoveryService,
				TermService,
				TopicService,
				TopicRelinkService,
				LlmBacklogRegistry,
				{ provide: PgBossService, useValue: pgBoss },
				{ provide: TermTopicAgent, useValue: mockAgent({ terms: [] }) },
				{ provide: TopicDiscoveryAgent, useValue: discoveryAgent },
			],
		});
		entityManagerManager.setEntityManager(harness.orm.em);
		service().onModuleInit();
		seedTopics(em(), ['burgers', 'kebab', 'sandwiches']);
		city = testCity(em());
		venue = em().create(Venue, { city, placeId: 'td-venue', name: 'Burger Bros' });
		await em().flush();
	});

	afterAll(async () => {
		await harness.stop();
	});

	beforeEach(async () => {
		groups = () => [];
		discoveryAgent.generate.mockClear();
		em().clear();
		await em().nativeDelete(Statement, {});
		await em().nativeDelete(Review, {});
		await em().nativeDelete(Term, { decidedBy: { $ne: 'admin' } });
		await em().nativeDelete(Topic, { discoveredAt: { $ne: null } });
		venue = await em().findOneOrFail(Venue, { placeId: 'td-venue' });
	});

	it("leaves a failed call's wordings ungrouped, so the next batch sends them again", async () => {
		await said('falafel wrap', 3, [['sandwiches', 'kind_of']]);
		discoveryAgent.generate.mockImplementationOnce(async () => {
			throw new Error('rate limited');
		});
		const res = await service().discover({ limit: 50 });
		expect(res).toMatchObject({ looked: 0, linked: 0 });
		em().clear();
		const term = await em().findOneOrFail(Term, { name: 'falafel wrap' });
		expect(term.groupedAt ?? null).toBeNull();
		expect(await service().countCandidates()).toBe(1);
		// Answered the next time: stamped
		expect((await service().discover({ limit: 50 })).looked).toBe(1);
		expect(await service().countCandidates()).toBe(0);
	});

	it("creates a finer topic under its parent, links its wordings first and keeps their old links (an admin's too), and a child still counts for its parent", async () => {
		// The seed's alias of Burgers (an admin's), and a wording agent C linked as a kind of burger
		await said('smash burger', 10);
		await said('smashed burger', 6, [['burgers', 'kind_of']]);
		groups = w => [
			{
				existing: null,
				label: 'Smash burgers',
				kind: 'dish',
				parent: 'burgers',
				wordings: ids(w, 'smash burger', 'smashed burger'),
			},
		];
		expect(await service().countCandidates()).toBe(2);
		const res = await service().discover({ limit: 50 });
		expect(res).toMatchObject({
			looked: 2,
			created: ['Smash burgers'],
			linked: 2,
			belowFloor: 0,
		});
		em().clear();
		const topic = await em().findOneOrFail(
			Topic,
			{ label: 'Smash burgers' },
			{ populate: ['parent'] },
		);
		expect([topic.kind, topic.parent?.key, !!topic.discoveredAt]).toEqual([
			'dish',
			'burgers',
			true,
		]);
		expect(await linksOf('smashed burger')).toEqual([
			[topic.key, 'same'],
			['burgers', 'kind_of'],
		]);
		expect(await linksOf('smash burger')).toEqual([
			[topic.key, 'same'],
			['burgers', 'same'],
		]);
		expect((await em().findOneOrFail(Term, { name: 'smash burger' })).decidedBy).toBe('admin');
		// One re-link for the batch, queued after its writes (none per topic: it would run beside them)
		expect(pgBoss.sendJob).toHaveBeenCalledTimes(1);
		expect(pgBoss.sendJob).toHaveBeenCalledWith(TopicRelinkJob.jobName, expect.anything(), expect.anything());
		// Stamped: a candidate again only once REGROUP_DAYS have passed (the data grows)
		expect(await service().countCandidates()).toBe(0);
		expect(
			await service().countCandidates(
				new Date(Date.now() + (REGROUP_DAYS + 1) * 24 * 3600 * 1000),
			),
		).toBe(2);

		// A wording linked to the child alone still counts for the parent (two levels up, `via` the child)
		const term = await em().findOneOrFail(Term, { name: 'smashed burger' });
		await em()
			.getConnection()
			.execute('delete from term_topics where term_id = ? and topic_id <> ?', [
				term.id,
				topic.id,
			]);
		const [{ foods }]: { foods: StatementFood[] }[] = await em()
			.getConnection()
			.execute(
				`select ${FOODS_SQL('st.id = s.id')} as foods from statements s join statement_parts p on p.statement_id = s.id join terms t on t.id = p.term_id where t.name = 'smashed burger' limit 1`,
			);
		expect(foods[0].topics.map(x => [x.key, x.relation, x.via ?? null])).toEqual([
			[topic.key, 'same', null],
			['burgers', 'same', topic.key],
		]);
	});

	it('creates nothing below the floors, links a group to an existing topic, and never makes a twin of one', async () => {
		await said('crispy sando', 2, [['sandwiches', 'kind_of']]);
		await said('döner teller', 3, []);
		await said('burger', 4, []);
		groups = w => [
			{
				existing: null,
				label: 'Crispy sandos',
				kind: 'dish',
				parent: 'sandwiches',
				wordings: ids(w, 'crispy sando'),
			},
			{
				existing: 'kebab',
				label: null,
				kind: null,
				parent: null,
				wordings: ids(w, 'döner teller'),
			},
			{
				existing: null,
				label: 'Burgers',
				kind: 'dish',
				parent: null,
				wordings: ids(w, 'burger'),
			},
		];
		const res = await service().discover({ limit: 50 });
		expect(res).toMatchObject({ looked: 3, created: [], linked: 2, belowFloor: 1 });
		expect(await linksOf('crispy sando')).toEqual([['sandwiches', 'kind_of']]);
		expect(await linksOf('döner teller')).toEqual([['kebab', 'same']]);
		expect(await linksOf('burger')).toEqual([['burgers', 'same']]);
		expect(await em().count(Topic, { discoveredAt: { $ne: null } })).toBe(0);
	});

	it('is the `topic-discovery` backlog, and a strict reader counts only the same thing', async () => {
		await said('veggie burger', 3, [['burgers', 'kind_of']]);
		const backlog = harness.moduleRef.get(LlmBacklogRegistry).get('topic-discovery')!;
		expect([backlog.label, backlog.priority, await backlog.remaining()]).toEqual([
			'New topics from wordings',
			30,
			1,
		]);
		expect(await backlog.runBatch()).toMatchObject({ done: 1 });
		expect(await backlog.remaining()).toBe(0);
		const [{ broad, strict }]: { broad: StatementFood[]; strict: StatementFood[] }[] =
			await em()
				.getConnection()
				.execute(
					`select ${FOODS_SQL('st.id = s.id')} as broad, ${FOODS_SQL('st.id = s.id', 'strict')} as strict
				from statements s join statement_parts p on p.statement_id = s.id join terms t on t.id = p.term_id
				where t.name = 'veggie burger' limit 1`,
				);
		expect([broad[0].topics.map(x => x.key), strict[0].topics.map(x => x.key)]).toEqual([
			['burgers'],
			[],
		]);
	});
});
