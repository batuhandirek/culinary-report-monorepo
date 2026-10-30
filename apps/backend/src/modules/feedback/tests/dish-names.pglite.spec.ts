import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';

import type { City } from 'src/modules/cities/entities/city.entity.js';
import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { TopicKindEnum } from 'src/modules/topics/entities/topic.entity.js';
import { TopicService } from 'src/modules/topics/services/topic.service.js';
import { TopicRelinkService } from 'src/modules/topics/services/topic-relink.service.js';
import {
	seedTopics,
	seedIndex,
} from 'src/modules/topics/tests/factories/topic.factory.js';
import { PgBossService } from 'src/modules/pgboss/pgboss.service.js';
import { Review } from 'src/modules/venues/entities/review.entity.js';
import type { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { venueFactory } from 'src/modules/venues/tests/factories/venue.factory.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { mockAgent } from 'src/tests/mock-agent.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { DishTopicAgent } from '../agents/dish-topic.agent.js';
import { AdminDishNamesController } from '../controllers/admin.dish-names.controller.js';
import { DishName } from '../entities/dish-name.entity.js';
import { FeedbackPoint } from '../entities/feedback-point.entity.js';
import { DishNameService } from '../services/dish-name.service.js';

import { addFeedback } from './factories/feedback.factory.js';

describe('Dish names', () => {
	let harness: PgliteTestingModule;
	let city: City;
	let venue: Venue;
	const pgBoss = { sendJob: jest.fn(async () => 'job-id') };
	// What the agent answers, by name
	const ANSWERS: Record<string, { topic: string | null; newTopic: string | null }> = {
		spaghettiiiossso: { topic: 'pasta', newTopic: null },
		'vegan döner': { topic: 'kebab', newTopic: null },
		pommes: { topic: null, newTopic: 'Fries' },
		sauce: { topic: null, newTopic: 'Sauces' },
		// A cuisine is no dish: stored as none
		'italian food': { topic: 'italian', newTopic: 'Pasta' },
	};
	const agent = mockAgent((prompt: unknown) => {
		const { names, topics } = JSON.parse(prompt as string) as {
			names: { id: string; name: string }[];
			topics: { key: string }[];
		};
		// Only dish and drink topics are offered
		expect(topics.map(t => t.key).sort()).toEqual(['burgers', 'kebab', 'pasta']);
		return {
			names: names.map(n => ({
				id: n.id,
				...(ANSWERS[n.name.toLowerCase()] ?? { topic: null, newTopic: null }),
			})),
		};
	});
	const service = () => harness.moduleRef.get(DishNameService);
	const em = () => harness.orm.em;

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				DishNameService,
				TopicService,
				TopicRelinkService,
				AdminDishNamesController,
				{ provide: PgBossService, useValue: pgBoss },
				{ provide: DishTopicAgent, useValue: agent },
			],
		});
		entityManagerManager.setEntityManager(harness.orm.em);
		harness.moduleRef.get(DishNameService).onModuleInit();
		seedTopics(em(), ['burgers', 'kebab', 'pasta']);
		city = testCity(em());
		venue = venueFactory.build(
			{ name: 'Trattoria Eck', category: 'Italian restaurant' },
			{ associations: { city } },
		);
		let n = 0;
		const review = () =>
			em().create(Review, {
				venue,
				reviewId: `dn-${n++}`,
				publishedAt: new Date('2026-09-10T12:00:00Z'),
				stars: 5,
				text: 'Spaghettiiiossso was extraordinary',
			});
		// As extraction stored them: a name that is a topic as a whole linked, the rest not
		const index = seedIndex();
		addFeedback(
			em(),
			review(),
			{
				praise: [
					{
						topic: 'food',
						theme: 'taste',
						detail: 'Spaghettiiiossso was extraordinary',
						dish: 'Spaghettiiiossso',
					},
				],
				dishes: [
					{ name: 'Spaghettiiiossso', sentiment: 'positive' },
					{ name: 'Dürüm', sentiment: 'positive' },
					{ name: 'Pommes', sentiment: 'negative' },
					{ name: 'sauce', sentiment: 'neutral' },
				],
			},
			{ index },
		);
		addFeedback(
			em(),
			review(),
			{
				dishes: [
					{ name: 'pommes', sentiment: 'positive' },
					{ name: 'vegan döner', sentiment: 'positive' },
					{ name: 'Italian food', sentiment: 'positive' },
				],
			},
			{ index },
		);
		await em().flush();
	});

	afterAll(async () => {
		await harness.stop();
	});

	const topicsOfRows = async () => {
		const rows = await em()
			.fork()
			.find(
				FeedbackPoint,
				{ dish: { $ne: null } },
				{ populate: ['foodTopic'], orderBy: { id: 'asc' } },
			);
		return Object.fromEntries(rows.map(r => [r.dish, r.foodTopic?.key ?? null]));
	};
	const names = async () =>
		Object.fromEntries(
			(
				await em()
					.fork()
					.find(DishName, {}, { populate: ['foodTopic'] })
			).map(d => [
				d.key,
				[d.foodTopic?.key ?? null, d.decidedBy ?? null, d.suggestion ?? null],
			]),
		);

	it('stores each name once, decided by a name match where it is a topic, the rest waiting', async () => {
		expect(await service().countPending()).toBe(6);
		expect(await service().sync(await harness.moduleRef.get(TopicService).index())).toEqual(
			{
				added: 6,
				rows: 1,
			},
		);
		expect(await names()).toEqual({
			spaghettiiiossso: [null, null, null],
			durum: ['kebab', 'match', null],
			pomme: [null, null, null],
			sauce: [null, null, null],
			'vegan doner': [null, null, null],
			'italian food': [null, null, null],
		});
		// The rows' spelling the most: "Pommes" and "pommes" are one name
		expect((await em().fork().findOneOrFail(DishName, { key: 'pomme' })).name).toMatch(
			/^[Pp]ommes$/,
		);
		expect(await service().countPending()).toBe(5);
		// The rows of a name match follow it, though stored unlinked
		expect((await topicsOfRows())['Dürüm']).toBe('kebab');
	});

	it('lets the agent decide the rest once, keeps its suggestions, and gives the rows their topic', async () => {
		const res = await service().decide({ limit: 100 });
		expect(res).toMatchObject({ looked: 5, linked: 2 });
		expect(await names()).toMatchObject({
			spaghettiiiossso: ['pasta', 'ai', null],
			'vegan doner': ['kebab', 'ai', null],
			pomme: [null, 'ai', 'Fries'],
			sauce: [null, 'ai', 'Sauces'],
			// Its suggestion named a topic it passed over: dropped
			'italian food': [null, 'ai', null],
		});
		expect(await topicsOfRows()).toEqual({
			Spaghettiiiossso: 'pasta',
			Dürüm: 'kebab',
			Pommes: null,
			sauce: null,
			pommes: null,
			'vegan döner': 'kebab',
			'Italian food': null,
		});
		// Asked once
		expect(await service().countPending()).toBe(0);
		expect(await service().decide({ limit: 100 })).toMatchObject({ looked: 0 });
		expect(agent.generate).toHaveBeenCalledTimes(1);
	});

	it("links a new row by its name's decision, and an undecided name by a name match", async () => {
		const topics = await service().dishTopics();
		const id = (key: string) => topics.index.get(key)!.id;
		expect(topics.topicId('spaghettiiiossso')).toBe(id('pasta'));
		expect(topics.topicId('Vegan Döner')).toBe(id('kebab'));
		expect(topics.topicId('pommes')).toBeNull();
		expect(topics.topicId('Kebabs')).toBe(id('kebab'));
		expect(topics.topicId('Lahmacun deluxe')).toBeNull();
	});

	it("lists the city's names with their rows and the suggested topics", async () => {
		const controller = harness.moduleRef.get(AdminDishNamesController);
		const list = await controller.getDishNames({ cityId: city.id, status: 'all' });
		expect(list.summary).toEqual({
			names: 6,
			notes: 7,
			linkedNames: 3,
			linkedNotes: 3,
			pendingNames: 0,
		});
		expect(list.suggestions).toEqual([
			{ label: 'Fries', names: 1, notes: 2, examples: [expect.stringMatching(/ommes/)] },
			{ label: 'Sauces', names: 1, notes: 1, examples: ['sauce'] },
		]);
		// Most noted first
		expect(list.names.map(n => [n.key, n.notes])[0]).toEqual(['pomme', 2]);
		expect(list.names.find(n => n.key === 'spaghettiiiossso')).toMatchObject({
			notes: 1,
			foodTopic: { key: 'pasta', label: 'Pasta' },
			decidedBy: 'ai',
		});
		// Unlinked by default: decided, no topic
		const unlinked = await controller.getDishNames({ cityId: city.id });
		expect(unlinked.names.map(n => n.key)).toEqual(['pomme', 'italian food', 'sauce']);
		expect(
			(
				await controller.getDishNames({
					cityId: city.id,
					status: 'all',
					suggestion: 'fries',
				})
			).names.map(n => n.key),
		).toEqual(['pomme']);
		// A suggestion matches across plurals
		expect(
			(
				await controller.getDishNames({
					cityId: city.id,
					status: 'all',
					suggestion: 'Sauce',
				})
			).names.map(n => n.key),
		).toEqual(['sauce']);
		expect(
			(
				await controller.getDishNames({ cityId: city.id, status: 'all', q: 'vegan' })
			).names.map(n => n.key),
		).toEqual(['vegan doner']);
	});

	it("takes an admin's choice, which its rows follow and nothing else changes", async () => {
		const controller = harness.moduleRef.get(AdminDishNamesController);
		const italian = await em().fork().findOneOrFail(DishName, { key: 'italian food' });
		const saved = await controller.updateDishName(italian.id, { topicKey: 'pasta' });
		expect(saved).toMatchObject({
			key: 'italian food',
			decidedBy: 'admin',
			foodTopic: { key: 'pasta' },
		});
		expect((await topicsOfRows())['Italian food']).toBe('pasta');
		await expect(
			controller.updateDishName(italian.id, { topicKey: 'italian' }),
		).rejects.toThrow('No dish or drink topic');
		await expect(controller.updateDishName(999_999, { topicKey: null })).rejects.toThrow(
			'No dish name',
		);
		await expect(controller.updateDishName(italian.id, {})).rejects.toThrow('Give a topic');

		// Back to automatic: no name match, so it waits for the agent
		const sauce = await em().fork().findOneOrFail(DishName, { key: 'sauce' });
		expect(await controller.updateDishName(sauce.id, { auto: true })).not.toHaveProperty(
			'decidedBy',
		);
		await controller.updateDishName(sauce.id, { topicKey: null });
		expect((await names())['sauce']).toEqual([null, 'admin', 'Sauces']);
	});

	it('re-links after topics change: a new topic takes the names that suggested it, re-opens the agent\'s other "none" answers, keeps admins\'', async () => {
		const topics = harness.moduleRef.get(TopicService);
		await topics.create({ label: 'Fries', kind: TopicKindEnum.DISH });
		const counts = await harness.moduleRef.get(TopicRelinkService).relinkAll();
		expect(counts['dish-names']).toMatchObject({
			added: 0,
			bySuggestion: 1,
			reopened: 0,
			rows: 2,
		});
		expect(await names()).toMatchObject({
			pomme: ['fries', 'ai', null],
			sauce: [null, 'admin', 'Sauces'],
			'italian food': ['pasta', 'admin', null],
			durum: ['kebab', 'match', null],
		});
		expect((await topicsOfRows()).Pommes).toBe('fries');

		// A name that becomes another name of a topic takes it over the agent's answer, and one whose
		// match goes waits for the agent again
		const kebab = (await topics.all()).find(t => t.key === 'kebab')!;
		await topics.update(kebab.id, {
			aliases: [...kebab.aliases.filter(a => a !== 'durum'), 'vegan doner'],
		});
		const again = await harness.moduleRef.get(TopicRelinkService).relinkAll();
		expect(again['dish-names']).toMatchObject({ matched: 1, reopened: 1 });
		expect(await names()).toMatchObject({
			'vegan doner': ['kebab', 'match', null],
			durum: [null, null, null],
		});
		expect((await topicsOfRows())['Dürüm']).toBeNull();
	});

	it('re-opens an agent "none" once a dish or drink topic is created after it, dropping a suggestion of an older topic', async () => {
		const dish = await em().fork().findOneOrFail(DishName, { key: 'pomme' });
		const topics = harness.moduleRef.get(TopicService);
		const burgersAt = (await topics.all()).find(t => t.key === 'burgers')!.createdAt.getTime();
		// Pretend the agent had answered none for it, suggesting a topic that existed, before the next topic
		await em()
			.fork()
			.nativeUpdate(
				DishName,
				{ id: dish.id },
				{
					foodTopic: null,
					suggestion: 'Burgers',
					decidedBy: 'ai',
					decidedAt: new Date(burgersAt + 1),
				},
			);
		em().clear();
		await topics.create({ label: 'Hummus', kind: TopicKindEnum.DISH });
		const counts = await harness.moduleRef.get(TopicRelinkService).relinkAll();
		// Hummus may fit it: it waits for the agent again
		expect(counts['dish-names']).toMatchObject({ dropped: 1, reopened: 1 });
		expect((await names()).pomme).toEqual([null, null, null]);
	});
});
