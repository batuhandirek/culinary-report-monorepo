import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';

import type { City } from 'src/modules/cities/entities/city.entity.js';
import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { addFeedback } from 'src/modules/feedback/tests/factories/feedback.factory.js';
import type { AnsweredPoint } from 'src/modules/feedback/util/feedback-rows.js';
import { FoodTopicService } from 'src/modules/food-topics/services/food-topic.service.js';
import { VenueFoodTopicService } from 'src/modules/food-topics/services/venue-food-topic.service.js';
import {
	linkFoodTopics,
	seedFoodTopics,
} from 'src/modules/food-topics/tests/factories/food-topic.factory.js';
import { Mention } from 'src/modules/social/entities/mention.entity.js';
import type { SocialAccount } from 'src/modules/social/entities/social-account.entity.js';
import { SocialPlatformEnum, SocialPost } from 'src/modules/social/entities/social-post.entity.js';
import { ownAccount } from 'src/modules/social/tests/factories/social-account.factory.js';
import { Review } from 'src/modules/venues/entities/review.entity.js';
import type { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { venueFactory } from 'src/modules/venues/tests/factories/venue.factory.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { AdminThemeInsightsController } from '../controllers/admin.theme-insights.controller.js';
import type {
	AdminGetThemeInsightInputDto,
	AdminThemeInsightsOutputDto,
} from '../dto/admin-theme-insights.dto.js';
import { ThemeInsightService } from '../services/theme-insight.service.js';

const increase = (detail: string): AnsweredPoint => ({
	topic: 'price',
	theme: 'price_increase',
	detail,
});
const taste = (detail: string): AnsweredPoint => ({ topic: 'food', theme: 'taste', detail });

/* A city's praise and complaints per theme across venues: a review or a post counts once per theme
 * and polarity, own posts and unmatched mentions are out, unfiled points count under no theme;
 * by kind of food, a brand's being its places' main food. */
describe('ThemeInsightService (pglite)', () => {
	let harness: PgliteTestingModule;
	let result: AdminThemeInsightsOutputDto;
	let cityId: string;
	let donerBrandId: string;

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				ThemeInsightService,
				AdminThemeInsightsController,
				FoodTopicService,
				VenueFoodTopicService,
			],
		});
		entityManagerManager.setEntityManager(harness.orm.em);
		const em = harness.orm.em;
		seedFoodTopics(em, ['kebab', 'cafe']);
		const city: City = testCity(em);
		const elsewhere: City = testCity(em, { name: 'Hamburg' });
		const doner = venueFactory.build(
			{ name: 'Döner Eck', category: 'Kebab shop' },
			{ associations: { city } },
		);
		const cafe = venueFactory.build(
			{ name: 'Café Blau', category: 'Cafe' },
			{ associations: { city } },
		);
		const far = venueFactory.build({ name: 'Far Away' }, { associations: { city: elsewhere } });
		// Saved first: a venue gets its brand of its own on flush
		await em.flush();

		let n = 0;
		const review = (
			venue: Venue,
			date: string,
			praise: AnsweredPoint[],
			complaints: AnsweredPoint[],
			text: string | null = 'Written',
		) =>
			addFeedback(
				em,
				em.create(Review, {
					venue,
					reviewId: `th-${n++}`,
					publishedAt: new Date(`${date}T12:00:00Z`),
					stars: 3,
					text,
					analysedAt: new Date('2026-10-02T00:00:00Z'),
				}),
				{ praise, complaints },
			);
		// September: three written reviews with points at the döner place
		// About döner, in three spellings: one dish row (their food topic), a review once
		review(
			doner,
			'2026-09-05',
			[],
			[
				{ ...increase('prices went up'), dish: 'Döner', amount: 8 },
				{ ...increase('way more than before'), dish: 'doner kebab' },
			],
		);
		review(
			doner,
			'2026-09-20',
			[taste('great sauce')],
			[{ ...increase('price rise again'), dish: 'Dürüm', amount: 9.5 }],
		);
		review(doner, '2026-09-21', [], [{ topic: 'price', detail: 'expensive' }]);
		// Not counted: no text; another city
		review(doner, '2026-09-22', [], [increase('no text')], null);
		review(far, '2026-09-10', [], [increase('elsewhere')]);
		// August: one of two
		review(doner, '2026-08-10', [], [increase('dearer')]);
		review(doner, '2026-08-11', [taste('tasty')], []);
		// Inside the theme page's six months, and one before them
		review(doner, '2026-04-10', [], [increase('april rise')]);
		review(doner, '2026-03-10', [], [increase('march rise')]);
		// A September review noticing only a change (filed under the theme below)
		addFeedback(
			em,
			em.create(Review, {
				venue: doner,
				reviewId: `th-${n++}`,
				publishedAt: new Date('2026-09-25T12:00:00Z'),
				stars: 4,
				text: 'Written',
				analysedAt: new Date('2026-10-02T00:00:00Z'),
			}),
			{ changes: ['prices up since spring'] },
		);

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
		const mention = (
			p: SocialPost,
			venue: Venue | undefined,
			praise: AnsweredPoint[],
			complaints: AnsweredPoint[],
		) =>
			addFeedback(
				em,
				em.create(Mention, {
					post: p,
					...(venue && { venue }),
					venueName: venue?.name ?? 'Somewhere',
					visited: true,
					sentiment: 'mixed',
					summary: 'A visit.',
				}),
				{ praise, complaints },
			);
		mention(
			post('2026-09-12'),
			cafe,
			[taste('lovely cake')],
			[{ ...increase('coffee now €4'), amount: 4 }],
		);
		// The café's own post and a mention nothing matched
		mention(
			post('2026-09-13', ownAccount(em, cafe.brand, city, 'cafe_blau')),
			cafe,
			[],
			[increase('own')],
		);
		mention(post('2026-09-14'), undefined, [], [increase('unmatched')]);
		await em.flush();
		// The stored food-topic links, as the app's writers and refresh keep them
		await linkFoodTopics(em);
		await em
			.getConnection()
			.execute(
				`update feedback_points set food_topic_id = (select id from food_topics where key = 'kebab') where dish in ('Döner', 'doner kebab', 'Dürüm')`,
			);
		await em
			.getConnection()
			.execute(
				`update feedback_points set theme = 'price_increase', topic = 'price' where change`,
			);
		donerBrandId = doner.brand.id;

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
				// Each of the two reviews once, of the two complaining about kebab
				dishes: [
					{
						key: 'topic:kebab',
						label: 'Döner & kebab',
						foodTopic: 'kebab',
						sources: 2,
						share: 100,
					},
				],
				samples: [
					'price rise again',
					'prices went up',
					'way more than before',
					'coffee now €4',
				],
			},
		]);
	});

	it('keeps praise apart', () => {
		expect(
			result.praise.map(r => [r.key, r.reviews, r.posts, r.venues, r.reviewShareChange]),
		).toEqual([['taste', 1, 1, 2, -16.7]]);
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
		expect(kebab.complaints.map(r => [r.key, r.reviews, r.posts, r.venues])).toEqual([
			['price_increase', 2, 0, 1],
		]);
		expect(kebab.coverage).toMatchObject({ reviews: 3, posts: 0 });
		// What it can be narrowed to stays the whole month's
		expect(kebab.foods).toEqual(result.foods);
	});

	describe('one theme', () => {
		const themeOf = (
			query: Partial<AdminGetThemeInsightInputDto> = {},
			theme = 'price_increase',
		) =>
			harness.moduleRef
				.get(AdminThemeInsightsController)
				.getThemeInsight(theme, { cityId, month: '2026-09', ...query });

		it('counts each side once per source, over six months, own posts and unmatched mentions out', async () => {
			const page = await themeOf();
			expect(page).toMatchObject({
				key: 'price_increase',
				topic: 'price',
				label: 'Price increase',
				side: 'complaints',
			});
			expect(page.hint).toContain('prices went up');
			expect(page.sides).toEqual([
				{ side: 'complaints', reviews: 2, posts: 1 },
				{ side: 'praise', reviews: 0, posts: 0 },
				{ side: 'changes', reviews: 1, posts: 0 },
			]);
			// April to September; March is out of the window
			expect(
				page.months.map(m => [m.month, m.reviews, m.posts, m.reviewShare, m.postShare]),
			).toEqual([
				['2026-04', 1, 0, 100, null],
				['2026-05', 0, 0, null, null],
				['2026-06', 0, 0, null, null],
				['2026-07', 0, 0, null, null],
				['2026-08', 1, 0, 50, null],
				['2026-09', 2, 1, 66.7, 100],
			]);
			expect(page.current).toMatchObject({
				reviewShareChange: 16.7,
				postShareChange: null,
				brands: 2,
			});
		});

		it('says where it came up, about which dish and food, and the numbers stated', async () => {
			const page = await themeOf();
			expect(page.brands.map(b => [b.name, b.sources])).toEqual([
				['Döner Eck', 2],
				['Café Blau', 1],
			]);
			expect(page.dishes).toEqual([
				{ key: 'topic:kebab', label: 'Döner & kebab', foodTopic: 'kebab', sources: 2 },
			]);
			// Of the kebab brand's three reviews with a point, two
			expect(page.foods.map(f => [f.key, f.sources, f.share])).toEqual([
				['kebab', 2, 66.7],
				['cafe', 1, 100],
			]);
			// A source once, at its largest: 8, 9.5 and 4
			expect(page.amounts).toEqual([
				{ unit: 'money', sources: 3, median: 8, min: 4, max: 9.5 },
			]);
		});

		it('lists the sentences newest first, with their review or post', async () => {
			const page = await themeOf();
			expect(page.total).toBe(4);
			expect(page.totalSources).toBe(3);
			expect(page.points.map(p => p.detail).slice(0, 2)).toEqual([
				'price rise again',
				'coffee now €4',
			]);
			expect(
				page.points
					.slice(2)
					.map(p => p.detail)
					.sort(),
			).toEqual(['prices went up', 'way more than before']);
			expect(page.points[0]).toMatchObject({
				kind: 'review',
				stars: 3,
				reviewPlatform: 'google',
				text: 'Written',
				dish: 'Dürüm',
				foodTopic: { key: 'kebab' },
				amount: 9.5,
				unit: 'money',
				brand: { id: donerBrandId, name: 'Döner Eck' },
				venue: { name: 'Döner Eck' },
			});
			expect(page.points[1]).toMatchObject({
				kind: 'post',
				postPlatform: 'tiktok',
				summary: 'A visit.',
				venue: { name: 'Café Blau' },
			});
			expect(page.points[1].author).toMatch(/^eater/);
		});

		it('narrows the sentences, never the figures', async () => {
			const details = async (query: Partial<AdminGetThemeInsightInputDto>) =>
				(await themeOf(query)).points.map(p => p.detail).sort();
			expect(await details({ kind: 'post' })).toEqual(['coffee now €4']);
			expect(await details({ brandId: donerBrandId })).toEqual([
				'price rise again',
				'prices went up',
				'way more than before',
			]);
			expect(await details({ dish: 'topic:kebab' })).toEqual([
				'price rise again',
				'prices went up',
				'way more than before',
			]);
			expect(await details({ food: 'cafe' })).toEqual(['coffee now €4']);
			const paged = await themeOf({ offset: 1, limit: 1 });
			expect(paged.points.map(p => p.detail)).toEqual(['coffee now €4']);
			expect(paged.total).toBe(4);
			const narrowed = await themeOf({ kind: 'post' });
			expect(narrowed.total).toBe(1);
			expect(narrowed.current.reviews).toBe(2);
		});

		it('keeps the noticed changes as their own side', async () => {
			const page = await themeOf({ side: 'changes' });
			expect(page.points.map(p => p.detail)).toEqual(['prices up since spring']);
			// Of the four September reviews with any row
			expect(page.current).toMatchObject({ reviews: 1, reviewShare: 25 });
		});

		it('answers 404 for a theme the vocabulary lacks', async () => {
			await expect(themeOf({}, 'not_a_theme')).rejects.toThrow(
				'No feedback theme not_a_theme',
			);
		});
	});
});
