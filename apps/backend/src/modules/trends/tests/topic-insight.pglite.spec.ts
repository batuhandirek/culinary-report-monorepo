import { NotFoundException } from '@nestjs/common';

import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';

import type { City } from 'src/modules/cities/entities/city.entity.js';
import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { FoodTopicService } from 'src/modules/food-topics/services/food-topic.service.js';
import { VenueFoodTopicService } from 'src/modules/food-topics/services/venue-food-topic.service.js';
import { seedFoodTopics } from 'src/modules/food-topics/tests/factories/food-topic.factory.js';
import { Mention } from 'src/modules/social/entities/mention.entity.js';
import { SocialPlatformEnum, SocialPost } from 'src/modules/social/entities/social-post.entity.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { AdminTopicInsightsController } from '../controllers/admin.topic-insights.controller.js';
import { TrendRelatedQuery } from '../entities/trend-related-query.entity.js';
import {
	SearchTermKindEnum,
	TrendSearchInterest,
} from '../entities/trend-search-interest.entity.js';
import { TopicInsightService } from '../services/topic-insight.service.js';

/* Supply (venues tagged), buzz (the month's posts) and demand (Google searches) per topic, and one
 * topic's page: children, posts by month, related searches, venues. */
describe('TopicInsightService (pglite)', () => {
	let harness: PgliteTestingModule;
	let controller: AdminTopicInsightsController;
	let city: City;

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				TopicInsightService,
				FoodTopicService,
				VenueFoodTopicService,
				AdminTopicInsightsController,
			],
		});
		controller = harness.moduleRef.get(AdminTopicInsightsController);
		entityManagerManager.setEntityManager(harness.orm.em);
		const em = harness.orm.em;
		const topics = seedFoodTopics(em);
		city = testCity(em);
		const ramen = em.create(Venue, {
			city,
			placeId: 'ti-ramen',
			name: 'Ramen Ya',
			category: 'Ramen restaurant',
			district: 'Mitte',
			rating: 4.6,
			reviewsCount: 900,
		});
		const sushi = em.create(Venue, {
			city,
			placeId: 'ti-sushi',
			name: 'Sushi Bar',
			category: 'Sushi restaurant',
		});
		const doner = em.create(Venue, {
			city,
			placeId: 'ti-doner',
			name: 'Döner X',
			category: 'Restaurant',
		});
		em.create(Venue, {
			city,
			placeId: 'ti-closed',
			name: 'Old Ramen',
			category: 'Ramen restaurant',
			closed: true,
		});
		let n = 0;
		const mention = (venue: Venue, cuisine: string, date: string) =>
			em.create(Mention, {
				post: em.create(SocialPost, {
					city,
					externalId: `ti-${n++}`,
					platform: SocialPlatformEnum.TIKTOK,
					url: `https://tiktok.com/ti/${n}`,
					author: `eater${n}`,
					postedAt: new Date(`${date}T12:00:00Z`),
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
		// August: 1 Japanese of 4; September: 4 of 6
		mention(ramen, 'Ramen', '2026-08-10');
		for (let i = 0; i < 3; i++) mention(doner, 'Döner', '2026-08-11');
		for (let i = 0; i < 3; i++) mention(ramen, 'Ramen', '2026-09-10');
		mention(sushi, 'Sushi', '2026-09-11');
		mention(doner, 'Döner', '2026-09-12');
		mention(doner, 'Döner', '2026-09-13');
		const japanese = topics.get('japanese')!;
		const searched = (month: string, interest: number) =>
			em.create(TrendSearchInterest, {
				city,
				kind: SearchTermKindEnum.TOPIC,
				term: 'japanese',
				topic: japanese,
				month,
				interest,
			});
		searched('2026-08', 50);
		searched('2026-09', 60);
		em.create(TrendRelatedQuery, {
			city,
			kind: SearchTermKindEnum.TOPIC,
			term: 'japanese',
			topic: japanese,
			month: '2026-09',
			rising: true,
			rank: 1,
			query: 'onigiri near me',
			value: 400,
			breakout: false,
		});
		await em.flush();
	});

	afterAll(async () => {
		await harness.stop();
	});

	it('ranks the topics with a signal by the month’s posts, with venues, shares and searches', async () => {
		const res = await controller.getTopicInsights({ cityId: city.id, month: '2026-09' });
		expect(res.topics.map(t => t.key)).toEqual([
			'japanese',
			'ramen',
			'kebab',
			'turkish',
			'sushi',
		]);
		expect(res.topics[0]).toMatchObject({
			label: 'Japanese',
			kind: 'cuisine',
			children: 2,
			// Through ramen and sushi; the closed ramen place left out
			venues: 2,
			primaryVenues: 2,
			posts: 4,
			share: 66.7,
			shareChange: 41.7,
			searchChange: 0.2,
		});
		expect(res.topics[0].searches.slice(-3)).toEqual([null, 50, 60]);
		// Döner X is döner by its posts alone ("Restaurant" on Google)
		expect(res.topics[2]).toMatchObject({
			key: 'kebab',
			parentKey: 'turkish',
			venues: 1,
			primaryVenues: 1,
			posts: 2,
		});
	});

	it('opens one topic: children, posts by month, related searches and its venues', async () => {
		const d = await controller.getTopicInsight('japanese', {
			cityId: city.id,
			month: '2026-09',
		});
		expect(d.children.map(c => [c.key, c.venues, c.posts])).toEqual([
			['ramen', 1, 3],
			['sushi', 1, 1],
		]);
		expect(d.postsByMonth.slice(-2)).toEqual([1, 4]);
		expect(d.shareByMonth.slice(-2)).toEqual([25, 66.7]);
		expect(d.related).toEqual({ top: [], rising: [{ query: 'onigiri near me', value: 400 }] });
		expect(d.venues.map(v => [v.name, v.viaLabel, v.primary, v.posts])).toEqual([
			['Ramen Ya', 'Ramen', true, 3],
			['Sushi Bar', 'Sushi', true, 1],
		]);
		expect(d.venues[0]).toMatchObject({ district: 'Mitte', rating: 4.6, source: 'category' });
		expect(d.trendsTopicId).toBe('/m/042ck');

		const ramen = await controller.getTopicInsight('ramen', {
			cityId: city.id,
			month: '2026-09',
		});
		expect(ramen.parent).toEqual({ key: 'japanese', label: 'Japanese' });
		await expect(
			controller.getTopicInsight('nope', { cityId: city.id, month: '2026-09' }),
		).rejects.toThrow(NotFoundException);
	});
});
