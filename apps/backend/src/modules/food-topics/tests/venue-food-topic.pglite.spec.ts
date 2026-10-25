import { BadRequestException } from '@nestjs/common';

import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';

import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { Mention } from 'src/modules/social/entities/mention.entity.js';
import { SocialPlatformEnum, SocialPost } from 'src/modules/social/entities/social-post.entity.js';
import { ownAccount } from 'src/modules/social/tests/factories/social-account.factory.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { AdminVenueFoodTopicsController } from '../controllers/admin.venue-food-topics.controller.js';
import { FoodTopicService } from '../services/food-topic.service.js';
import { VenueFoodTopicService } from '../services/venue-food-topic.service.js';

import { seedFoodTopics, linkFoodTopics } from './factories/food-topic.factory.js';

/* A venue's food topics from its categories and posts by others, and an admin's tags on top. */
describe('VenueFoodTopicService (pglite)', () => {
	let harness: PgliteTestingModule;
	let controller: AdminVenueFoodTopicsController;
	let venue: Venue;

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [FoodTopicService, VenueFoodTopicService, AdminVenueFoodTopicsController],
		});
		controller = harness.moduleRef.get(AdminVenueFoodTopicsController);
		entityManagerManager.setEntityManager(harness.orm.em);
		const em = harness.orm.em;
		seedFoodTopics(em);
		const city = testCity(em);
		venue = em.create(Venue, {
			city,
			placeId: 'vft',
			name: 'Pho Sang',
			category: 'Asian restaurant',
		});
		// Its brand comes with the flush, and its own account is linked to it
		await em.flush();
		const own = ownAccount(em, venue.brand, city, 'phosang');
		let n = 0;
		const mention = (cuisine: string, author: string) =>
			em.create(Mention, {
				post: em.create(SocialPost, {
					city,
					externalId: `vft-${n++}`,
					platform: SocialPlatformEnum.TIKTOK,
					url: `https://tiktok.com/vft/${n}`,
					author,
					account: author === own.handle ? own : undefined,
					postedAt: new Date('2026-09-10T12:00:00Z'),
				}),
				venue,
				venueName: venue.name,
				cuisine,
				visited: true,
				sentiment: 'positive',
				summary: 'Good.',
			});
		mention('Pho, Vietnamese', 'eater1');
		mention('Pho', 'eater2');
		// Its own account calling itself Thai twice says nothing about what others call it
		mention('Thai', 'phosang');
		mention('Thai', 'phosang');
		await em.flush();
		// The stored food-topic links, as the app's writers and refresh keep them
		await linkFoodTopics(em);
	});

	afterAll(async () => {
		await harness.stop();
	});

	it('tags it from its category and its posts by others, the main category primary', async () => {
		const res = await controller.getVenueFoodTopics(venue.id);
		expect(res.tags.map(t => [t.key, t.source, t.primary])).toEqual([
			['asian', 'category', true],
			['pho', 'mentions', false],
		]);
		expect(res.tags[1]).toMatchObject({ label: 'Pho', kind: 'dish', score: 1 });
		expect(res.excluded).toEqual([]);
	});

	it("tags, excludes and clears an admin's word", async () => {
		let res = await controller.changeVenueFoodTopic(venue.id, 'vietnamese', { change: 'tag' });
		// An admin's tag comes first for primary
		expect(res.tags.map(t => t.key)).toEqual(['vietnamese', 'asian', 'pho']);
		expect(res.tags[0]).toMatchObject({ source: 'manual', primary: true });

		res = await controller.changeVenueFoodTopic(venue.id, 'asian', { change: 'exclude' });
		expect(res.tags.map(t => t.key)).toEqual(['vietnamese', 'pho']);
		expect(res.excluded).toEqual([{ key: 'asian', label: 'Asian' }]);

		res = await controller.changeVenueFoodTopic(venue.id, 'asian', { change: 'clear' });
		expect(res.tags.map(t => t.key)).toEqual(['vietnamese', 'asian', 'pho']);
		expect(res.excluded).toEqual([]);

		await expect(
			controller.changeVenueFoodTopic(venue.id, 'nope', { change: 'tag' }),
		).rejects.toThrow(BadRequestException);
	});
});
