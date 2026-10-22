import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';

import type { City } from 'src/modules/cities/entities/city.entity.js';
import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { FoodTopicService } from 'src/modules/food-topics/services/food-topic.service.js';
import { VenueFoodTopicService } from 'src/modules/food-topics/services/venue-food-topic.service.js';
import { seedFoodTopics } from 'src/modules/food-topics/tests/factories/food-topic.factory.js';
import { Mention } from 'src/modules/social/entities/mention.entity.js';
import type { SocialAccount } from 'src/modules/social/entities/social-account.entity.js';
import { SocialPlatformEnum, SocialPost } from 'src/modules/social/entities/social-post.entity.js';
import { ownAccount } from 'src/modules/social/tests/factories/social-account.factory.js';
import { Review } from 'src/modules/venues/entities/review.entity.js';
import type { Venue } from 'src/modules/venues/entities/venue.entity.js';
import type { FeedbackPoint } from 'src/modules/venues/interfaces/feedback.interface.js';
import { venueFactory } from 'src/modules/venues/tests/factories/venue.factory.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { AdminThemeInsightsController } from '../controllers/admin.theme-insights.controller.js';
import type { AdminThemeInsightsOutputDto } from '../dto/admin-theme-insights.dto.js';
import { ThemeInsightService } from '../services/theme-insight.service.js';

const increase = (detail: string): FeedbackPoint => ({ topic: 'price', theme: 'price_increase', detail });
const taste = (detail: string): FeedbackPoint => ({ topic: 'food', theme: 'taste', detail });

/* A city's praise and complaints per theme across venues: a review or a post counts once per theme
 * and polarity, own posts and unmatched mentions are out, unfiled points count under no theme;
 * by kind of food, a brand's being its places' main food. */
describe('ThemeInsightService (pglite)', () => {
	let harness: PgliteTestingModule;
	let result: AdminThemeInsightsOutputDto;
	let cityId: string;

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [ThemeInsightService, AdminThemeInsightsController, FoodTopicService, VenueFoodTopicService],
		});
		entityManagerManager.setEntityManager(harness.orm.em);
		const em = harness.orm.em;
		seedFoodTopics(em, ['kebab', 'cafe']);
		const city: City = testCity(em);
		const elsewhere: City = testCity(em, { name: 'Hamburg' });
		const doner = venueFactory.build({ name: 'Döner Eck', category: 'Kebab shop' }, { associations: { city } });
		const cafe = venueFactory.build({ name: 'Café Blau', category: 'Cafe' }, { associations: { city } });
		const far = venueFactory.build({ name: 'Far Away' }, { associations: { city: elsewhere } });
		// Saved first: a venue gets its brand of its own on flush
		await em.flush();

		let n = 0;
		const review = (
			venue: Venue,
			date: string,
			praise: FeedbackPoint[],
			complaints: FeedbackPoint[],
			text: string | null = 'Written',
		) =>
			em.create(Review, {
				venue,
				reviewId: `th-${n++}`,
				publishedAt: new Date(`${date}T12:00:00Z`),
				stars: 3,
				text,
				analysedAt: new Date('2026-10-02T00:00:00Z'),
				praise,
				complaints,
			});
		// September: three written reviews with points at the döner place
		review(doner, '2026-09-05', [], [increase('prices went up'), increase('way more than before')]);
		review(doner, '2026-09-20', [taste('great sauce')], [increase('price rise again')]);
		review(doner, '2026-09-21', [], [{ topic: 'price', detail: 'expensive' }]);
		// Not counted: no text; another city
		review(doner, '2026-09-22', [], [increase('no text')], null);
		review(far, '2026-09-10', [], [increase('elsewhere')]);
		// August: one of two
		review(doner, '2026-08-10', [], [increase('dearer')]);
		review(doner, '2026-08-11', [taste('tasty')], []);

		const post = (date: string, account?: SocialAccount) =>
			em.create(SocialPost, {
				city,
				externalId: `th-post-${n++}`,
				platform: SocialPlatformEnum.TIKTOK,
				url: `https://tiktok.com/th/${n}`,
				author: account?.handle ?? `eater${n}`,
				...(account && { account }),
				postedAt: new Date(`${date}T12:00:00Z`),
			});
		const mention = (p: SocialPost, venue: Venue | undefined, praise: FeedbackPoint[], complaints: FeedbackPoint[]) =>
			em.create(Mention, {
				post: p,
				...(venue && { venue }),
				venueName: venue?.name ?? 'Somewhere',
				visited: true,
				sentiment: 'mixed',
				summary: 'A visit.',
				dishes: [],
				praise,
				complaints,
			});
		mention(post('2026-09-12'), cafe, [taste('lovely cake')], [increase('coffee now €4')]);
		// The café's own post and a mention nothing matched
		mention(post('2026-09-13', ownAccount(em, cafe.brand, city, 'cafe_blau')), cafe, [], [increase('own')]);
		mention(post('2026-09-14'), undefined, [], [increase('unmatched')]);
		await em.flush();

		cityId = city.id;
		result = await harness.moduleRef.get(AdminThemeInsightsController).getThemeInsights({
			cityId: city.id,
			month: '2026-09',
		});
	});

	afterAll(async () => {
		await harness.stop();
	});

	it('counts a theme once per review or post, across venues, against the month before', () => {
		expect(result.previous).toBe('2026-08');
		expect(result.complaints).toEqual([
			{
				key: 'price_increase',
				topic: 'price',
				label: 'Price increase',
				reviews: 2,
				posts: 1,
				reviewShare: 66.7,
				postShare: 100,
				reviewShareChange: 16.7,
				postShareChange: null,
				venues: 2,
				topBrands: [
					{ id: expect.any(String), name: 'Döner Eck', sources: 2 },
					{ id: expect.any(String), name: 'Café Blau', sources: 1 },
				],
				// Of the kebab place's three reviews with a point, two
				foods: [
					{ key: 'kebab', label: expect.any(String), sources: 2, share: 66.7 },
					{ key: 'cafe', label: expect.any(String), sources: 1, share: 100 },
				],
				samples: ['price rise again', 'prices went up', 'way more than before', 'coffee now €4'],
			},
		]);
	});

	it('keeps praise apart', () => {
		expect(result.praise.map(r => [r.key, r.reviews, r.posts, r.venues, r.reviewShareChange])).toEqual([
			['taste', 1, 1, 2, -16.7],
		]);
	});

	it('states what the counts stand on, unfiled points apart', () => {
		expect(result.coverage).toEqual({
			reviews: 3,
			reviewBrands: 1,
			posts: 1,
			postBrands: 1,
			unfiledReviews: 1,
			unfiledPosts: 0,
		});
	});

	it('lists the kinds of food and narrows to one', async () => {
		expect(result.food).toBeNull();
		expect(result.foods.map(f => [f.key, f.reviews, f.posts, f.brands])).toEqual([
			['kebab', 3, 0, 1],
			['cafe', 0, 1, 1],
		]);
		const kebab = await harness.moduleRef
			.get(AdminThemeInsightsController)
			.getThemeInsights({ cityId, month: '2026-09', food: 'kebab' });
		expect(kebab.food?.key).toBe('kebab');
		expect(kebab.complaints.map(r => [r.key, r.reviews, r.posts, r.venues])).toEqual([['price_increase', 2, 0, 1]]);
		expect(kebab.coverage).toMatchObject({ reviews: 3, posts: 0 });
		// What it can be narrowed to stays the whole month's
		expect(kebab.foods).toEqual(result.foods);
	});
});
