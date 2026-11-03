import { BadRequestException, NotFoundException } from '@nestjs/common';

import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { LlmBacklogRegistry } from 'src/modules/backlog/services/llm-backlog-registry.service.js';
import type { City } from 'src/modules/cities/entities/city.entity.js';
import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { PgBossService } from 'src/modules/pgboss/pgboss.service.js';
import { StatementPart } from 'src/modules/statements/entities/statement-part.entity.js';
import { addStatements } from 'src/modules/statements/tests/factories/statement.factory.js';
import { Review } from 'src/modules/venues/entities/review.entity.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { venueFactory } from 'src/modules/venues/tests/factories/venue.factory.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { mockAgent } from 'src/tests/mock-agent.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import {
	TermTopicAgent,
	type TermTopicContext,
	type TermTopicInputTopic,
} from '../agents/term-topic.agent.js';
import { AdminTermsController } from '../controllers/admin.terms.controller.js';
import { Term } from '../entities/term.entity.js';
import { Topic, TopicKindEnum } from '../entities/topic.entity.js';
import { TermService } from '../services/term.service.js';
import { TopicService } from '../services/topic.service.js';
import { TopicRelinkService } from '../services/topic-relink.service.js';

import { seedTopics } from './factories/topic.factory.js';

/** The relation the agent answers for a wording's topic when it is no `same` */
const RELATIONS: Record<string, Record<string, 'kind_of' | 'with'>> = {
	'vegan döner': { kebab: 'kind_of', vegan: 'with' },
	'tofu döner': { kebab: 'kind_of', vegan: 'with' },
};
/** What the agent answers for a wording, by its spelling (lower case): the topics it is, or none with a suggestion */
const ANSWERS: Record<string, { topics: string[]; suggestion: string | null }> = {
	spaghettiiiossso: { topics: ['pasta'], suggestion: null },
	// A compound: two topics, the dish first
	'vegan döner': { topics: ['kebab', 'vegan'], suggestion: null },
	'tofu döner': { topics: ['kebab', 'vegan'], suggestion: null },
	pommes: { topics: [], suggestion: 'Fries' },
	sauce: { topics: [], suggestion: 'Sauces' },
	// A suggestion naming a topic it passed over
	nudelsalat: { topics: [], suggestion: 'Pasta' },
	// A Google tag that is an aspect
	'waiting time': { topics: ['wait'], suggestion: null },
	'cheese counter': { topics: [], suggestion: null },
	// An unknown key and a label answered for keys
	'smashed patty': { topics: ['nonsense', 'Burgers'], suggestion: null },
	pho: { topics: [], suggestion: 'Pho' },
	'tip prompt': { topics: ['tip_prompts'], suggestion: null },
	'lahmacun deluxe': { topics: ['kebab'], suggestion: null },
};

/*
 * Every wording seen (`Term`) and the topics each is (`TermTopic`): stored as agent B reads a
 * claim's food wordings (`ensure`) and from the venues' Google tags (`sync`), decided by a name
 * match, the agent (the `terms` backlog) or an admin, re-decided when topics change, part of the
 * index every reader resolves text with. A statement's food part points at its term and takes the
 * term's links at read time: a decision moves every statement naming the wording at once.
 */
