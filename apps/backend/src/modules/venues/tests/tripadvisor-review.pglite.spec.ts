import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';

import { ApifyService } from 'src/modules/apify/services/apify.service.js';
import type { City } from 'src/modules/cities/entities/city.entity.js';
import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { mockAgent } from 'src/tests/mock-agent.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { ReviewAnalysisAgent } from '../agents/review-analysis.agent.js';
import { Review, ReviewPlatformEnum } from '../entities/review.entity.js';
import { Venue } from '../entities/venue.entity.js';
import { ReviewService } from '../services/review.service.js';
import { TripadvisorReviewService } from '../services/tripadvisor-review.service.js';
import { VenueService } from '../services/venue.service.js';
import { tripadvisorPageFromSearch } from '../util/tripadvisor.js';

const FRIEDA_PAGE =
	'https://www.tripadvisor.com/Restaurant_Review-g187323-d3896790-Reviews-Cafe_Frieda-Berlin.html';

// One search page in the shape `apify/google-search-scraper` documents
const searchPage = (term: string, results: { url: string; title: string }[]) => ({
	searchQuery: { term, device: 'DESKTOP', page: 1, countryCode: 'DE' },
	organicResults: results.map((r, i) => ({ ...r, type: 'organic', position: i + 1, description: '' })),
});

// Items in the shape `scrapeunblocker/tripadvisor-reviews-scraper` documents
const taReview = (id: number, publishedDate: string, rating: number, text: string, ownerResponse?: object) => ({
	placeName: 'Café Frieda',
	placeLocationId: 3896790,
	placeUrl: FRIEDA_PAGE,
	placeType: 'restaurant',
	placeRating: 4.5,
	placeReviewsCount: 212,
	placeCity: 'Berlin',
	placeCountry: 'DE',
	id,
	url: `https://www.tripadvisor.com/ShowUserReviews-g187323-d3896790-r${id}`,
	title: 'Lovely brunch',
	text,
	rating,
	publishedDate,
	travelDate: '2026-09',
	tripType: 'couples',
	language: 'en',
	isMachineTranslated: false,
	helpfulVotes: 1,
	user: { name: 'Peter F', location: 'Toronto, Canada', contributions: 11 },
	...(ownerResponse && { ownerResponse }),
});

