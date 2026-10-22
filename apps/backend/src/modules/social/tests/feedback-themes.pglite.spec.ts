import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';

import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { City } from 'src/modules/cities/entities/city.entity.js';
import { FoodTopicService } from 'src/modules/food-topics/services/food-topic.service.js';
import { FeedbackThemeAgent } from 'src/modules/venues/agents/feedback-theme.agent.js';
import { ReviewAnalysisAgent } from 'src/modules/venues/agents/review-analysis.agent.js';
import { Review } from 'src/modules/venues/entities/review.entity.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { FeedbackThemeService } from 'src/modules/venues/services/feedback-theme.service.js';
import { ReviewService } from 'src/modules/venues/services/review.service.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { mockAgent } from 'src/tests/mock-agent.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { MentionExtractionAgent } from '../agents/mention-extraction.agent.js';
import { Mention } from '../entities/mention.entity.js';
import { SocialPlatformEnum, SocialPost } from '../entities/social-post.entity.js';
import { MentionExtractionService } from '../services/mention-extraction.service.js';

/** The theme the backfill's mocked classifier gives a phrase: a few phrases it knows, else the catch-all. */
const THEME_OF: Record<string, string> = {
	'prices went up': 'price_increase',
	'dürüm now €9.50': 'price_increase',
	expensive: 'price_level',
	'cash only': 'cash_only',
	'great broth': 'taste',
};

/*
 * Every praise and complaint point carries a theme: the agents answer it at analysis and
 * extraction (the topic derived from it), and points stored before themes are filed by the backfill.
 */
