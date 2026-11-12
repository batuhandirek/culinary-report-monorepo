import { wrap } from '@mikro-orm/core';

import { BadRequestException } from '@nestjs/common';

import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';

import type { City } from 'src/modules/cities/entities/city.entity.js';
import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { PgBossService } from 'src/modules/pgboss/pgboss.service.js';
import { Statement } from 'src/modules/statements/entities/statement.entity.js';
import { StatementInsightService } from 'src/modules/statements/services/statement-insight.service.js';
import { addStatements } from 'src/modules/statements/tests/factories/statement.factory.js';
import { ancestorsSql, claimTopicsSql } from 'src/modules/statements/util/insight-sql.js';
import { FOODS_SQL, type StatementFood } from 'src/modules/statements/util/statement-foods.js';
import { STATEMENT_PARTS_POPULATE } from 'src/modules/statements/util/statement-populate.js';
import { Review } from 'src/modules/venues/entities/review.entity.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import type { CountMode, EdgeType } from '../constants/topic-edge.constant.js';
import { Term, type TermDecider } from '../entities/term.entity.js';
import { Topic, TopicKindEnum } from '../entities/topic.entity.js';
import { TermService } from '../services/term.service.js';
import { TopicService } from '../services/topic.service.js';
import type { TermDecision } from '../util/term-topic-input.js';

import { seedTopics } from './factories/topic.factory.js';

const MONTH = '2026-09';

/*
 * The topic graph end to end on PGlite (the task's acceptance): a topic's edges stated once and
 * followed by every spelling, a narrower wording's modifiers counted strictly and broadly, promotion
 * in code, the aspect rules, and the boot import's guard.
 */
