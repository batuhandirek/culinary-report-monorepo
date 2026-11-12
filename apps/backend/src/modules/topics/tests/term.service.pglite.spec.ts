import { BadRequestException, NotFoundException } from '@nestjs/common';

import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { LlmBacklogRegistry } from 'src/modules/backlog/services/llm-backlog-registry.service.js';
import type { City } from 'src/modules/cities/entities/city.entity.js';
import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { PgBossService } from 'src/modules/pgboss/pgboss.service.js';
import { StatementPart } from 'src/modules/statements/entities/statement-part.entity.js';
import { addStatements } from 'src/modules/statements/tests/factories/statement.factory.js';
import { FOODS_SQL, type StatementFood } from 'src/modules/statements/util/statement-foods.js';
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
import type { TermTopicAnswer } from '../util/term-topic-input.js';

import { seedTopics } from './factories/topic.factory.js';

/** What the agent answers for a wording, by its spelling (lower case); anything else is none */
const ANSWERS: Record<string, Partial<TermTopicAnswer>> = {
	// A spelling of a topic
	spaghettiiiossso: { topic: 'pasta', exact: true },
	// A narrower thing with a modifier whose type is left to the target's kind
	'vegan döner': {
		topic: 'kebab',
		exact: false,
		label: 'Vegan döner',
		kind: 'dish',
		modifiers: [{ topic: 'vegan', type: null }],
	},
	// A thing no topic given comes near: under nothing, proposed as a topic
	pommes: { topic: null, exact: false, label: 'Fries', kind: 'dish' },
	// A Google tag under an aspect: stored exact whatever the agent says
	'waiting time': { topic: 'wait', exact: false, label: 'Waiting time', kind: 'dish' },
	// A label answered for a key, an unknown modifier, a kind promotion can't create
	'smashed patty': {
		topic: 'Burgers',
		exact: false,
		label: 'Smashed patty',
		kind: 'format',
		modifiers: [{ topic: 'nonsense', type: 'has' }],
	},
	nudelsalat: { topic: 'pasta', exact: false, label: 'Pasta salad', kind: 'dish' },
	'tip prompt': { topic: 'tip_prompts', exact: true },
};

/*
 * Every wording seen (`Term`) with its main topic and modifiers: stored as the labelling pass reads
 * a claim's food wordings (`ensure`) and from the venues' Google tags (`sync`), decided by a name
 * match, the agent (the `terms` backlog) or an admin, re-decided when topics change, part of the
 * index every reader resolves text with. A statement's food part points at its term and takes the
 * term's topic at read time: a decision moves every statement naming the wording at once.
 * Promotion and the boot import are in `topic-graph.pglite.spec.ts`.
 */