describe('TermService (pglite)', () => {
	let harness: PgliteTestingModule;
	let city: City;
	let hamburg: City;
	let venue: Venue;
	const pgBoss = { sendJob: jest.fn(async (..._args: unknown[]) => 'job-id') };
	/** The topics the agent was offered on its last call, and the wordings asked since the case began (one a call) */
	let offered: TermTopicInputTopic[] = [];
	let asked: string[] = [];
	const agent = mockAgent((message: unknown, context: unknown) => {
		const name = JSON.parse((message as string).replace(/^Wording: /, '')) as string;
		offered = (context as TermTopicContext).topics;
		asked.push(name);
		const answer = ANSWERS[name.toLowerCase()] ?? { topics: [], suggestion: null };
		return {
			suggestion: answer.suggestion,
			topics: answer.topics.map(key => ({
				key,
				relation: RELATIONS[name.toLowerCase()]?.[key] ?? 'same',
			})),
		};
	});

	const em = () => harness.orm.em;
	const service = () => harness.moduleRef.get(TermService);
	const topicService = () => harness.moduleRef.get(TopicService);
	const relinkAll = () => harness.moduleRef.get(TopicRelinkService).relinkAll();
	const topic = (key: string) => em().findOneOrFail(Topic, { key });

	let n = 0;
	const review = () =>
		em().create(Review, {
			venue,
			reviewId: `tm-${n++}`,
			publishedAt: new Date('2026-09-10T12:00:00Z'),
			stars: 5,
			text: 'Spaghettiiiossso was extraordinary',
		});

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				TermService,
				TopicService,
				TopicRelinkService,
				LlmBacklogRegistry,
				AdminTermsController,
				{ provide: PgBossService, useValue: pgBoss },
				{ provide: TermTopicAgent, useValue: agent },
			],
		});
		entityManagerManager.setEntityManager(harness.orm.em);
		// Registers the backlog and the re-linker as at module init
		service().onModuleInit();
		// Kinds of food of every kind, with their parents, and two aspect roots
		seedTopics(em(), [
			'burgers',
			'kebab',
			'pasta',
			'vegan',
			'breakfast',
			'cafe',
			'wait',
			'payment',
		]);
		city = testCity(em());
		hamburg = testCity(em(), { name: 'Hamburg' });
		// Google's "people often mention" tags, as Google writes them
		venue = venueFactory.build(
			{
				name: 'Trattoria Eck',
				category: 'Italian restaurant',
				details: {
					reviewsTags: [
						{ title: 'waiting time', count: 3 },
						{ title: 'cheese counter', count: 2 },
						{ title: 'Dürüm', count: 7 },
						{ title: 'Café', count: 1 },
					],
				},
			},
			{ associations: { city } },
		);
		venueFactory.build(
			{ name: 'Imbiss Eck', details: { reviewsTags: [{ title: 'waiting time', count: 1 }] } },
			{ associations: { city } },
		);
		venueFactory.build(
			{
				name: 'Pho Hafen',
				details: {
					reviewsTags: [
						{ title: 'waiting time', count: 2 },
						{ title: 'Pho', count: 5 },
					],
				},
			},
			{ associations: { city: hamburg } },
		);
		await em().flush();

		// As agent B stores them: each wording a term, linked at once when the index knows it as a
		// whole ("Dürüm" is the seed's alias, "Burgers" and "Italian food" are topics), the rest waiting
		const index = await topicService().index();
		addStatements(
			em(),
			review(),
			[
				{
					text: 'Spaghettiiiossso was extraordinary',
					sentiment: 'positive',
					foods: ['Spaghettiiiossso'],
				},
				{ foods: ['Dürüm'], sentiment: 'positive' },
				{ foods: ['Pommes'], sentiment: 'negative' },
				{ foods: ['sauce'], sentiment: 'neutral' },
			],
			{ index },
		);
		addStatements(
			em(),
			review(),
			['pommes', 'vegan döner', 'Italian food', 'nudelsalat', 'Burgers', 'smashed patty'].map(
				name => ({
					foods: [name],
					sentiment: 'positive' as const,
				}),
			),
			{ index },
		);
		await em().flush();
	});

	afterAll(async () => {
		await harness.stop();
	});

	// A fresh unit of work each case: the service and the cases share the entity manager
	beforeEach(() => {
		em().clear();
		asked = [];
	});

	/** Every food part's term, with the topics the statements' readers see through its links today (rank order) */
	const topicsOfParts = async (): Promise<Record<string, string[]>> => {
		const rows: { key: string; topics: string[] | null }[] = await em()
			.getConnection()
			.execute(
				`select t.key, (select array_agg(x.key order by tt.rank) from term_topics tt join topics x on x.id = tt.topic_id where tt.term_id = t.id) as topics
				from statement_parts p join terms t on t.id = p.term_id where p.role = 'food' group by t.id, t.key order by t.key`,
			);
		return Object.fromEntries(rows.map(r => [r.key, r.topics ?? []]));
	};
	/** Every stored wording by key: its spelling, its topics in rank order, who decided it and the suggestion */
	const terms = async () => {
		const rows = await em()
			.fork()
			.find(Term, {}, { populate: ['topics', 'topics.topic'], orderBy: { key: 'asc' } });
		return new Map(
			rows.map(t => [
				t.key,
				{
					name: t.name,
					topics: t.topics.getItems().map(l => l.topic.key),
					decidedBy: t.decidedBy ?? null,
					suggestion: t.suggestion ?? null,
				},
			]),
		);
	};
	const decisions = async (keys: string[]) => {
		const all = await terms();
		return Object.fromEntries(
			keys.map(key => {
				const t = all.get(key);
				return [key, t ? [t.topics, t.decidedBy, t.suggestion] : undefined];
			}),
		);
	};
	const termId = async (key: string) => (await em().fork().findOneOrFail(Term, { key })).id;
	const aliasesOf = async (t: Topic) => (await service().aliasesOf([t.id])).get(t.id)!;

	it("stores each wording once — a statement's as first spelled, a tag as Google writes it — decided by a name match where it is a topic as a whole, the rest waiting", async () => {
		const index = await topicService().index();
		// The statements' wordings the index did not know
		expect(await service().countPending()).toBe(6);
		// The tags: "waiting time", "cheese counter", "Café" and "Pho" are new ("Dürüm" has its term), "Café" is a topic as a whole
		expect(await service().sync(index)).toEqual({ added: 4, matched: 1 });
		expect(
			await decisions([
				'spaghettiiiossso',
				'durum',
				'pomme',
				'sauce',
				'vegan doner',
				'italian food',
				'nudelsalat',
				'burger',
				'smashed patty',
				'waiting time',
				'cheese counter',
				'cafe',
				'pho',
			]),
		).toEqual({
			spaghettiiiossso: [[], null, null],
			durum: [['kebab'], 'admin', null],
			pomme: [[], null, null],
			sauce: [[], null, null],
			'vegan doner': [[], null, null],
			// The label and the key as a whole, whatever the kind
			'italian food': [['italian'], 'match', null],
			burger: [['burgers'], 'match', null],
			cafe: [['cafe'], 'match', null],
			nudelsalat: [[], null, null],
			'smashed patty': [[], null, null],
			'waiting time': [[], null, null],
			'cheese counter': [[], null, null],
			pho: [[], null, null],
		});
		const stored = await terms();
		// The spelling first seen: "Pommes" and "pommes" are one wording
		expect(stored.get('pomme')!.name).toBe('Pommes');
		expect(stored.get('burger')!.name).toBe('Burgers');
		// A tag as Google writes it
		expect(stored.get('waiting time')!.name).toBe('waiting time');
		expect(stored.get('cafe')!.name).toBe('Café');
		expect(await service().countPending()).toBe(9);
		// The statements naming a matched wording see its topics through the links, whatever the kind
		const parts = await topicsOfParts();
		expect([parts['burger'], parts['italian food'], parts['durum'], parts['pomme']]).toEqual([
			['burgers'],
			['italian'],
			['kebab'],
			[],
		]);
		// Idempotent
		expect(await service().sync(index)).toEqual({ added: 0, matched: 0 });
	});

	it('decides the waiting wordings once in the backlog, the most named first: lists of topics of any kind in rank order, suggestions kept unless they name a topic, every statement following', async () => {
		// A batch of one takes the wording the most statements name: "Pommes", two food parts
		expect(await service().decide({ limit: 1 })).toEqual({ looked: 1, linked: 0, tokens: 0, usd: 0 });
		expect(asked).toEqual(['Pommes']);

		const registry = harness.moduleRef.get(LlmBacklogRegistry);
		expect(registry.list().map(b => [b.key, b.priority])).toEqual([['terms', 25]]);
		const backlog = registry.get('terms')!;
		expect(await backlog.remaining()).toBe(8);
		asked = [];
		expect(await backlog.runBatch()).toEqual({ done: 8, tokens: 0 });

		// Every topic of every kind offered, with its parent
		expect([...new Set(offered.map(t => t.kind))].sort()).toEqual([
			'aspect',
			'cuisine',
			'diet',
			'dish',
			'format',
			'meal',
		]);
		expect(offered.find(t => t.key === 'pasta')).toEqual({
			key: 'pasta',
			label: 'Pasta',
			kind: 'dish',
			parent: 'italian',
		});
		expect(offered.find(t => t.key === 'wait')).toEqual({
			key: 'wait',
			label: 'Waiting',
			kind: 'aspect',
		});
		expect(asked).toHaveLength(8);
		expect(asked).toEqual(
			expect.arrayContaining([
				'Spaghettiiiossso',
				'vegan döner',
				'waiting time',
				'cheese counter',
				'Pho',
			]),
		);

		expect(
			await decisions([
				'spaghettiiiossso',
				'vegan doner',
				'pomme',
				'sauce',
				'nudelsalat',
				'waiting time',
				'cheese counter',
				'smashed patty',
				'pho',
			]),
		).toEqual({
			spaghettiiiossso: [['pasta'], 'ai', null],
			'vegan doner': [['kebab', 'vegan'], 'ai', null],
			pomme: [[], 'ai', 'Fries'],
			sauce: [[], 'ai', 'Sauces'],
			// Its suggestion named a topic it passed over: dropped
			nudelsalat: [[], 'ai', null],
			'waiting time': [['wait'], 'ai', null],
			'cheese counter': [[], 'ai', null],
			// The label counted, the unknown key dropped
			'smashed patty': [['burgers'], 'ai', null],
			pho: [[], 'ai', 'Pho'],
		});
		// One link per topic, ranked as answered
		expect(
			await em()
				.getConnection()
				.execute<{ key: string; rank: number }[]>(
					`select x.key, tt.rank from term_topics tt join terms t on t.id = tt.term_id join topics x on x.id = tt.topic_id
					where t.key = 'vegan doner' order by tt.rank`,
				),
		).toEqual([
			{ key: 'kebab', rank: 0 },
			{ key: 'vegan', rank: 1 },
		]);
		// What every statement's food part is about now: its wording's links, no row rewritten
		expect(await topicsOfParts()).toEqual({
			spaghettiiiossso: ['pasta'],
			durum: ['kebab'],
			pomme: [],
			sauce: [],
			'vegan doner': ['kebab', 'vegan'],
			'italian food': ['italian'],
			nudelsalat: [],
			burger: ['burgers'],
			'smashed patty': ['burgers'],
		});
		// Each asked once
		expect(await service().countPending()).toBe(0);
		expect(await service().decide({ limit: 100 })).toEqual({ looked: 0, linked: 0, tokens: 0, usd: 0 });
		// One call a wording: Pommes, then the batch's eight
		expect(agent.generate).toHaveBeenCalledTimes(9);
	});

	it('gives the index every decision: an alias, a compound to both topics, a tag to its aspect, a "none" to nothing', async () => {
		const index = await topicService().index();
		expect(index.resolve('Frühstück')).toEqual(['breakfast']);
		expect(index.exactAll('vegan döner')).toEqual(['kebab', 'vegan']);
		expect(index.resolve('Vegan Döner Haus')).toEqual(['kebab', 'vegan']);
		expect(index.resolveMenuItem({ name: 'Vegan Döner', category: null })).toEqual([
			'kebab',
			'vegan',
		]);
		expect(index.exactAll('waiting time')).toEqual(['wait']);
		expect(index.exactAll('Spaghettiiiossso')).toEqual(['pasta']);
		// A wording decided none takes no form
		expect(index.exactAll('cheese counter')).toEqual([]);
	});

	it("names the topic each of Google's tags is: a decided wording's first topic that is no kind of place, else the index as a whole", async () => {
		const tags = await service().reviewTagTopics([
			'Dürüm',
			'waiting time',
			'cheese counter',
			'Café',
			'vegan döner',
			'Chicken Döner',
			'Döner',
		]);
		expect([...tags]).toEqual([
			['Dürüm', { key: 'kebab', label: 'Döner & kebab' }],
			['waiting time', { key: 'wait', label: 'Waiting' }],
			['vegan döner', { key: 'kebab', label: 'Döner & kebab' }],
			// Not a term: the topic it names as a whole, never split into words
			['Döner', { key: 'kebab', label: 'Döner & kebab' }],
		]);
		expect(await service().reviewTagTopics([])).toEqual(new Map());
	});

	it("lists a city's wordings with the statements naming them and the venues whose tags carry them, and filters by status, topic and suggestion", async () => {
		const all = await service().list(city.id, { status: 'all', offset: 0, limit: 50 });
		expect(all.summary).toEqual({
			terms: 12,
			uses: 15,
			linkedTerms: 8,
			linkedUses: 10,
			pendingTerms: 0,
		});
		expect(all.suggestions).toEqual([
			{ label: 'Fries', terms: 1, uses: 2, examples: ['Pommes'] },
			{ label: 'Sauces', terms: 1, uses: 1, examples: ['sauce'] },
		]);
		expect(all.total).toBe(12);
		// Most used first: statements and tag venues together
		expect(all.terms.slice(0, 3).map(t => [t.key, t.notes, t.tagVenues])).toEqual([
			['durum', 1, 1],
			['pomme', 2, 0],
			['waiting time', 0, 2],
		]);
		expect(all.terms.find(t => t.key === 'waiting time')).toMatchObject({
			name: 'waiting time',
			topics: [{ key: 'wait', label: 'Waiting', kind: 'aspect' }],
			decidedBy: 'ai',
		});
		expect(all.terms.find(t => t.key === 'vegan doner')!.topics.map(t => t.key)).toEqual([
			'kebab',
			'vegan',
		]);

		// Unlinked by default: decided, no topic
		const controller = harness.moduleRef.get(AdminTermsController);
		expect((await controller.getTerms({ cityId: city.id })).terms.map(t => t.key)).toEqual([
			'pomme',
			'cheese counter',
			'nudelsalat',
			'sauce',
		]);
		const keys = async (
			filters: Omit<Parameters<TermService['list']>[1], 'offset' | 'limit'>,
		) =>
			(await service().list(city.id, { ...filters, offset: 0, limit: 50 })).terms.map(
				t => t.key,
			);
		expect(await keys({ status: 'linked', topicKey: 'kebab' })).toEqual([
			'durum',
			'vegan doner',
		]);
		expect(await keys({ status: 'all', suggestion: 'fries' })).toEqual(['pomme']);
		// A suggestion matches across plurals
		expect(await keys({ status: 'all', suggestion: 'Sauce' })).toEqual(['sauce']);
		expect(await keys({ status: 'all', q: 'vegan' })).toEqual(['vegan doner']);
		expect(await keys({ status: 'pending' })).toEqual([]);
		const page = await service().list(city.id, { status: 'all', offset: 1, limit: 2 });
		expect([page.total, page.terms.map(t => t.key)]).toEqual([12, ['pomme', 'waiting time']]);

		// The other city: its own tags only
		const other = await service().list(hamburg.id, { status: 'all', offset: 0, limit: 50 });
		expect(other.summary).toEqual({
			terms: 2,
			uses: 2,
			linkedTerms: 1,
			linkedUses: 1,
			pendingTerms: 0,
		});
		expect(other.suggestions).toEqual([{ label: 'Pho', terms: 1, uses: 1, examples: ['Pho'] }]);
	});

	it("takes an admin's decision — topics of any kind in the order given, none, or back to automatic — which every statement naming the wording follows", async () => {
		const controller = harness.moduleRef.get(AdminTermsController);
		const nudelsalat = await termId('nudelsalat');
		expect(
			await controller.changeTerm(nudelsalat, { topicKeys: ['pasta', 'italian'] }),
		).toEqual({
			id: nudelsalat,
			key: 'nudelsalat',
			name: 'nudelsalat',
			topics: [
				{ key: 'pasta', label: 'Pasta', kind: 'dish' },
				{ key: 'italian', label: 'Italian', kind: 'cuisine' },
			],
			decidedBy: 'admin',
		});
		expect((await topicsOfParts()).nudelsalat).toEqual(['pasta', 'italian']);

		// An admin's "none" drops the suggestion
		const sauce = await termId('sauce');
		expect(await controller.changeTerm(sauce, { topicKeys: [] })).toMatchObject({
			topics: [],
			decidedBy: 'admin',
		});
		expect((await terms()).get('sauce')).toMatchObject({
			topics: [],
			decidedBy: 'admin',
			suggestion: null,
		});
		await expect(service().change(sauce, { topicKeys: ['nope'] })).rejects.toThrow(
			BadRequestException,
		);
		await expect(service().change(sauce, { topicKeys: ['nope'] })).rejects.toThrow(
			'No topic "nope"',
		);
		await expect(service().change(999_999, { auto: true })).rejects.toThrow(NotFoundException);

		// Back to automatic: the name match where there is one, else waiting for the agent
		const italian = await termId('italian food');
		await service().change(italian, { topicKeys: ['pasta'] });
		expect((await topicsOfParts())['italian food']).toEqual(['pasta']);
		expect(await controller.changeTerm(italian, { auto: true })).toMatchObject({
			topics: [{ key: 'italian' }],
			decidedBy: 'match',
		});
		expect((await topicsOfParts())['italian food']).toEqual(['italian']);
		expect(await controller.changeTerm(sauce, { auto: true })).not.toHaveProperty('decidedBy');
		expect(await service().countPending()).toBe(1);
		await service().change(sauce, { topicKeys: [] });
		expect(await service().countPending()).toBe(0);
	});

	it('re-links after topics change: a new topic takes the wordings that suggested it, the agent\'s other "none" answers wait again, admins\' and matches stay', async () => {
		pgBoss.sendJob.mockClear();
		await topicService().create({ label: 'Fries', kind: TopicKindEnum.DISH });
		expect(pgBoss.sendJob).toHaveBeenCalledTimes(1);
		// What the job runs: "pommes" takes Fries; "cheese counter" and "pho" (none, decided before Fries) wait again
		expect((await relinkAll()).terms).toEqual({
			added: 0,
			matched: 0,
			bySuggestion: 1,
			dropped: 0,
			reopened: 2,
		});
		expect(
			await decisions([
				'pomme',
				'cheese counter',
				'pho',
				'nudelsalat',
				'sauce',
				'durum',
				'burger',
			]),
		).toEqual({
			pomme: [['fries'], 'ai', null],
			'cheese counter': [[], null, null],
			pho: [[], null, 'Pho'],
			nudelsalat: [['pasta', 'italian'], 'admin', null],
			sauce: [[], 'admin', null],
			durum: [['kebab'], 'admin', null],
			burger: [['burgers'], 'match', null],
		});
		// Both statements naming "Pommes" are about fries now
		expect((await topicsOfParts()).pomme).toEqual(['fries']);
		// Asked again
		expect(await service().countPending()).toBe(2);
		expect(await service().decide({ limit: 100 })).toMatchObject({ looked: 2, linked: 0 });
	});

	it('re-links after topics change: a new wording that is a topic takes it, a suggestion of an older topic is dropped, and a match whose topic is gone waits again', async () => {
		// Pretend the agent had answered none for "cheese counter" suggesting a topic that existed, before the next topic
		const burgersAt = (await topic('burgers')).createdAt.getTime();
		await em()
			.fork()
			.nativeUpdate(
				Term,
				{ key: 'cheese counter' },
				{ suggestion: 'Burgers', decidedBy: 'ai', decidedAt: new Date(burgersAt + 1) },
			);
		em().clear();
		// A new topic, and Google tags a venue with it
		const hummus = await topicService().create({ label: 'Hummus', kind: TopicKindEnum.DISH });
		const imbiss = await em().findOneOrFail(Venue, { name: 'Imbiss Eck' });
		imbiss.details = {
			...imbiss.details,
			reviewsTags: [...(imbiss.details?.reviewsTags ?? []), { title: 'Hummus', count: 4 }],
		};
		await em().flush();
		expect((await relinkAll()).terms).toEqual({
			added: 1,
			matched: 0,
			bySuggestion: 0,
			dropped: 1,
			reopened: 2,
		});
		expect(await decisions(['hummus', 'cheese counter', 'pho'])).toEqual({
			hummus: [['hummus'], 'match', null],
			'cheese counter': [[], null, null],
			pho: [[], null, 'Pho'],
		});
		expect((await terms()).get('hummus')!.name).toBe('Hummus');
		expect(await service().decide({ limit: 100 })).toMatchObject({ looked: 2 });

		// The topic gone (in the database: the service never deletes a kind of food): its match waits for the agent again
		await em().fork().nativeDelete(Topic, { id: hummus.id });
		em().clear();
		expect((await relinkAll()).terms).toEqual({
			added: 0,
			matched: 0,
			bySuggestion: 0,
			dropped: 0,
			reopened: 1,
		});
		expect(await decisions(['hummus', 'cheese counter', 'pho', 'nudelsalat', 'pomme'])).toEqual(
			{
				hummus: [[], null, null],
				// Decided after the newest topic left: not asked again
				'cheese counter': [[], 'ai', null],
				pho: [[], 'ai', 'Pho'],
				nudelsalat: [['pasta', 'italian'], 'admin', null],
				pomme: [['fries'], 'ai', null],
			},
		);
	});

	it("keeps a topic's other names as admin terms linked to it alone: new ones created, another topic's refused, dropped ones reopened", async () => {
		const kebab = await topic('kebab');
		expect(await aliasesOf(kebab)).toEqual([
			'adana',
			'durum',
			'gemuse kebab',
			'iskender',
			'shish kebab',
		]);

		// Trimmed and once; the topic's own key dropped
		await service().setAliases(kebab, [
			' Dönerbox ',
			'dönerbox',
			'kebab',
			...(await aliasesOf(kebab)),
		]);
		expect([...(await aliasesOf(kebab))].sort()).toEqual(
			['Dönerbox', 'adana', 'durum', 'gemuse kebab', 'iskender', 'shish kebab'].sort(),
		);
		expect(await decisions(['donerbox'])).toEqual({ donerbox: [['kebab'], 'admin', null] });
		expect((await topicService().index()).exactAll('Dönerbox')).toEqual(['kebab']);

		// One admin's word stands: a name that is another topic's admin term is refused
		const pasta = await topic('pasta');
		await expect(service().setAliases(pasta, ['Durum'])).rejects.toThrow(BadRequestException);
		await expect(service().setAliases(pasta, ['Durum'])).rejects.toThrow(
			'"Durum" already means "Döner & kebab"',
		);
		// An admin term of two topics ("nudelsalat": pasta, italian) is no alias of either
		expect(await aliasesOf(pasta)).toEqual([]);
		expect((await service().aliasesOf([])).size).toBe(0);

		// A name not listed any more is reopened, never deleted ("Dönerbox" stays a term, pending: a food part may point at it)
		await service().setAliases(kebab, [
			'adana',
			'durum',
			'iskender',
			'shish kebab',
			'gemuse kebab',
		]);
		expect(await aliasesOf(kebab)).toEqual([
			'adana',
			'durum',
			'gemuse kebab',
			'iskender',
			'shish kebab',
		]);
		expect(await decisions(['donerbox'])).toEqual({ donerbox: [[], null, null] });
		expect((await terms()).get('durum')).toMatchObject({
			name: 'durum',
			topics: ['kebab'],
			decidedBy: 'admin',
		});
	});

	it('dismisses a word as an admin term with no topic, and brings it back pending', async () => {
		// An admin's "none" from the Terms tab ("sauce") is one too
		expect(await service().ignoredWords()).toEqual(['sauce']);
		await service().setIgnored('Meat', true);
		expect((await terms()).get('meat')).toMatchObject({
			name: 'meat',
			topics: [],
			decidedBy: 'admin',
		});
		// Idempotent; a decided wording dismissed loses its links
		await service().setIgnored('meat', true);
		await service().setIgnored('waiting time', true);
		expect(await service().ignoredWords()).toEqual(['meat', 'sauce', 'waiting time']);
		expect(await decisions(['waiting time'])).toEqual({ 'waiting time': [[], 'admin', null] });
		expect(await service().reviewTagTopics(['waiting time'])).toEqual(new Map());

		// Brought back: pending again, for the match and the agent to decide
		await service().setIgnored('Meat', false);
		expect((await terms()).get('meat')).toMatchObject({ topics: [], decidedBy: null });
		expect(await service().ignoredWords()).toEqual(['sauce', 'waiting time']);
		// Un-dismissing a word never seen stores nothing
		await service().setIgnored('unicorn', false);
		expect((await terms()).has('unicorn')).toBe(false);
	});

	it("lets an admin keep one of a wording's current topics, and make a decided wording a topic's other name", async () => {
		// The agent's "vegan döner" is kebab and vegan; the admin narrows it to kebab (the Terms tab's edit)
		const veganDoner = await termId('vegan doner');
		expect(await service().change(veganDoner, { topicKeys: ['kebab'] })).toMatchObject({
			decidedBy: 'admin',
		});
		expect(await decisions(['vegan doner'])).toEqual({
			'vegan doner': [['kebab'], 'admin', null],
		});
		expect((await topicService().index()).exactAll('vegan döner')).toEqual(['kebab']);
		expect((await topicsOfParts())['vegan doner']).toEqual(['kebab']);

		// A wording the agent decided pasta becomes the admin's other name of pasta
		const pasta = await topic('pasta');
		await service().setAliases(pasta, [...(await aliasesOf(pasta)), 'Spaghettiiiossso']);
		expect(await decisions(['spaghettiiiossso'])).toEqual({
			spaghettiiiossso: [['pasta'], 'admin', null],
		});
		expect(await aliasesOf(pasta)).toEqual(['Spaghettiiiossso']);
	});

	it('asks the agent again about a wording whose linked aspect an admin deleted', async () => {
		const tip = await topicService().create({
			label: 'Tip prompts',
			kind: TopicKindEnum.ASPECT,
			parentKey: 'payment',
		});
		const imbiss = await em().findOneOrFail(Venue, { name: 'Imbiss Eck' });
		imbiss.details = {
			...imbiss.details,
			reviewsTags: [
				...(imbiss.details?.reviewsTags ?? []),
				{ title: 'tip prompt', count: 2 },
			],
		};
		await em().flush();
		await service().sync(await topicService().index());
		await service().decide({ limit: 100 });
		expect(await decisions(['tip prompt'])).toEqual({
			'tip prompt': [['tip_prompts'], 'ai', null],
		});

		await topicService().remove(tip.id);
		// The job runs in a context of its own
		em().clear();
		await relinkAll();
		// Its one topic gone, the wording is not "none": it waits for the agent again
		expect(await decisions(['tip prompt'])).toEqual({ 'tip prompt': [[], null, null] });
	});

	it("stores agent B's wordings as it reads a claim (`ensure`): a topic as a whole decided at once, a known wording returned as it is, a new one waiting — and the claim's food part reads the decision when it comes", async () => {
		const index = await topicService().index();
		const found = await service().ensure(
			['Kebabs', 'Lahmacun deluxe', ' vegan döner ', ''],
			index,
		);
		expect([...found.keys()].sort()).toEqual(['kebab', 'lahmacun deluxe', 'vegan doner']);
		// "Kebabs" is the topic's key as a whole; the admin's "vegan döner" is untouched; the new one waits
		expect(found.get('kebab')).toMatchObject({ name: 'Kebabs', decidedBy: 'match' });
		expect(found.get('vegan doner')).toMatchObject({ decidedBy: 'admin' });
		expect(found.get('lahmacun deluxe')).toMatchObject({
			name: 'Lahmacun deluxe',
			decidedBy: null,
		});
		// The claim naming it, written in the same unit of work, points at the term
		const [claim] = addStatements(
			em(),
			review(),
			[
				{
					text: 'the Lahmacun deluxe was hot and fresh',
					sentiment: 'positive',
					foods: ['Lahmacun deluxe'],
				},
			],
			{ index },
		);
		await em().flush();
		expect(await decisions(['kebab', 'lahmacun deluxe'])).toEqual({
			kebab: [['kebab'], 'match', null],
			'lahmacun deluxe': [[], null, null],
		});
		// Idempotent: the same wording again stores nothing new
		await service().ensure(['lahmacun deluxe'], index);
		expect((await terms()).get('lahmacun deluxe')!.name).toBe('Lahmacun deluxe');

		// The backlog decides it; the statement's food part shows kebab through the term's links, no row rewritten
		expect(await service().decide({ limit: 100 })).toMatchObject({ linked: 1 });
		const part = await em()
			.fork()
			.findOneOrFail(
				StatementPart,
				{ statement: claim.id, role: 'food' },
				{ populate: ['term.topics.topic'] },
			);
		expect(part.term!.topics.getItems().map(l => l.topic.key)).toEqual(['kebab']);
		expect((await topicsOfParts())['lahmacun deluxe']).toEqual(['kebab']);
		// And the city's list counts the statement naming it
		const listed = await service().list(city.id, {
			status: 'linked',
			topicKey: 'kebab',
			offset: 0,
			limit: 50,
		});
		expect(listed.terms.find(t => t.key === 'lahmacun deluxe')).toMatchObject({
			notes: 1,
			tagVenues: 0,
		});
	});

	it("stores the relation the agent answers per topic, and an admin's choice and a name match as the same thing", async () => {
		const index = await topicService().index();
		const terms = await service().ensure(['tofu döner', 'Pasta'], index);
		await em().flush();
		await service().decide({ limit: 50 });
		em().clear();
		const rows: { name: string; key: string; relation: string }[] = await em()
			.getConnection()
			.execute(
				`select t.name, x.key, tt.relation from terms t join term_topics tt on tt.term_id = t.id join topics x on x.id = tt.topic_id
				where t.key in (?, ?) order by t.name, tt.rank`,
				[terms.get('tofu doner')!.key, terms.get('pasta')!.key],
			);
		expect(rows.map(r => [r.name, r.key, r.relation])).toEqual([
			['Pasta', 'pasta', 'same'],
			['tofu döner', 'kebab', 'kind_of'],
			['tofu döner', 'vegan', 'with'],
		]);
	});
});