describe('feedback themes (pglite)', () => {
	let harness: PgliteTestingModule;
	let reviewService: ReviewService;
	let extraction: MentionExtractionService;
	let themes: FeedbackThemeService;
	let cityA: City;
	let cityB: City;

	const reviewAgent = mockAgent((prompt: unknown) => {
		const { reviews } = JSON.parse(prompt as string) as { reviews: { reviewId: string }[] };
		return {
			reviews: reviews.map(r => ({
				reviewId: r.reviewId,
				sentiment: 'negative',
				praise: [{ theme: 'taste', detail: 'tasty döner' }],
				complaints: [
					{ theme: 'price_increase', detail: 'prices went up' },
					{ theme: 'price_increase', detail: 'dürüm now €9.50' },
				],
				dishes: [],
				changes: ['prices went up'],
			})),
		};
	});
	const extractionAgent = mockAgent({
		isPromotional: false,
		mentions: [
			{
				venueName: 'Pho House',
				locationHint: null,
				cuisine: 'Pho',
				city: 'Berlin',
				visited: true,
				isNewOpening: false,
				sentiment: 'mixed',
				summary: 'Great broth, cash only.',
				dishes: [],
				praise: [{ theme: 'taste', detail: 'great broth' }],
				complaints: [{ theme: 'cash_only', detail: 'cash only' }],
			},
		],
	});
	const themeAgent = mockAgent((prompt: unknown) => {
		const { points } = JSON.parse(prompt as string) as { points: { id: string; detail: string }[] };
		return { points: points.map(p => ({ id: p.id, theme: THEME_OF[p.detail] ?? 'other' })) };
	});

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				ReviewService,
				MentionExtractionService,
				FeedbackThemeService,
				FoodTopicService,
				{ provide: ReviewAnalysisAgent, useValue: reviewAgent },
				{ provide: MentionExtractionAgent, useValue: extractionAgent },
				{ provide: FeedbackThemeAgent, useValue: themeAgent },
			],
		});
		reviewService = harness.moduleRef.get(ReviewService);
		extraction = harness.moduleRef.get(MentionExtractionService);
		themes = harness.moduleRef.get(FeedbackThemeService);
		entityManagerManager.setEntityManager(harness.orm.em);
		const em = harness.orm.em;
		cityA = testCity(em);
		cityB = testCity(em, { name: 'Hamburg' });
		await em.flush();
	});

	afterAll(async () => {
		await harness.stop();
	});

	beforeEach(() => {
		themeAgent.generate.mockClear();
	});

	it('stores what the review agent answers with the topic of each theme', async () => {
		const em = harness.orm.em;
		const venue = em.create(Venue, { city: cityA, placeId: 'ft-analysed', name: 'Döner Eck' });
		em.create(Review, {
			venue,
			reviewId: 'ft-new',
			publishedAt: new Date('2026-08-10T10:00:00Z'),
			stars: 2,
			text: 'Prices went up, the dürüm is now €9.50',
		});
		await em.flush();

		expect(await reviewService.analyseMonth('2026-08')).toBe(1);

		em.clear();
		const review = await em.findOneOrFail(Review, { reviewId: 'ft-new' });
		expect(review.complaints).toEqual([
			{ topic: 'price', theme: 'price_increase', detail: 'prices went up' },
			{ topic: 'price', theme: 'price_increase', detail: 'dürüm now €9.50' },
		]);
		expect(review.praise).toEqual([{ topic: 'food', theme: 'taste', detail: 'tasty döner' }]);
	});

	it('stores what the extraction agent answers with the topic of each theme', async () => {
		const em = harness.orm.em;
		em.create(SocialPost, {
			city: cityA,
			externalId: 'ft-post-new',
			platform: SocialPlatformEnum.TIKTOK,
			url: 'https://tiktok.com/ft/new',
			author: 'eater',
			views: 100,
			text: 'The broth at Pho House is something else, but bring cash #berlinfood #pho',
			postedAt: new Date('2026-09-10T12:00:00Z'),
		});
		await em.flush();

		expect(await extraction.extract({ limit: 10, cityId: cityA.id })).toEqual({ analysed: 1, mentions: 1 });

		em.clear();
		const mention = await em.findOneOrFail(Mention, { venueName: 'Pho House' });
		expect(mention.praise).toEqual([{ topic: 'food', theme: 'taste', detail: 'great broth' }]);
		expect(mention.complaints).toEqual([{ topic: 'payment', theme: 'cash_only', detail: 'cash only' }]);
	});

	it('files the points stored before themes, per city, and leaves nothing for a second run', async () => {
		const em = harness.orm.em;
		const venueA = em.create(Venue, { city: cityA, placeId: 'ft-old-a', name: 'Old A' });
		const venueB = em.create(Venue, { city: cityB, placeId: 'ft-old-b', name: 'Old B' });
		const old = (venue: Venue, reviewId: string, complaints: Review['complaints']) =>
			em.create(Review, {
				venue,
				reviewId,
				publishedAt: new Date('2026-07-10T10:00:00Z'),
				stars: 2,
				text: 'Old review',
				analysedAt: new Date('2026-08-01T00:00:00Z'),
				praise: [],
				complaints,
			});
		old(venueA, 'ft-old-1', [
			{ topic: 'price', detail: 'prices went up' },
			{ topic: 'price', detail: 'expensive' },
		]);
		// One themed and one not: only the second is sent
		old(venueA, 'ft-old-2', [
			{ topic: 'price', theme: 'price_level', detail: 'too pricey' },
			{ topic: 'payment', detail: 'cash only' },
		]);
		old(venueB, 'ft-old-3', [{ topic: 'price', detail: 'expensive' }]);
		const post = em.create(SocialPost, {
			city: cityA,
			externalId: 'ft-post-old',
			platform: SocialPlatformEnum.INSTAGRAM,
			url: 'https://instagram.com/p/ft-old',
			author: 'old.eater',
			views: 10,
			postedAt: new Date('2026-07-12T12:00:00Z'),
			analysedAt: new Date('2026-07-13T00:00:00Z'),
		});
		em.create(Mention, {
			post,
			venueName: 'Old A',
			visited: true,
			sentiment: 'negative',
			summary: 'Pricier than before.',
			dishes: [],
			// Filed under food when extracted, but a price increase: the theme moves the topic
			praise: [{ topic: 'food', detail: 'great broth' }],
			complaints: [{ topic: 'food', detail: 'prices went up' }],
		});
		await em.flush();

		expect(await themes.countUnthemedReviews(cityA.id)).toBe(2);
		expect(await extraction.countUnthemed(cityA.id)).toBe(1);

		const reviews = await themes.backfillReviews({ cityId: cityA.id, limit: 10 });
		const mentions = await extraction.backfillThemes({ cityId: cityA.id, limit: 10 });
		expect(reviews).toEqual({ reviews: 2, points: 3 });
		expect(mentions).toEqual({ mentions: 1, points: 2 });
		const sent = themeAgent.generate.mock.calls.flatMap(
			([prompt]) => (JSON.parse(prompt as string) as { points: { detail: string; kind: string }[] }).points,
		);
		expect(sent.map(p => p.detail).sort()).toEqual(
			['cash only', 'expensive', 'great broth', 'prices went up', 'prices went up'].sort(),
		);
		expect(sent.find(p => p.detail === 'great broth')?.kind).toBe('praise');

		em.clear();
		expect((await em.findOneOrFail(Review, { reviewId: 'ft-old-1' })).complaints).toEqual([
			{ topic: 'price', theme: 'price_increase', detail: 'prices went up' },
			{ topic: 'price', theme: 'price_level', detail: 'expensive' },
		]);
		expect((await em.findOneOrFail(Review, { reviewId: 'ft-old-2' })).complaints).toEqual([
			{ topic: 'price', theme: 'price_level', detail: 'too pricey' },
			{ topic: 'payment', theme: 'cash_only', detail: 'cash only' },
		]);
		// The other city's review is left for its own run
		expect((await em.findOneOrFail(Review, { reviewId: 'ft-old-3' })).complaints).toEqual([
			{ topic: 'price', detail: 'expensive' },
		]);
		expect((await em.findOneOrFail(Mention, { venueName: 'Old A' })).complaints).toEqual([
			{ topic: 'price', theme: 'price_increase', detail: 'prices went up' },
		]);

		expect(await themes.countUnthemedReviews(cityA.id)).toBe(0);
		expect(await extraction.countUnthemed(cityA.id)).toBe(0);
		expect(await themes.countUnthemedReviews()).toBe(1);
		themeAgent.generate.mockClear();
		expect(await themes.backfillReviews({ cityId: cityA.id })).toEqual({ reviews: 0, points: 0 });
		expect(themeAgent.generate).not.toHaveBeenCalled();
	});

	// Rows that carry points but lost their analysedAt (a raw reset or a copy) still count in reports
	it('files the points of a review that has points but no analysedAt', async () => {
		const em = harness.orm.em;
		const venue = em.create(Venue, { city: cityA, placeId: 'ft-unstamped', name: 'Unstamped' });
		em.create(Review, {
			venue,
			reviewId: 'ft-unstamped-1',
			publishedAt: new Date('2026-09-10T10:00:00Z'),
			stars: 2,
			text: 'Pricey now',
			sentiment: 'negative',
			praise: [],
			complaints: [{ topic: 'price', detail: 'prices went up' }],
		});
		await em.flush();
		themeAgent.generate.mockClear();

		expect(await themes.countUnthemedReviews(cityA.id)).toBe(1);
		expect(await themes.backfillReviews({ cityId: cityA.id })).toEqual({ reviews: 1, points: 1 });
		em.clear();
		expect((await em.findOneOrFail(Review, { reviewId: 'ft-unstamped-1' })).complaints).toEqual([
			{ topic: 'price', theme: 'price_increase', detail: 'prices went up' },
		]);
		expect(await themes.countUnthemedReviews(cityA.id)).toBe(0);
	});
});