describe('The topic graph (pglite)', () => {
	let harness: PgliteTestingModule;
	let topics: TopicService;
	let terms: TermService;
	let insight: StatementInsightService;
	let city: City;
	let venue: Venue;
	let reviews = 0;

	const em = () => harness.orm.em;
	const sql = <T>(text: string, params: unknown[] = []) =>
		em()
			.getConnection()
			.execute<T[]>(text, params as never[]);

	/** A decided wording, as agent C or an admin left it */
	const decide = async (
		name: string,
		decision: Partial<TermDecision>,
		by: TermDecider = 'ai',
	) => {
		const index = await topics.index();
		const [term] = [...(await terms.ensure([name], index)).values()];
		terms.setDecision(
			term,
			{
				topicKey: null,
				exact: false,
				proposedLabel: null,
				proposedKind: null,
				modifiers: [],
				...decision,
			},
			index,
			by,
			new Date(),
		);
		await em().flush();
		return term;
	};

	/** `n` written reviews of the venue, each naming the wording in `per` claims */
	const say = async (name: string, n: number, per = 1): Promise<Statement[]> => {
		const index = await topics.index();
		const out: Statement[] = [];
		for (let i = 0; i < n; i++)
			out.push(
				...addStatements(
					em(),
					em().create(Review, {
						venue,
						reviewId: `tg-${reviews++}`,
						publishedAt: new Date(`${MONTH}-10T12:00:00Z`),
						stars: 5,
						text: 'Written',
						analysedAt: new Date(),
					}),
					Array.from({ length: per }, (_, k) => ({
						text: `the ${name} was good (${k})`,
						sentiment: 'positive' as const,
						foods: [name],
					})),
					{ index },
				),
			);
		await em().flush();
		return out;
	};

	/** The topics a claim counts for, read as Explore reads them: its parts' topics through the closure */
	const countsFor = async (statementId: number, mode: CountMode): Promise<string[]> => {
		const rows = await sql<{ key: string }>(
			`select distinct t.key from (${claimTopicsSql(mode)}) l
			join (${ancestorsSql(mode)}) anc(id, anc_id) on anc.id = l.topic_id
			join topics t on t.id = anc.anc_id
			where l.statement_id = ? order by t.key`,
			[statementId],
		);
		return rows.map(r => r.key);
	};

	const edgesOf = async (key: string): Promise<{ to: string; type: EdgeType; rank: number }[]> =>
		sql(
			`select x.key as "to", e.type, e.rank from topic_edges e
			join topics f on f.id = e.from_id join topics x on x.id = e.to_id
			where f.key = ? order by e.type desc, e.rank`,
			[key],
		);

	const term = (key: string) =>
		em().findOneOrFail(
			Term,
			{ key },
			{ populate: ['topic', 'modifiers.topic'], refresh: true },
		);

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				TopicService,
				TermService,
				StatementInsightService,
				{ provide: PgBossService, useValue: { sendJob: jest.fn(async () => undefined) } },
			],
		});
		topics = harness.moduleRef.get(TopicService);
		terms = harness.moduleRef.get(TermService);
		insight = harness.moduleRef.get(StatementInsightService);
		entityManagerManager.setEntityManager(harness.orm.em);

		seedTopics(em(), [
			'turkish',
			'kebab',
			'vegan',
			'gluten free',
			'breakfast',
			'burgers',
			'wait',
			'wait_for_food',
			'price',
		]);
		city = testCity(em());
		venue = em().create(Venue, {
			city,
			placeId: 'tg-1',
			name: 'Lokanta',
			category: 'Restaurant',
		});
		await em().flush();
		await topics.create({
			label: 'Menemen',
			kind: TopicKindEnum.DISH,
			edges: [{ to: 'turkish' }, { to: 'breakfast' }],
		});
	});

	afterAll(async () => {
		await harness.stop();
	});

	it('states what Menemen is once, and every spelling follows', async () => {
		expect(await edgesOf('menemen')).toEqual([
			{ to: 'turkish', type: 'is_a', rank: 0 },
			{ to: 'breakfast', type: 'is_a', rank: 1 },
		]);
		const index = await topics.index();
		expect(index.parentOf('menemen')).toBe('turkish');
		expect(index.ancestors(['menemen']).sort()).toEqual(['breakfast', 'menemen', 'turkish']);
		expect(index.descendants('breakfast')).toContain('menemen');

		// "menemen" is the topic's own name; "Melemen" a spelling the agent decided
		const [own] = [...(await terms.ensure(['menemen'])).values()];
		await em().flush();
		expect(own.decidedBy).toBe('match');
		expect(own.exact).toBe(true);
		const melemen = await decide('Melemen', { topicKey: 'menemen', exact: true });
		expect((await term(melemen.key)).topic?.key).toBe('menemen');

		const [claim] = await say('Melemen', 1);
		expect(await countsFor(claim.id, 'strict')).toEqual(['breakfast', 'menemen', 'turkish']);

		// Explore on Breakfast counts the claim that says "Melemen"
		const tree = await insight.tree({ cityId: city.id, from: MONTH, to: MONTH });
		const node = (key: string) => tree.find(n => n.key === key);
		expect(node('breakfast')?.sources).toBe(1);
		expect(node('turkish')?.sources).toBe(1);
		expect(node('menemen')).toMatchObject({
			sources: 1,
			parentKey: 'turkish',
			isA: ['turkish', 'breakfast'],
		});
	});

	it('counts a narrower wording for what it is, and for what it has only broadly', async () => {
		await decide('gluten-free menemen', {
			topicKey: 'menemen',
			modifiers: [{ topicKey: 'gluten free', type: 'has' }],
		});
		const [claim] = await say('gluten-free menemen', 1);
		expect(await countsFor(claim.id, 'strict')).toEqual(['breakfast', 'menemen', 'turkish']);
		expect(await countsFor(claim.id, 'broad')).toEqual([
			'breakfast',
			'gluten free',
			'menemen',
			'turkish',
		]);
		// No "Gluten-free menemen" topic was needed
		expect(await em().count(Topic, { label: { $ilike: 'gluten%menemen' } })).toBe(0);

		// The foods a claim names: the dish it is, read through the closure
		const [{ foods }] = await sql<{ foods: StatementFood[] }>(
			`select ${FOODS_SQL('st.id = s.id')} as foods from statements s where s.id = ?`,
			[claim.id],
		);
		expect(foods[0].topics.map(t => t.key)).toEqual(['menemen']);
	});

	it('promotes a narrower wording that reached the floor into a topic of its own', async () => {
		const proposal = {
			topicKey: 'kebab',
			proposedLabel: 'Vegan döner',
			proposedKind: TopicKindEnum.DISH,
			modifiers: [{ topicKey: 'vegan', type: 'has' as const }],
		};
		await decide('vegan döner', proposal);
		await decide('veganer Döner', proposal);
		await decide('vegan doner kebap', proposal, 'admin');
		// Below the floor nothing happens: 4 uses
		await say('vegan döner', 4);
		expect((await terms.promote()).created).toEqual([]);

		// 15 uses from 5 sources and more
		await say('vegan döner', 4, 2);
		await say('veganer Döner', 3);
		const promoted = await terms.promote();
		expect(promoted.created).toEqual(['Vegan döner']);

		const topic = await em().findOneOrFail(Topic, { label: 'Vegan döner' });
		expect(topic.kind).toBe(TopicKindEnum.DISH);
		expect(topic.discoveredAt).toBeTruthy();
		expect(await edgesOf(topic.key)).toEqual([
			{ to: 'kebab', type: 'is_a', rank: 0 },
			{ to: 'vegan', type: 'has', rank: 0 },
		]);
		for (const key of ['vegan doner', 'veganer doner', 'vegan doner kebap']) {
			const moved = await em().findOne(
				Term,
				{ key: { $like: `${key}%` } },
				{ populate: ['topic', 'modifiers'], refresh: true },
			);
			if (!moved) continue;
			expect(moved.topic?.key).toBe(topic.key);
			expect(moved.exact).toBe(true);
			expect(moved.modifiers.count()).toBe(0);
		}
		const admin = await em().findOneOrFail(
			Term,
			{ name: 'vegan doner kebap' },
			{ refresh: true },
		);
		expect(admin.decidedBy).toBe('admin');
		expect(admin.exact).toBe(true);

		// Its claims count for Vegan broadly, never strictly; a second run creates no twin
		const [claim] = await say('vegan döner', 1);
		expect(await countsFor(claim.id, 'broad')).toEqual(
			expect.arrayContaining(['kebab', 'vegan', topic.key]),
		);
		expect(await countsFor(claim.id, 'strict')).not.toContain('vegan');
		expect((await terms.promote()).created).toEqual([]);
	});

	it('promotes a standalone narrower dish, never a synonym', async () => {
		await decide('kumpir', { topicKey: 'turkish' });
		await decide('türkisches Essen', { topicKey: 'turkish', exact: true });
		await say('kumpir', 5, 3);
		await say('türkisches Essen', 5, 3);
		const promoted = await terms.promote();
		expect(promoted.created).toEqual(['Kumpir']);
		expect(await edgesOf('kumpir')).toEqual([{ to: 'turkish', type: 'is_a', rank: 0 }]);
		const kumpir = await term('kumpir');
		expect(kumpir.topic?.key).toBe('kumpir');
		expect(kumpir.exact).toBe(true);
		const synonym = await em().findOneOrFail(
			Term,
			{ name: 'türkisches Essen' },
			{ populate: ['topic'], refresh: true },
		);
		expect(synonym.topic?.key).toBe('turkish');
	});

	it('never promotes a twin: words run together or in another order are one topic', async () => {
		// Two spellings of one dish, neither at the floor alone (9 uses from 3 reviews each)
		await decide('cig kofte', {
			topicKey: 'turkish',
			proposedLabel: 'Çiğ köfte',
			proposedKind: TopicKindEnum.DISH,
		});
		await decide('cigkofte', {
			topicKey: 'turkish',
			proposedLabel: 'Çiğköfte',
			proposedKind: TopicKindEnum.DISH,
		});
		await say('cig kofte', 3, 3);
		await say('cigkofte', 3, 3);
		// A twin of a topic that exists joins it, whatever its uses
		const hotDog = await topics.create({
			label: 'Hot dog',
			kind: TopicKindEnum.DISH,
			edges: [{ to: 'burgers' }],
		});
		await decide('hotdogs', {
			topicKey: 'burgers',
			proposedLabel: 'Hotdog',
			proposedKind: TopicKindEnum.DISH,
		});
		await say('hotdogs', 1);

		const promoted = await terms.promote();
		expect(promoted.created).toEqual(['Çiğ köfte']);
		const cigKofte = await em().findOneOrFail(Topic, { label: 'Çiğ köfte' });
		for (const key of ['cig kofte', 'cigkofte']) {
			const wording = await term(key);
			expect(wording.topic?.key).toBe(cigKofte.key);
			expect(wording.exact).toBe(true);
		}
		const hotdog = await term('hotdog');
		expect(hotdog.topic?.key).toBe(hotDog.key);
		expect(hotdog.exact).toBe(true);
		expect(await em().count(Topic, { label: { $in: ['Çiğköfte', 'Hotdog'] } })).toBe(0);
	});

	it('keeps the aspects two levels, the sides apart, and refuses a loop', async () => {
		const id = async (key: string) => (await em().findOneOrFail(Topic, { key })).id;
		const refused = (input: Parameters<TopicService['update']>[1], key: string) =>
			id(key).then(topicId =>
				expect(topics.update(topicId, input)).rejects.toBeInstanceOf(BadRequestException),
			);
		// A second `is_a`, a `has`, a parent that is no root, a root with children under another root
		await refused({ edges: [{ to: 'wait' }, { to: 'price' }] }, 'wait_for_food');
		await refused({ edges: [{ to: 'price', type: 'has' }] }, 'wait_for_food');
		await refused({ edges: [{ to: 'price' }] }, 'wait');
		// Food and aspects never relate
		await refused({ edges: [{ to: 'wait' }] }, 'menemen');
		await refused({ edges: [{ to: 'turkish' }] }, 'wait_for_food');
		// Menemen is Turkish: Turkish can't be a kind of, or have, Menemen
		await refused({ edges: [{ to: 'menemen' }] }, 'turkish');
		await refused({ edges: [{ to: 'menemen', type: 'has' }] }, 'turkish');
		// Nothing of the refused attempts was stored
		expect(await edgesOf('wait_for_food')).toEqual([{ to: 'wait', type: 'is_a', rank: 0 }]);
		expect(await edgesOf('turkish')).toEqual([]);

		// A wording under an aspect is exact and never a promotion candidate, however much it is used
		const queue = await decide('Warteschlange', { topicKey: 'wait' });
		expect((await term(queue.key)).exact).toBe(false);
		await terms.change(queue.id, { topicKey: 'wait' });
		expect((await term(queue.key)).exact).toBe(true);
		await say('Warteschlange', 6, 3);
		expect((await terms.promote()).created).toEqual([]);
	});

	it('serves a topic with its display parent from its edges', async () => {
		const index = await topics.index();
		const review = em().create(Review, {
			venue,
			reviewId: 'tg-serialize',
			publishedAt: new Date(`${MONTH}-12T12:00:00Z`),
			stars: 2,
			text: 'Written',
			analysedAt: new Date(),
		});
		const [made] = addStatements(
			em(),
			review,
			[
				{
					text: 'waited an hour for the Melemen',
					sentiment: 'negative',
					aspect: 'wait_for_food',
					foods: ['Melemen'],
				},
			],
			{ index },
		);
		await em().flush();
		em().clear();
		const statement = await em().findOneOrFail(
			Statement,
			{ id: made.id },
			{ populate: [...STATEMENT_PARTS_POPULATE] },
		);
		const out = wrap(statement).serialize({
			skipNull: true,
			forceObject: true,
			populate: [...STATEMENT_PARTS_POPULATE],
		}) as unknown as {
			parts: {
				role: string;
				topic?: { key: string; parent?: { key: string; label: string } };
				term?: { exact: boolean; topic?: { key: string; parent?: { key: string } } };
			}[];
		};
		const aspect = out.parts.find(p => p.role === 'aspect');
		expect(aspect?.topic).toMatchObject({ key: 'wait_for_food', parent: { key: 'wait' } });
		const food = out.parts.find(p => p.role === 'food');
		expect(food?.term).toMatchObject({
			exact: true,
			topic: { key: 'menemen', parent: { key: 'turkish' } },
		});
	});
});
