import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';

import type { City } from 'src/modules/cities/entities/city.entity.js';
import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { addStatements, type TestClaim } from 'src/modules/statements/tests/factories/statement.factory.js';
import { ASPECT_SEED } from 'src/modules/topics/constants/aspect-seed.constant.js';
import { TopicService } from 'src/modules/topics/services/topic.service.js';
import { VenueTopicService } from 'src/modules/topics/services/venue-topic.service.js';
import {
	linkTopics,
	seedTopics,
} from 'src/modules/topics/tests/factories/topic.factory.js';
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
	AdminThemeInsightsOutputDto,
} from '../dto/admin-theme-insights.dto.js';
import { ThemeInsightService } from '../services/theme-insight.service.js';

/** A complaint filed under Price level, as agent B reads it (a price increase is that aspect with kind `change` since claim model v2) */
const increase = (text: string, extra: Partial<TestClaim> = {}): TestClaim => ({
	text,
	sentiment: 'negative',
	aspect: 'price_level',
	...extra,
});
const taste = (text: string): TestClaim => ({ text, sentiment: 'positive', aspect: 'taste' });

/* A city's praise and complaints per theme across venues, read from statements and their aspect
 * parts: a review or a post counts once per theme and polarity, own posts and unmatched mentions
 * are out, a claim under no aspect counts under no theme, a neutral or unjudged claim counts as
 * nothing; by kind of food, a brand's being its places' main food; by dish, a claim's food
 * wordings through their terms' links. */
describe('ThemeInsightService (pglite)', () => {
	let harness: PgliteTestingModule;
	let result: AdminThemeInsightsOutputDto;
	let cityId: string;

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				ThemeInsightService,
				AdminThemeInsightsController,
				TopicService,
				VenueTopicService,
			],
		});
		entityManagerManager.setEntityManager(harness.orm.em);
		const em = harness.orm.em;
		// The two kinds of food the brands are, and every aspect: the service reads the vocabulary from the table
		seedTopics(em, ['kebab', 'cafe', ...ASPECT_SEED.map(a => a.key)]);
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
		// Saved first: a venue gets its brand of its own on flush, and the index its rows
		await em.flush();
		const index = await harness.moduleRef.get(TopicService).index();

		let n = 0;
		const review = (venue: Venue, date: string, claims: TestClaim[], text: string | null = 'Written') =>
			addStatements(
				em,
				em.create(Review, {
					venue,
					reviewId: `th-${n++}`,
					publishedAt: new Date(`${date}T12:00:00Z`),
					stars: 3,
					text,
					analysedAt: new Date('2026-10-02T00:00:00Z'),
				}),
				claims,
				{ index },
			);
		// September: three written reviews with claims at the döner place
		// About döner, in three spellings: one dish row (their wordings' topic), a review once
		review(doner, '2026-09-05', [
			increase('prices went up', { foods: ['Döner'], amount: 8, unit: 'money' }),
			increase('way more than before', { foods: ['doner kebab'] }),
		]);
		review(doner, '2026-09-20', [
			taste('great sauce'),
			increase('price rise again', { foods: ['Dürüm'], amount: 9.5, unit: 'money' }),
		]);
		// A complaint agent B filed under no aspect (unfiled), a neutral fact under the theme (no
		// complaint), and a claim B has not judged yet (nothing)
		const [, , unread] = review(doner, '2026-09-21', [
			{ text: 'expensive', sentiment: 'negative' },
			{ text: 'prices are listed in euros', sentiment: 'neutral', aspect: 'price_level' },
			increase('not read yet'),
		]);
		unread.sentiment = null;
		unread.partsAt = null;
		// Not counted: no text; another city
		review(doner, '2026-09-22', [increase('no text')], null);
		review(far, '2026-09-10', [increase('elsewhere')]);
		// August: one of two
		review(doner, '2026-08-10', [increase('dearer')]);
		review(doner, '2026-08-11', [taste('tasty')]);
		// Inside the theme page's six months, and one before them
		review(doner, '2026-04-10', [increase('april rise')]);
		review(doner, '2026-03-10', [increase('march rise')]);
		// A September review noticing only a change, filed under the theme
		review(doner, '2026-09-25', [{ text: 'prices up since spring', change: true, aspect: 'price_level' }]);

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
		// A mention with a venue gets its brand on flush
		const mention = (p: SocialPost, venue: Venue | undefined, claims: TestClaim[]) =>
			addStatements(
				em,
				em.create(Mention, {
					post: p,
					...(venue && { venue }),
					venueName: venue?.name ?? 'Somewhere',
					visited: true,
				}),
				claims,
				{ index },
			);
		mention(post('2026-09-12'), cafe, [
			taste('lovely cake'),
			increase('coffee now €4', { amount: 4, unit: 'money' }),
		]);
		// The café's own post and a mention nothing matched
		mention(post('2026-09-13', ownAccount(em, cafe.brand, city, 'cafe_blau')), cafe, [increase('own')]);
		mention(post('2026-09-14'), undefined, [increase('unmatched')]);
		await em.flush();
		// The stored topic links, as the app's writers and refresh keep them
		await linkTopics(em);

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
				key: 'price_level',
				topic: 'price',
				label: 'Price level',
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
				// Of the kebab place's three reviews with a claim, two
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

	it('states what the counts stand on, claims under no aspect apart', () => {
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
			['price_level', 2, 0, 1],
		]);
		expect(kebab.coverage).toMatchObject({ reviews: 3, posts: 0 });
		// What it can be narrowed to stays the whole month's
		expect(kebab.foods).toEqual(result.foods);
	});
});