describe('TermService (pglite)', () => {
	let harness: PgliteTestingModule;
	let city: City;
	let hamburg: City;
	let venue: Venue;
	const pgBoss = { sendJob: jest.fn(async (..._args: unknown[]) => 'job-id') };
	/** The fixed topics the agent was offered on its last call, its last message, and the wordings asked since the case began (one a call) */
	let offered: TermTopicInputTopic[] = [];
	let message = '';
	let asked: string[] = [];
	const agent = mockAgent((given: unknown, context: unknown) => {
		message = given as string;
		const name = JSON.parse(/^Wording: (.*)$/m.exec(message)![1]) as string;
		offered = (context as TermTopicContext).topics;
		asked.push(name);
		const answer = ANSWERS[name.toLowerCase()];
		return {
			none: !answer,
			topic: null,
			exact: false,
			label: null,
			kind: null,
			modifiers: [],
			...answer,
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

	/** A stored wording as decided: its main topic, exact, the proposal, its modifiers and who decided */
	const state = async (key: string) => {
		const t = await em()
			.fork()
			.findOne(Term, { key }, { populate: ['topic', 'modifiers.topic'] });
		return (
			t && {
				topic: t.topic?.key ?? null,
				exact: t.exact,
				label: t.proposedLabel ?? null,
				kind: t.proposedKind ?? null,
				modifiers: t.modifiers.getItems().map(m => `${m.type} ${m.topic.key}`),
				by: t.decidedBy ?? null,
			}
		);
	};
	const termId = async (key: string) => (await em().fork().findOneOrFail(Term, { key })).id;
	/** The dish and drink topics the statements naming a wording count for today */
	const foodsOf = async (key: string): Promise<string[]> => {
		const rows: { foods: StatementFood[] }[] = await em()
			.getConnection()
			.execute(
				`select ${FOODS_SQL('st.id = s.id')} as foods from statements s
				where exists (select 1 from statement_parts p join terms t on t.id = p.term_id where p.statement_id = s.id and t.key = ?)`,
				[key],
			);
		return [...new Set(rows.flatMap(r => r.foods.flatMap(f => f.topics.map(t => t.key))))].sort();
	};

	it("stores each wording once — a statement's as first spelled, a tag as Google writes it — decided by a name match where it is a topic as a whole, the rest waiting", async () => {
		const index = await topicService().index();
		const synced = await service().sync(index);
		expect(synced.added).toBeGreaterThan(0);
		// A second sync adds nothing
		expect((await service().sync(index)).added).toBe(0);
		// "Burgers" is a topic's label: the wording is that topic, exact, with no model
		expect(await state('burger')).toMatchObject({ topic: 'burgers', exact: true, by: 'match' });
		// "Pommes" and "pommes" are one term, spelled as first seen, waiting
		const pommes = await em().fork().findOneOrFail(Term, { key: 'pomme' });
		expect([pommes.name, pommes.decidedBy ?? null]).toEqual(['Pommes', null]);
		expect(await state('waiting time')).toMatchObject({ topic: null, by: null });
		expect(await service().countPending()).toBeGreaterThan(0);
	});

	it('decides the waiting wordings once in the backlog: a spelling exact, a narrower thing with its modifiers and proposal, none; every statement following', async () => {
		expect(await foodsOf('vegan doner')).toEqual([]);
		const res = await service().decide({ limit: 100 });
		expect(res.looked).toBe(asked.length);
		expect(asked).toEqual(expect.arrayContaining(['Spaghettiiiossso', 'vegan döner', 'Pommes']));
		// The small fixed kinds and the aspect roots are in the instructions, the many in the message
		// (all of them here: the embeddings are mocked away, so nothing is closest)
		expect(offered.map(t => t.key)).toEqual(expect.arrayContaining(['vegan', 'breakfast', 'wait', 'cafe']));
		expect(offered.map(t => t.key)).not.toContain('kebab');
		expect(message).toContain('Topics close to it:');
		expect(message).toMatch(/^kebab \| /m);

		expect(await state('spaghettiiiossso')).toEqual({
			topic: 'pasta',
			exact: true,
			label: null,
			kind: null,
			modifiers: [],
			by: 'ai',
		});
		expect(await state('vegan doner')).toEqual({
			topic: 'kebab',
			exact: false,
			label: 'Vegan döner',
			kind: 'dish',
			modifiers: ['has vegan'],
			by: 'ai',
		});
		expect(await state('pomme')).toMatchObject({ topic: null, exact: false, label: 'Fries', kind: 'dish' });
		// None: decided, nothing else
		expect(await state('sauce')).toEqual({
			topic: null,
			exact: false,
			label: null,
			kind: null,
			modifiers: [],
			by: 'ai',
		});
		// Under an aspect a wording is exact, with no proposal
		expect(await state('waiting time')).toMatchObject({ topic: 'wait', exact: true, label: null });
		// A label answered for a key counts; an unknown modifier and a kind promotion can't create are dropped
		expect(await state('smashed patty')).toMatchObject({
			topic: 'burgers',
			exact: false,
			label: 'Smashed patty',
			kind: null,
			modifiers: [],
		});
		// The statements naming the wording follow at once
		expect(await foodsOf('vegan doner')).toEqual(['kebab']);
		expect(await foodsOf('spaghettiiiossso')).toEqual(['pasta']);

		// Each wording is asked once
		asked = [];
		expect((await service().decide({ limit: 100 })).looked).toBe(0);
		expect(asked).toEqual([]);
	});

	it('gives the index every decision: a spelling as its topic, a narrower wording as what it evokes, a tag as its aspect, a "none" as nothing', async () => {
		const index = await topicService().index();
		expect(index.exact('Spaghettiiiossso')).toBe('pasta');
		expect(index.resolve('Spaghettiiiossso')).toEqual(['pasta']);
		// A narrower wording is no topic as a whole, but evokes its topic and its modifiers
		expect(index.exact('vegan döner')).toBeUndefined();
		expect(index.exactAll('vegan döner')).toEqual(['kebab', 'vegan']);
		expect(index.resolve('vegan döner')).toEqual(['kebab', 'vegan']);
		expect(index.exactAll('waiting time')).toEqual(['wait']);
		// An aspect never enters the cuisine lookup
		expect(index.resolve('waiting time')).toEqual([]);
		expect(index.exactAll('sauce')).toEqual([]);
	});

	it("names the topic each of Google's tags is: a decided wording's topic that is no kind of place, else the index as a whole", async () => {
		const named = await service().reviewTagTopics(['waiting time', 'cheese counter', 'Dürüm', 'Café']);
		expect(named.get('waiting time')).toMatchObject({ key: 'wait' });
		expect(named.get('Dürüm')).toMatchObject({ key: 'kebab' });
		expect(named.has('cheese counter')).toBe(false);
		// A kind of place is never what a tag names
		expect(named.has('Café')).toBe(false);
	});

	it("lists a city's wordings with the statements naming them and the venues whose tags carry them, and filters by status, topic and words", async () => {
		const all = await service().list(city.id, { status: 'all', offset: 0, limit: 200 });
		const row = (key: string) => all.terms.find(t => t.key === key);
		expect(row('waiting time')).toMatchObject({ topic: { key: 'wait' }, exact: true, tagVenues: 2, notes: 0 });
		expect(row('pomme')).toMatchObject({ notes: 2, proposedLabel: 'Fries', exact: false });
		expect(row('vegan doner')).toMatchObject({
			topic: { key: 'kebab' },
			modifiers: [{ key: 'vegan', type: 'has' }],
		});
		// Another city's tag is not this city's wording
		expect(row('pho')).toBeUndefined();

		const keys = async (filters: Parameters<TermService['list']>[1]) =>
			(await service().list(city.id, filters)).terms.map(t => t.key);
		const page = { offset: 0, limit: 200 };
		// A modifier counts as its topic's wording too
		expect(await keys({ status: 'all', topicKey: 'vegan', ...page })).toEqual(['vegan doner']);
		const linked = await keys({ status: 'linked', ...page });
		expect(linked).toEqual(expect.arrayContaining(['waiting time', 'vegan doner']));
		// No topic and no modifier: not linked, whatever it proposes
		expect(linked).not.toContain('sauce');
		expect(linked).not.toContain('pomme');
		expect(await keys({ status: 'all', q: 'spagh', ...page })).toEqual(['spaghettiiiossso']);
	});

	it("takes an admin's decision — a main topic, exact or narrower with modifiers, none, or back to automatic — which every statement naming the wording follows", async () => {
		const controller = harness.moduleRef.get(AdminTermsController);
		const sauce = await termId('sauce');
		const out = await controller.changeTerm(sauce, {
			topicKey: 'kebab',
			exact: false,
			modifiers: [{ topicKey: 'vegan' }],
		});
		expect(out).toMatchObject({
			topic: { key: 'kebab' },
			exact: false,
			modifiers: [{ key: 'vegan', type: 'has' }],
			decidedBy: 'admin',
		});
		expect(await foodsOf('sauce')).toEqual(['kebab']);
		expect(pgBoss.sendJob).toHaveBeenCalled();
		// With a topic and no modifier a wording is that topic
		expect(await controller.changeTerm(sauce, { topicKey: 'kebab' })).toMatchObject({ exact: true, modifiers: [] });
		// None
		await controller.changeTerm(sauce, { topicKey: null });
		expect(await state('sauce')).toMatchObject({ topic: null, exact: false, modifiers: [], by: 'admin' });
		expect(await foodsOf('sauce')).toEqual([]);

		await expect(
			service().change(sauce, { topicKey: 'kebab', exact: true, modifiers: [{ topicKey: 'vegan' }] }),
		).rejects.toBeInstanceOf(BadRequestException);
		await expect(service().change(sauce, { topicKey: 'no such' })).rejects.toBeInstanceOf(BadRequestException);
		await expect(
			service().change(sauce, { topicKey: 'kebab', modifiers: [{ topicKey: 'wait' }] }),
		).rejects.toBeInstanceOf(BadRequestException);
		await expect(service().change(999_999, { auto: true })).rejects.toBeInstanceOf(NotFoundException);

		// The agent never changes an admin's word, and "auto" hands the wording back
		expect((await service().decide({ limit: 100 })).looked).toBe(0);
		await service().change(sauce, { auto: true });
		expect(await state('sauce')).toMatchObject({ topic: null, by: null });
		await service().change(await termId('burger'), { topicKey: null });
		await service().change(await termId('burger'), { auto: true });
		expect(await state('burger')).toMatchObject({ topic: 'burgers', exact: true, by: 'match' });
	});

	it('makes a wording a topic of its own at an admin\'s word, whatever its uses', async () => {
		const controller = harness.moduleRef.get(AdminTermsController);
		const out = await controller.promoteTerm(await termId('pomme'), {});
		expect(out).toMatchObject({ topic: { label: 'Fries', kind: 'dish' }, exact: true, decidedBy: 'admin' });
		const fries = await em().fork().findOneOrFail(Topic, { label: 'Fries' });
		expect(fries.discoveredAt).toBeTruthy();
		expect(await foodsOf('pomme')).toEqual([fries.key]);
		// A wording under a topic keeps it as the new topic's parent
		const salad = await controller.promoteTerm(await termId('nudelsalat'), { label: 'Pasta salad' });
		const index = await topicService().index();
		expect(index.parentOf(salad.topic!.key)).toBe('pasta');
		expect(await foodsOf('nudelsalat')).toEqual(expect.arrayContaining(['pasta', salad.topic!.key]));
		// Under an aspect nothing is promoted
		await expect(service().promoteTerm(await termId('waiting time'))).rejects.toBeInstanceOf(
			BadRequestException,
		);
	});

	it('re-links after topics change: a wording that is now a topic takes it, exact, over anything else', async () => {
		// Hamburg's tag "Pho" waits; once Pho is a topic the wording is it
		await service().sync(await topicService().index());
		expect(await state('pho')).toMatchObject({ topic: null });
		await topicService().create({ label: 'Pho', kind: TopicKindEnum.DISH });
		const counts = await relinkAll();
		expect(counts.terms.matched).toBeGreaterThanOrEqual(1);
		expect(await state('pho')).toMatchObject({ topic: 'pho', exact: true, by: 'match' });
		// An admin's and the agent's decisions stay
		expect(await state('vegan doner')).toMatchObject({ topic: 'kebab', by: 'ai' });
	});

	it('asks the agent again about a wording whose aspect an admin deleted', async () => {
		const aspect = await topicService().create({
			label: 'Tip prompts',
			kind: TopicKindEnum.ASPECT,
			edges: [{ to: 'payment' }],
		});
		addStatements(em(), review(), [{ foods: ['tip prompt'], sentiment: 'negative' }], {
			index: await topicService().index(),
		});
		await em().flush();
		await service().decide({ limit: 100 });
		expect(await state('tip prompt')).toMatchObject({ topic: 'tip_prompts', exact: true, by: 'ai' });
		await topicService().remove(aspect.id);
		expect(await state('tip prompt')).toMatchObject({ topic: null, exact: false, by: null });
		expect(await em().fork().count(StatementPart, { term: { key: 'tip prompt' } })).toBe(1);
	});
});
