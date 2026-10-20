import { BadRequestException, ConflictException } from '@nestjs/common';

import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';

import type { City } from 'src/modules/cities/entities/city.entity.js';
import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { Mention } from 'src/modules/social/entities/mention.entity.js';
import { SocialPlatformEnum, SocialPost } from 'src/modules/social/entities/social-post.entity.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { FOOD_TOPIC_SEED } from '../constants/food-topic-seed.constant.js';
import { AdminFoodTopicsController } from '../controllers/admin.food-topics.controller.js';
import { FoodTopicKindEnum } from '../entities/food-topic.entity.js';
import { FoodTopicService } from '../services/food-topic.service.js';
import { TrendsTopicLookupService } from '../services/trends-topic-lookup.service.js';

import { seedFoodTopics } from './factories/food-topic.factory.js';

/* The topics from the database: the index, the searched ones, the admin's view of a city and edits. */
describe('FoodTopicService (pglite)', () => {
	let harness: PgliteTestingModule;
	let service: FoodTopicService;
	let controller: AdminFoodTopicsController;
	let city: City;

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [FoodTopicService, TrendsTopicLookupService, AdminFoodTopicsController],
		});
		service = harness.moduleRef.get(FoodTopicService);
		controller = harness.moduleRef.get(AdminFoodTopicsController);
		entityManagerManager.setEntityManager(harness.orm.em);

		const em = harness.orm.em;
		seedFoodTopics(em);
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
				dishes: [],
				praise: [],
				complaints: [],
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
		expect(searched).toHaveLength(FOOD_TOPIC_SEED.filter(s => s.mid).length);
		expect(searched.some(t => t.key === 'bar')).toBe(false);
	});

	it("counts the city's mentions and venues per topic and lists the keys nothing maps", async () => {
		const res = await controller.getFoodTopics({ cityId: city.id });
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
		let res = await controller.getFoodTopics({ cityId: city.id });
		expect(res.unmapped).toEqual([]);
		expect(res.ignored).toEqual(['cheesesteaks']);
		await controller.setIgnoredWord({ word: 'cheesesteaks', ignored: false });
		res = await controller.getFoodTopics({ cityId: city.id });
		expect(res.unmapped.map(u => u.key)).toEqual(['cheesesteaks']);
		expect(res.ignored).toEqual([]);
	});

	it('creates a topic keyed by its label and maps an unmapped key as an alias', async () => {
		const created = await controller.createFoodTopic({
			label: 'Philly Cheesesteak',
			kind: FoodTopicKindEnum.DISH,
			parentKey: 'sandwiches',
			trendsTopicId: '/m/0cz5_',
		});
		expect(created).toMatchObject({
			key: 'philly cheesesteak',
			parentKey: 'sandwiches',
			aliases: [],
		});
		await expect(
			controller.createFoodTopic({
				label: 'philly  cheesesteak',
				kind: FoodTopicKindEnum.DISH,
			}),
		).rejects.toThrow(ConflictException);
		await expect(
			controller.createFoodTopic({ label: 'Restaurant', kind: FoodTopicKindEnum.FORMAT }),
		).rejects.toThrow(BadRequestException);

		// One click on an unmapped key: it joins the aliases, trimmed and once
		const updated = await controller.updateFoodTopic(created.id, {
			aliases: [' cheesesteaks', 'Cheesesteaks', 'philly cheesesteak'],
		});
		expect(updated.aliases).toEqual(['cheesesteaks']);
		const res = await controller.getFoodTopics({ cityId: city.id });
		expect(res.topics.find(t => t.key === 'philly cheesesteak')?.mentions).toBe(2);
		expect(res.unmapped).toEqual([]);
	});

	it("refuses another topic's word, an unknown parent and a parent under the topic", async () => {
		const ramen = (await service.all()).find(t => t.key === 'ramen')!;
		await expect(controller.updateFoodTopic(ramen.id, { aliases: ['Döner'] })).rejects.toThrow(
			'"Döner" already means "Döner & kebab"',
		);
		await expect(controller.updateFoodTopic(ramen.id, { parentKey: 'nope' })).rejects.toThrow(
			BadRequestException,
		);
		const japanese = (await service.all()).find(t => t.key === 'japanese')!;
		await expect(
			controller.updateFoodTopic(japanese.id, { parentKey: 'ramen' }),
		).rejects.toThrow('"Ramen" sits under "Japanese"');

		// Null clears; the key never changes
		const cleared = await controller.updateFoodTopic(ramen.id, {
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
});
