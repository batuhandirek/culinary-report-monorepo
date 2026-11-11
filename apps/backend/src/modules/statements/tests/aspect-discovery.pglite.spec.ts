import type { EntityManager } from '@mikro-orm/postgresql';

import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';

import type { City } from 'src/modules/cities/entities/city.entity.js';
import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';
import { fakeDurable } from 'src/modules/durable-workflows/tests/factories/durable.mock.js';
import { DurableLlmService } from 'src/modules/llm/services/durable-llm.service.js';
import { Topic } from 'src/modules/topics/entities/topic.entity.js';
import { TopicService } from 'src/modules/topics/services/topic.service.js';
import { seedTopics } from 'src/modules/topics/tests/factories/topic.factory.js';
import type { TopicIndex } from 'src/modules/topics/util/topics.js';
import { Review } from 'src/modules/venues/entities/review.entity.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { toVectorLiteral } from 'src/shared/util/vector.js';
import { mockAgent } from 'src/tests/mock-agent.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { type AspectSuggestion, AspectSuggestionAgent } from '../agents/aspect-suggestion.agent.js';
import type { Statement } from '../entities/statement.entity.js';
import {
	ASPECT_DISCOVERY_DEDUPE,
	ASPECT_DISCOVERY_QUEUE,
} from '../queues/aspect-discovery.queue.js';
import { AspectDiscoverySchedule } from '../schedules/aspect-discovery.schedule.js';
import { AspectDiscoveryService } from '../services/aspect-discovery.service.js';
import { StatementPartsService } from '../services/statement-parts.service.js';
import { AspectDiscoveryWorkflow } from '../workflows/aspect-discovery.workflow.js';

import { addStatements } from './factories/statement.factory.js';

/** A 1024-long vector starting with the given values, zeros after */
const vec = (...lead: number[]) => [...lead, ...Array(1024 - lead.length).fill(0)];
const MUSIC = vec(0, 0, 1);
const MUSIC_TOO = vec(0, 0, 1, 0, 0, 0.5);
const CASH = vec(0, 0, 0, 1);
const FAR = vec(0, 0, 0, 0, 1);

/*
 * Aspect discovery as workflows, the facade faked to run a started workflow inline (DBOS can't run
 * on PGlite) and the durable agent call faked to the plain one: a city's loose claims grouped at
 * the floors (10 claims, 6 sources, 3 brands), each group named by the suggestion agent (mocked);
 * a group that is an aspect and none that exists becomes one under its root, and the loose claims
 * near it are handed to the labeller (mocked) again. A dry run writes nothing; "not an aspect", a
 * food's name and an existing aspect create nothing; a call that failed leaves its group unnamed.
 */
