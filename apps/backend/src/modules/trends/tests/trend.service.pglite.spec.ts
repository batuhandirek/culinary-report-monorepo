import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import _ from 'lodash';

import type { City } from 'src/modules/cities/entities/city.entity.js';
import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { addFeedback } from 'src/modules/feedback/tests/factories/feedback.factory.js';
import { FoodTopicService } from 'src/modules/food-topics/services/food-topic.service.js';
import { seedFoodTopics, linkFoodTopics } from 'src/modules/food-topics/tests/factories/food-topic.factory.js';
import { Mention } from 'src/modules/social/entities/mention.entity.js';
import { SocialAccount } from 'src/modules/social/entities/social-account.entity.js';
import { SocialPlatformEnum, SocialPost } from 'src/modules/social/entities/social-post.entity.js';
import { ownAccount, socialAccountFactory } from 'src/modules/social/tests/factories/social-account.factory.js';
import { Review } from 'src/modules/venues/entities/review.entity.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { TrendService } from '../services/trend.service.js';

describe('TrendService (pglite)', () => {
	let harness: PgliteTestingModule;
	let service: TrendService;
	let city: City;

	beforeAll(async () => {
		harness = await createPgliteTestingModule({ providers: [TrendService, FoodTopicService] });
		service = harness.moduleRef.get(TrendService);
		entityManagerManager.setEntityManager(harness.orm.em);
		seedFoodTopics(harness.orm.em);

		const em = harness.orm.em;
		city = testCity(em);
		const pho = em.create(Venue, {
			city,
			placeId: 'pho',
			name: 'Pho House',
			category: 'Vietnamese restaurant',
			district: 'Mitte',
		});
		const doner = em.create(Venue, {
			city,
			placeId: 'doner',
			name: 'Döner X',
			category: 'Kebab shop',
			district: 'Friedrichshain-Kreuzberg',
		});
		const kebap = em.create(Venue, {
			city,
			placeId: 'kebap',
			name: 'Kebap Y',
			category: 'Kebab shop',
			district: 'Neukölln',
		});

		// The venues' brands come with the flush; each author has an account (and a creator)
		await em.flush();
		// Dish rows get their food topic as the writer resolves it
		const index = await harness.moduleRef.get(FoodTopicService).index();
		const accounts = new Map<string, SocialAccount>([['donerx', ownAccount(em, doner.brand, city, 'donerx')]]);
		let n = 0;
		const mention = (
			venue: Venue,
			date: string,
			cuisine: string,
			dishes: string[] = [],
			author = `creator${n}`,
		) => {
			const account =
				accounts.get(author) ??
				socialAccountFactory.build({ handle: author }, { associations: { city: venue.city }, transient: { em } });
			accounts.set(author, account);
			const post = em.create(SocialPost, {
				city: venue.city,
				externalId: `post-${n++}`,
				platform: SocialPlatformEnum.TIKTOK,
				url: `https://tiktok.com/${n}`,
				author,
				account,
				views: 100,
				postedAt: new Date(`${date}T12:00:00Z`),
			});
			addFeedback(
				em,
				em.create(Mention, {
					post,
					venue,
					venueName: venue.name,
					cuisine,
					visited: true,
					sentiment: 'positive',
					summary: 'Good.',
				}),
				{ dishes: dishes.map(name => ({ name, sentiment: 'positive' as const })) },
				{ index },
			);
		};
		// August: half Vietnamese, half döner
		mention(pho, '2026-08-05', 'Vietnamese');
		mention(doner, '2026-08-06', 'Döner');
		// September: three spellings of döner against one of Vietnamese
		mention(pho, '2026-09-05', 'Viet', ['Pho']);
		mention(doner, '2026-09-06', 'Kebap', ['Döner', 'döner']);
		mention(kebap, '2026-09-07', 'Turkish/Kebab', ['doner kebab', 'Vegetable kebab']);
		mention(kebap, '2026-09-08', 'doner kebab', ['Kebabs', 'Döner Kebab']);
		// The venue's own account: not word of mouth, so no pizza in the tables
		mention(doner, '2026-09-09', 'Pizza', ['Pizza'], 'donerx');
		// Another city's talk stays in that city's trends
		const wien = em.create(Venue, {
			city: testCity(em, { name: 'Wien' }),
			placeId: 'schnitzel',
			name: 'Schnitzelwirt',
			category: 'Austrian restaurant',
		});
		mention(wien, '2026-09-05', 'Austrian', ['Schnitzel']);
		addFeedback(
			em,
			em.create(Review, {
				venue: doner,
				reviewId: 'r1',
				stars: 5,
				publishedAt: new Date('2026-09-10T00:00:00Z'),
			}),
			{
				dishes: [
					{ name: 'Döner', sentiment: 'positive' },
					{ name: 'Ayran', sentiment: 'positive' },
				],
			},
			{ index },
		);
		await em.flush();
		// The stored food-topic links, as the app's writers and refresh keep them
		await linkFoodTopics(em);
	});

	afterAll(async () => {
		await harness.stop();
	});

	it('merges cuisine spellings and gives the delta in share points', async () => {
		const trends = await service.month('2026-09', city.id);
		expect(trends.previousMonth).toBe('2026-08');
		expect(
			trends.cuisines.map(r => _.pick(r, ['key', 'count', 'share', 'prevShare', 'delta'])),
		).toEqual([
			{ key: 'kebab', count: 3, share: 75, prevShare: 50, delta: 25 },
			{ key: 'vietnamese', count: 1, share: 25, prevShare: 50, delta: -25 },
		]);
		expect(trends.cuisines[0].label).toBe('Döner & kebab');
		expect(trends.cuisines[0].sampleVenues?.map(v => v.name)).toEqual(['Kebap Y', 'Döner X']);
		expect(trends.totals).toMatchObject({ mentions: 4, posts: 4 });
	});

	it('groups the names of one food topic, counts each row once per post or review, and every table adds up to 100', async () => {
		const trends = await service.month('2026-09', city.id);
		// "Döner", "doner kebab", "Kebabs": the kebab topic's row; "Vegetable kebab" is no alias of it
		expect(trends.dishes.map(r => [r.key, r.label, r.count, r.share])).toEqual([
			['kebab', 'Döner & kebab', 4, 57.1],
			['ayran', 'Ayran', 1, 14.3],
			['pho', 'Pho', 1, 14.3],
			['vegetable kebab', 'Vegetable kebab', 1, 14.3],
		]);
		for (const table of [trends.cuisines, trends.dishes, trends.districts, trends.creators]) {
			expect(_.sumBy(table, r => r.share)).toBeCloseTo(100, 0);
		}
		expect(trends.creators.every(r => r.key !== 'donerx')).toBe(true);
	});

	it('lists brands new in the top 50 as rising', async () => {
		const trends = await service.month('2026-09', city.id);
		const rising = trends.risingBrands.find(r => r.name === 'Kebap Y');
		expect(rising).toMatchObject({ posts: 2, rank: 1, prevPosts: 0 });
		expect(rising?.prevRank).toBeUndefined();
	});
});
