import { BadRequestException, ConflictException } from '@nestjs/common';

import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';

import type { City } from 'src/modules/cities/entities/city.entity.js';
import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { PgBossService } from 'src/modules/pgboss/pgboss.service.js';
import { Mention } from 'src/modules/social/entities/mention.entity.js';
import { SocialPlatformEnum, SocialPost } from 'src/modules/social/entities/social-post.entity.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { TOPIC_SEED } from '../constants/topic-seed.constant.js';
import { AdminTopicsController } from '../controllers/admin.topics.controller.js';
import { Topic, TopicKindEnum } from '../entities/topic.entity.js';
import { TopicRelinkJob } from '../jobs/topic-relink.job.js';
import { TopicService } from '../services/topic.service.js';
import { TrendsTopicLookupService } from '../services/trends-topic-lookup.service.js';

import { seedTopics } from './factories/topic.factory.js';

const { ASPECT, DISH } = TopicKindEnum;

/* The topics from the database: the index, the searched ones, the admin's view of a city and edits. */
describe('TopicService (pglite)', () => {
	let harness: PgliteTestingModule;
	let service: TopicService;
	let controller: AdminTopicsController;
	let city: City;
	const pgBoss = { sendJob: jest.fn(async (..._args: unknown[]) => undefined) };
	const relinkQueued = () =>
		pgBoss.sendJob.mock.calls.filter(
			([name, , opts]) =>
				name === TopicRelinkJob.jobName &&
				(opts as { singletonKey?: string })?.singletonKey === TopicRelinkJob.singletonKey,
		).length;

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				TopicService,
				TrendsTopicLookupService,
				AdminTopicsController,
				{ provide: PgBossService, useValue: pgBoss },
			],
		});
		service = harness.moduleRef.get(TopicService);
		controller = harness.moduleRef.get(AdminTopicsController);
		entityManagerManager.setEntityManager(harness.orm.em);

		const em = harness.orm.em;
		seedTopics(em);
		city = testCity(em);
		const other = testCity(em);
		const ramen = em.create(Venue, {
			city,
			placeId: 'ft-ramen',
			name: 'Ramen Ya',
			category: 'Ramen restaurant',
		});
		const doner = em.create(Venue, {
			city,
			placeId: 'ft-doner',
			name: 'Döner X',
			category: 'Restaurant',
		});
		em.create(Venue, { city, placeId: 'ft-hotel', name: 'Hotel Y', category: 'Hotel' });
		em.create(Venue, {
			city: other,
			placeId: 'ft-other',
			name: 'Elsewhere',
			category: 'Ramen restaurant',
		});
		let n = 0;
		const mention = (venue: Venue, cuisine: string | null) =>
			em.create(Mention, {
				post: em.create(SocialPost, {
					city,
					externalId: `ft-${n++}`,
					platform: SocialPlatformEnum.TIKTOK,
					url: `https://tiktok.com/ft/${n}`,
					author: `c${n}`,
					views: 10,
					postedAt: new Date('2026-09-10T12:00:00Z'),
				}),
				venue,
				venueName: venue.name,
				cuisine,
				visited: true,
				sentiment: 'positive',
				summary: 'Good.',
			});
		mention(ramen, 'Tonkotsu ramen');
		mention(ramen, null); // the category: ramen
		mention(doner, 'Vegan Döner');
		mention(doner, 'Cheesesteaks');
		mention(doner, 'Cheesesteaks');
		await em.flush();
	});

	afterAll(async () => {
		await harness.stop();
	});

	it('indexes and searches what the database holds', async () => {
		expect((await service.index()).resolve('Vegan Döner')).toEqual(['vegan', 'kebab']);
		const searched = await service.searched();
		expect(searched).toHaveLength(TOPIC_SEED.filter(s => s.mid).length);
		expect(searched.some(t => t.key === 'bar')).toBe(false);
	});

	it("counts the city's mentions and venues per topic and lists the keys nothing maps", async () => {
		const res = await controller.getTopics({ cityId: city.id });
		const byKey = new Map(res.topics.map(t => [t.key, t]));
		expect(byKey.get('ramen')).toMatchObject({
			label: 'Ramen',
			kind: 'dish',
			parentKey: 'japanese',
			trendsTopicId: '/m/09gms',
			// Not the other city's venue; the parent isn't counted for the child's mentions
			mentions: 2,
			venues: 1,
		});
		expect(byKey.get('japanese')).toMatchObject({ mentions: 0, venues: 0 });
		expect(byKey.get('vegan')?.mentions).toBe(1);
		expect(byKey.get('kebab')?.mentions).toBe(1);
		expect(byKey.get('bar')?.trendsTopicId).toBeUndefined();
		// "Restaurant" says nothing; cheesesteaks are known to no topic; a hotel is no food to map
		expect(res.unmapped).toEqual([
			{ key: 'cheesesteaks', mentions: 2, venues: 0, examples: ['Döner X'] },
		]);
	});

	it('dismisses a word from the list and brings it back', async () => {
		await controller.setIgnoredWord({ word: 'Cheesesteaks', ignored: true });
		await controller.setIgnoredWord({ word: 'cheesesteaks', ignored: true });
		let res = await controller.getTopics({ cityId: city.id });
		expect(res.unmapped).toEqual([]);
		expect(res.ignored).toEqual(['cheesesteaks']);
		await controller.setIgnoredWord({ word: 'cheesesteaks', ignored: false });
		res = await controller.getTopics({ cityId: city.id });
		expect(res.unmapped.map(u => u.key)).toEqual(['cheesesteaks']);
		expect(res.ignored).toEqual([]);
	});

	it('creates a topic keyed by its label and maps an unmapped key as an alias', async () => {
		const created = await controller.createTopic({
			label: 'Philly Cheesesteak',
			kind: TopicKindEnum.DISH,
			parentKey: 'sandwiches',
			trendsTopicId: '/m/0cz5_',
		});
		expect(created).toMatchObject({
			key: 'philly cheesesteak',
			parentKey: 'sandwiches',
			aliases: [],
		});
		await expect(
			controller.createTopic({
				label: 'philly  cheesesteak',
				kind: TopicKindEnum.DISH,
			}),
		).rejects.toThrow(ConflictException);
		await expect(
			controller.createTopic({
				label: 'philly  cheesesteak',
				kind: TopicKindEnum.DISH,
			}),
		).rejects.toThrow('makes the key "philly cheesesteak", which Philly Cheesesteak has');
		await expect(
			controller.createTopic({ label: 'Restaurant', kind: TopicKindEnum.FORMAT }),
		).rejects.toThrow(BadRequestException);

		// One click on an unmapped key: it joins the aliases, trimmed and once
		const updated = await controller.updateTopic(created.id, {
			aliases: [' cheesesteaks', 'Cheesesteaks', 'philly cheesesteak'],
		});
		expect(updated.aliases).toEqual(['cheesesteaks']);
		const res = await controller.getTopics({ cityId: city.id });
		expect(res.topics.find(t => t.key === 'philly cheesesteak')?.mentions).toBe(2);
		expect(res.unmapped).toEqual([]);
	});

	it("refuses another topic's word, an unknown parent and a parent under the topic", async () => {
		const ramen = (await service.all()).find(t => t.key === 'ramen')!;
		await expect(controller.updateTopic(ramen.id, { aliases: ['Döner'] })).rejects.toThrow(
			'"Döner" already means "Döner & kebab"',
		);
		await expect(controller.updateTopic(ramen.id, { parentKey: 'nope' })).rejects.toThrow(
			BadRequestException,
		);
		const japanese = (await service.all()).find(t => t.key === 'japanese')!;
		await expect(
			controller.updateTopic(japanese.id, { parentKey: 'ramen' }),
		).rejects.toThrow('"Ramen" sits under "Japanese"');

		// Null clears; the key never changes
		const cleared = await controller.updateTopic(ramen.id, {
			label: 'Ramen & noodle soups',
			parentKey: null,
			trendsTopicId: null,
			trendsQuery: 'ramen',
		});
		expect(cleared).toMatchObject({
			key: 'ramen',
			label: 'Ramen & noodle soups',
			trendsQuery: 'ramen',
		});
		expect(cleared.parentKey).toBeUndefined();
		expect(cleared.trendsTopicId).toBeUndefined();
		expect((await service.searched()).find(t => t.key === 'ramen')?.trendsQuery).toBe('ramen');
	});

	const stored = async (key: string) => {
		const topic = (await service.all()).find(t => t.key === key);
		if (!topic) throw new Error(`No topic "${key}" stored`);
		return topic;
	};

	it('creates an aspect keyed by its label, with its hint, and puts it in the legend under its root', async () => {
		pgBoss.sendJob.mockClear();
		const created = await controller.createTopic({
			label: 'Tip prompts',
			kind: ASPECT,
			parentKey: 'payment',
			hint: ' a tip asked for on the card terminal ',
		});
		expect(created).toMatchObject({
			key: 'tip_prompts',
			label: 'Tip prompts',
			kind: 'aspect',
			parentKey: 'payment',
			hint: 'a tip asked for on the card terminal',
			aliases: [],
		});
		expect(created.trendsTopicId).toBeUndefined();
		expect(relinkQueued()).toBe(1);
		const index = await service.index();
		expect(index.aspect('tip_prompts')).toEqual({
			id: created.id,
			key: 'tip_prompts',
			root: 'payment',
		});
		expect(index.promptLabel('tip_prompts')).toBe('payment / tip prompts');
		const legend = index.aspectLegend();
		const at = (part: string) => {
			const i = legend.indexOf(part);
			if (i < 0) throw new Error(`Legend lacks "${part}": ${legend}`);
			return i;
		};
		const added = at(', tip_prompts (a tip asked for on the card terminal)');
		expect(added).toBeGreaterThan(at('; payment: payment (about paying, when nothing finer fits), '));
		expect(added).toBeLessThan(at('; wait: wait ('));
		// Never a kind of food: the cuisine lookup doesn't know it
		expect(index.resolve('Tip prompts')).toEqual([]);
		expect(index.food.some(t => t.key === 'tip_prompts')).toBe(false);

		// 409 for the key again (whatever the spacing), 400 for a label that leaves no key
		await expect(
			controller.createTopic({ label: 'Tip  Prompts!', kind: ASPECT, parentKey: 'payment' }),
		).rejects.toThrow(ConflictException);
		await expect(controller.createTopic({ label: '!!!', kind: ASPECT })).rejects.toThrow(
			BadRequestException,
		);
	});

	it('keeps the kinds of food and the aspects on their own sides of the tree', async () => {
		const em = harness.orm.em;
		// A failed create leaves nothing behind for the next flush
		const refused = async (fn: () => Promise<unknown>, error: unknown) => {
			await expect(fn()).rejects.toThrow(error);
			em.clear();
		};
		await refused(
			() => controller.createTopic({ label: 'Crust', kind: ASPECT, parentKey: 'pizza' }),
			'"Pizza" is a kind of food: an aspect sits under an aspect',
		);
		await refused(
			() => controller.createTopic({ label: 'Goulash', kind: DISH, parentKey: 'food' }),
			'"Food" is an aspect: a kind of food sits under a kind of food',
		);
		const taste = await stored('taste');
		const sushi = await stored('sushi');
		await refused(() => controller.updateTopic(taste.id, { parentKey: 'pizza' }), BadRequestException);
		await refused(() => controller.updateTopic(sushi.id, { parentKey: 'food' }), BadRequestException);

		// An aspect has no aliases and is not searched on Trends
		await refused(
			() => controller.updateTopic(taste.id, { aliases: ['flavour'] }),
			'An aspect has no aliases',
		);
		await refused(
			() => controller.updateTopic(taste.id, { trendsTopicId: '/m/0abc' }),
			'not searched on Google Trends',
		);
		await refused(
			() => controller.updateTopic(taste.id, { trendsQuery: 'taste' }),
			'not searched on Google Trends',
		);
		await refused(
			() => controller.createTopic({ label: 'Dough', kind: ASPECT, parentKey: 'food', aliases: ['pizza dough'] }),
			'An aspect has no aliases',
		);

		// A stored topic never crosses the border
		await refused(() => controller.updateTopic(taste.id, { kind: DISH }), 'is an aspect');
		await refused(
			() => controller.updateTopic(sushi.id, { kind: ASPECT }),
			"can't become an aspect",
		);

		// Empty aliases pass; the hint is trimmed, and blank clears it
		expect(
			await controller.updateTopic(taste.id, { aliases: [], hint: '  how it tasted  ' }),
		).toMatchObject({ key: 'taste', kind: 'aspect', parentKey: 'food', hint: 'how it tasted' });
		expect((await controller.updateTopic(taste.id, { hint: '  ' })).hint).toBeUndefined();
		expect((await service.index()).aspectLegend()).toContain(', taste, ');
	});

	it('stores nothing for a create it refuses after the key check', async () => {
		// The three refused above: a parent on the other side of the tree, aliases on an aspect
		expect(
			(await harness.orm.em.find(Topic, { key: { $in: ['crust', 'goulash', 'dough'] } })).map(
				t => t.key,
			),
		).toEqual([]);
	});

	it('deletes a leaf aspect, never a kind of food, a root or a parent, and queues the re-link', async () => {
		const tipPrompts = await stored('tip_prompts');
		const jar = await service.create({ label: 'Tip jar', kind: ASPECT, parentKey: 'tip_prompts' });
		expect((await service.index()).promptLabel('tip_jar')).toBe('payment / tip jar');
		await expect(service.remove((await stored('pizza')).id)).rejects.toThrow(
			'"Pizza" is a kind of food: topics are edited, never deleted',
		);
		await expect(service.remove((await stored('wait')).id)).rejects.toThrow(
			'"Waiting" is a root: the roots stay',
		);
		await expect(service.remove(tipPrompts.id)).rejects.toThrow(
			'"Tip prompts" has 1 aspects under it: move or delete them first',
		);

		pgBoss.sendJob.mockClear();
		await controller.deleteTopic(jar.id);
		expect(relinkQueued()).toBe(1);
		expect((await service.all()).some(t => t.id === jar.id)).toBe(false);
		expect((await service.index()).aspect('tip_jar')).toBeUndefined();
		// Gone for good, not soft-deleted: the key is free again
		expect(await harness.orm.em.count(Topic, { key: 'tip_jar' })).toBe(0);
		// Its parent is a leaf now
		await service.remove(tipPrompts.id);
		expect((await service.index()).descendants('payment')).not.toContain('tip_prompts');
		expect(relinkQueued()).toBe(2);
	});
});