describe('aspect discovery (pglite)', () => {
	let harness: PgliteTestingModule;
	let em: EntityManager;
	let city: City;
	let index: TopicIndex;
	let workflow: AspectDiscoveryWorkflow;
	const durable = fakeDurable(() => [workflow]);
	// The durable agent call faked to the plain one, behind a handle
	const durableLlm = {
		start: async (a: typeof agent, input: string, context: unknown) => {
			const result = (
				a.generate as unknown as (i: string, c: unknown) => Promise<{ object: unknown }>
			)(input, context).then(res => ({ object: res.object }));
			result.catch(() => undefined);
			return { workflowID: '', getResult: () => result };
		},
	};
	const discover = (cityId: string, { dryRun }: { dryRun: boolean }) =>
		workflow.discoverCity(cityId, dryRun);
	let music: AspectSuggestion;
	let cash: AspectSuggestion;
	const agent = mockAgent((input: unknown) =>
		(
			(JSON.parse(input as string) as { claims: string[] }).claims.some(c =>
				c.includes('music'),
			)
		) ?
			music
		:	cash,
	);
	const read = jest.fn(async (_opts: { ids?: number[] }) => ({ read: 0, tokens: 0 }));
	const ids: Record<string, number[]> = { music: [], cash: [], filed: [], far: [] };

	const parts = async (list: number[]) =>
		(await em
			.getConnection()
			.execute(
				`select id, parts_at from statements where id in (${list.map(() => '?').join(', ')}) order by id`,
				list,
			)) as { id: number; parts_at: Date | null }[];

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				AspectDiscoveryService,
				AspectDiscoveryWorkflow,
				AspectDiscoverySchedule,
				TopicService,
				{ provide: AspectSuggestionAgent, useValue: agent },
				{ provide: StatementPartsService, useValue: { read } },
				{ provide: DurableWorkflowsService, useValue: durable },
				{ provide: DurableLlmService, useValue: durableLlm },
			],
		});
		entityManagerManager.setEntityManager(harness.orm.em);
		em = harness.orm.em as EntityManager;
		workflow = harness.moduleRef.get(AspectDiscoveryWorkflow);
		seedTopics(em, ['vibe', 'payment', 'price_level', 'burgers']);
		city = testCity(em, { name: 'Berlin', aliases: [] });
		const venues = [1, 2, 3].map(i =>
			em.create(Venue, { city, placeId: `ad-${i}`, name: `Bar ${i}` }),
		);
		await em.flush();
		index = await harness.moduleRef.get(TopicService).index();

		const vectors = new Map<Statement, number[]>();
		const buckets: [keyof typeof ids, Statement][] = [];
		let n = 0;
		const add = (bucket: keyof typeof ids, text: string, vector: number[], aspect?: string) => {
			const review = em.create(Review, {
				venue: venues[n % 3],
				reviewId: `ad-r${++n}`,
				publishedAt: new Date('2026-10-12T12:00:00Z'),
			});
			const [s] = addStatements(em, review, [{ text, sentiment: 'negative', aspect }], {
				index,
			});
			s.partsAt = new Date('2026-11-01');
			vectors.set(s, vector);
			buckets.push([bucket, s]);
		};
		// Twelve music claims from twelve reviews of three brands, at the root or under none
		for (let i = 0; i < 12; i++)
			add(
				'music',
				`the music was far too loud ${i}`,
				i % 2 ? MUSIC_TOO : MUSIC,
				i % 3 ? 'vibe' : undefined,
			);
		// Two words: left out of the groups, read again all the same (it is near the group)
		add('music', 'loud music', MUSIC);
		// Twelve cash claims: a second group
		for (let i = 0; i < 12; i++) add('cash', `they only take cash here ${i}`, CASH);
		// Near the music group but filed under a finer aspect, and a loose one far from everything
		add('filed', 'the music made the drinks pricey', MUSIC, 'price_level');
		add('far', 'came on a Tuesday evening', FAR);
		await em.flush();
		for (const [bucket, s] of buckets) ids[bucket].push(s.id);
		for (const [s, vector] of vectors)
			await em
				.getConnection()
				.execute(
					`update statements set embedding = ?::halfvec(1024), embedded_at = now() where id = ?`,
					[toVectorLiteral(vector), s.id],
				);
		em.clear();
	});

	afterAll(async () => {
		await harness.stop();
	});

	beforeEach(() => {
		agent.generate.mockClear();
		read.mockClear();
		music = {
			isAspect: true,
			label: 'Music volume',
			hint: 'How loud the music is',
			root: 'vibe',
			fits: null,
		};
		cash = {
			isAspect: true,
			label: 'Cash only',
			hint: 'Whether cards are taken',
			root: 'payment',
			fits: null,
		};
	});

	it('names the groups in a dry run and writes nothing', async () => {
		const res = await discover(city.id, { dryRun: true });
		// 12 music, 12 cash, the far one; the two-word claim and the finer-filed one out
		expect([res.claims, res.considered, res.more]).toEqual([25, 25, 0]);
		expect(res.groups.map(g => [g.label, g.outcome, g.claims])).toEqual([
			['Music volume', 'created', 12],
			['Cash only', 'created', 12],
		]);
		expect(res.created).toEqual(['music_volume', 'cash_only']);
		expect(await em.count(Topic, { key: { $in: ['music_volume', 'cash_only'] } })).toBe(0);
		expect(read).not.toHaveBeenCalled();
		expect((await parts(ids.music)).every(r => r.parts_at)).toBe(true);
	});

	it("creates nothing for a group that is no aspect, a food's name or an aspect that exists", async () => {
		music = { ...music, isAspect: false };
		cash = { ...cash, label: 'Burgers', fits: null };
		let res = await discover(city.id, { dryRun: false });
		expect(res.groups.map(g => [g.outcome, g.aspect])).toEqual([
			['not_aspect', undefined],
			['food', 'burgers'],
		]);
		music = { ...music, isAspect: true, label: 'Price level' };
		cash = { ...cash, label: 'Card payments', fits: 'price_level' };
		res = await discover(city.id, { dryRun: false });
		expect(res.groups.map(g => [g.outcome, g.aspect])).toEqual([
			['fits', 'price_level'],
			['fits', 'price_level'],
		]);
		// About the root as a whole, or labelled as if it were: filed right, nothing created
		music = { ...music, label: 'Music volume', fits: 'vibe' };
		cash = { ...cash, label: 'Overall payment', fits: null };
		res = await discover(city.id, { dryRun: false });
		expect(res.groups.map(g => [g.outcome, g.aspect])).toEqual([
			['root', 'vibe'],
			['root', 'payment'],
		]);
		expect(res.created).toEqual([]);
		expect(read).not.toHaveBeenCalled();
	});

	it('creates the aspects under their roots and has agent B read the loose claims near each again', async () => {
		// The cash group names the aspect the music group just made: it joins it
		cash = { ...cash, label: 'Music volume' };
		const res = await discover(city.id, { dryRun: false });
		expect(res.groups.map(g => [g.outcome, g.aspect])).toEqual([
			['created', 'music_volume'],
			['joined', 'music_volume'],
		]);
		const topic = await em.findOneOrFail(
			Topic,
			{ key: 'music_volume' },
			{ populate: ['edges.to'] },
		);
		expect([
			topic.label,
			topic.kind,
			topic.parent?.key,
			topic.hint,
			!!topic.discoveredAt,
		]).toEqual(['Music volume', 'aspect', 'vibe', 'How loud the music is', true]);
		// Every loose claim near the two groups, the short one too; never the finer-filed or the far one
		const asked = read.mock.calls.flatMap(([opts]) => opts.ids ?? []).sort((a, b) => a - b);
		expect(asked).toEqual([...ids.music, ...ids.cash].sort((a, b) => a - b));
		expect(res.refiled).toBe(25);
		expect((await parts(asked)).every(r => !r.parts_at)).toBe(true);
		expect((await parts([...ids.filed, ...ids.far])).every(r => r.parts_at)).toBe(true);
	});

	it('leaves the claims to the nightly backlog when agent B fails, without failing', async () => {
		read.mockRejectedValueOnce(new Error('No OpenAI account can serve openai/gpt-5.4-mini'));
		music = { ...music, label: 'Music volume again', hint: 'Loudness' };
		cash = { ...cash, label: 'Card payments', hint: 'Cards taken or not' };
		const res = await discover(city.id, { dryRun: false });
		expect(res.created).toEqual(['music_volume_again', 'card_payments']);
		expect(read).toHaveBeenCalledTimes(1);
		// Every claim near the groups is pending for agent B, none was lost
		expect((await parts([...ids.music, ...ids.cash])).every(r => !r.parts_at)).toBe(true);
	});

	it('leaves a group unnamed when its call failed, and decides the others', async () => {
		agent.generate.mockImplementationOnce(async () => {
			throw new Error('The answer does not fit the schema');
		});
		const res = await discover(city.id, { dryRun: true });
		expect(res.groups.map(g => g.outcome)).toEqual(['unnamed', 'created']);
		expect(agent.generate).toHaveBeenCalledTimes(2);
	});

	it('starts the weekly run over the cron cities, one in flight, and runs only those', async () => {
		durable.started.length = 0;
		await harness.moduleRef.get(AspectDiscoverySchedule).weekly();
		expect(durable.started.map(s => [s.args, s.options])).toEqual([
			[
				[{ dryRun: false, cronOnly: true }],
				expect.objectContaining({
					queue: ASPECT_DISCOVERY_QUEUE,
					dedupe: ASPECT_DISCOVERY_DEDUPE,
					onDuplicate: 'return-existing',
				}),
			],
		]);
		expect(await durable.started[0].result).toEqual({ dryRun: false, cities: [] });
		await em
			.getConnection()
			.execute(`update cities set active = true, cron_enabled = true where id = ?`, [
				city.id,
			]);
		expect(
			(await workflow.runAll({ dryRun: true, cronOnly: true })).cities.map(c => c.cityId),
		).toEqual([city.id]);
	});
});