describe('TripAdvisor reviews (pglite)', () => {
	let harness: PgliteTestingModule;
	let service: TripadvisorReviewService;
	let city: City;
	let frieda: Venue;
	let namesake: Venue;
	const runActor = jest.fn(async (actor: string, input: any, _opts: { maxCostUsd: number }): Promise<any[]> => {
		if (actor === 'apify/google-search-scraper') {
			const [friedaQuery, otherQuery] = (input.queries as string).split('\n');
			return [
				searchPage(friedaQuery, [
					{ url: 'https://www.tripadvisor.com/Attraction_Review-g187323-d1-Reviews-Weserstrasse.html', title: 'Weserstraße - Tripadvisor' },
					{ url: FRIEDA_PAGE, title: 'CAFÉ FRIEDA, Berlin - Neukölln - Restaurant Reviews, Photos & Phone Number - Tripadvisor' },
				]),
				// Only a namesake in another city
				searchPage(otherQuery, [
					{
						url: 'https://www.tripadvisor.com/Restaurant_Review-g1-d2-Reviews-Bellini-Rome.html',
						title: 'Bar Bellini Roma, Rome - Restaurant Reviews - Tripadvisor',
					},
				]),
			];
		}
		return [
			taReview(1001, '2026-09-17', 5, 'Great vibe and the shakshuka was perfect', {
				text: 'Thank you!',
				publishedDate: '2026-09-19',
				author: 'Owner',
			}),
			taReview(1002, '2026-09-03', 2, 'Overpriced for what you get'),
			// Before the month: paid for by the page, not kept
			taReview(999, '2026-08-30', 4, 'Nice'),
		];
	});
	const agent = mockAgent((input: unknown) => ({
		reviews: (JSON.parse(input as string) as { reviews: { reviewId: string }[] }).reviews.map(r => ({
			reviewId: r.reviewId,
			sentiment: 'positive',
			praise: [{ topic: 'vibe', detail: 'great vibe' }],
			complaints: [],
			dishes: [],
			changes: [],
		})),
	}));

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				TripadvisorReviewService,
				ReviewService,
				VenueService,
				{ provide: ApifyService, useValue: { runActor } },
				{ provide: ReviewAnalysisAgent, useValue: agent },
			],
		});
		service = harness.moduleRef.get(TripadvisorReviewService);
		entityManagerManager.setEntityManager(harness.orm.em);
		const em = harness.orm.em;
		city = testCity(em);
		frieda = em.create(Venue, { city, placeId: 'p-frieda', name: 'Café Frieda', category: 'Cafe' });
		namesake = em.create(Venue, { city, placeId: 'p-bellini', name: 'Bellini', category: 'Bar' });
		await em.flush();
	});

	afterAll(async () => {
		await harness.stop();
	});

	it('finds a venue’s page once, confirmed by name', async () => {
		const now = new Date('2026-10-02T06:00:00Z');
		expect(await service.findPages(city, [frieda, namesake], 0.25, now)).toEqual({ searched: 2, found: 1 });
		expect(runActor.mock.calls[0][1]).toMatchObject({
			queries: 'site:tripadvisor.com "Café Frieda" Berlin\nsite:tripadvisor.com "Bellini" Berlin',
			maxPagesPerQuery: 1,
		});
		expect(frieda.tripadvisorUrl).toBe(FRIEDA_PAGE);
		expect(namesake.tripadvisorUrl ?? null).toBeNull();
		expect(namesake.tripadvisorSearchedAt).toEqual(now);
		// Searched venues are not searched again
		expect(await service.findPages(city, [frieda, namesake], 0.25, now)).toEqual({ searched: 0, found: 0 });
		expect(runActor).toHaveBeenCalledTimes(1);
	});

	it('stores the month’s reviews next to Google’s and analyses both with one agent', async () => {
		const em = harness.orm.em;
		em.create(Review, {
			reviewId: 'g-1',
			venue: frieda,
			publishedAt: new Date('2026-09-10T10:00:00Z'),
			stars: 4,
			text: 'Gutes Frühstück',
		});
		await em.flush();

		expect(await service.scrapeMonth('2026-09', [frieda.id, namesake.id], 0.25)).toBe(2);
		const [, input] = runActor.mock.calls[1];
		expect(input).toMatchObject({ places: [FRIEDA_PAGE], since: '2026-09-01', max_reviews_per_place: 100 });
		// Again: stored once per review
		expect(await service.scrapeMonth('2026-09', [frieda.id], 0.25)).toBe(2);

		em.clear();
		const reviews = await em.find(Review, { venue: frieda.id }, { orderBy: { reviewId: 'asc' } });
		expect(reviews.map(r => [r.reviewId, r.platform])).toEqual([
			['g-1', ReviewPlatformEnum.GOOGLE],
			['ta_1001', ReviewPlatformEnum.TRIPADVISOR],
			['ta_1002', ReviewPlatformEnum.TRIPADVISOR],
		]);
		expect(reviews[1]).toMatchObject({
			stars: 5,
			text: 'Lovely brunch\nGreat vibe and the shakshuka was perfect',
			language: 'en',
			ownerResponse: 'Thank you!',
		});
		const venue = await em.findOneOrFail(Venue, { id: frieda.id });
		expect([venue.tripadvisorRating, venue.tripadvisorReviewsCount]).toEqual([4.5, 212]);

		expect(await harness.moduleRef.get(ReviewService).analyseMonth('2026-09')).toBe(3);
		const sent = (JSON.parse(agent.generate.mock.calls[0][0] as string) as { reviews: { reviewId: string }[] }).reviews;
		expect(sent.map(r => r.reviewId).sort()).toEqual(['g-1', 'ta_1001', 'ta_1002']);
	});

	it('takes only a restaurant page whose title is the venue', () => {
		expect(
			tripadvisorPageFromSearch(
				[{ url: `${FRIEDA_PAGE}?m=1`, title: 'Cafe Frieda, Berlin - Restaurant Reviews' }],
				'Café Frieda',
				['Berlin'],
			),
		).toBe(FRIEDA_PAGE);
		expect(
			tripadvisorPageFromSearch([{ url: FRIEDA_PAGE, title: 'Zola, Berlin - Restaurant Reviews' }], 'Café Frieda', ['Berlin']),
		).toBeNull();
		expect(
			tripadvisorPageFromSearch([{ url: FRIEDA_PAGE, title: 'Cafe Frieda, Vienna - Restaurant Reviews' }], 'Café Frieda', ['Berlin']),
		).toBeNull();
	});
});
