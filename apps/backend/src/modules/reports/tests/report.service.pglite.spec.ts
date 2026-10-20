import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';

import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { Mention, MentionMatchMethodEnum } from 'src/modules/social/entities/mention.entity.js';
import { SocialPlatformEnum, SocialPost } from 'src/modules/social/entities/social-post.entity.js';
import { Review } from 'src/modules/venues/entities/review.entity.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { VenueSnapshot } from 'src/modules/venues/entities/venue-snapshot.entity.js';
import { CityService } from 'src/modules/cities/services/city.service.js';
import { Brand } from 'src/modules/venues/entities/brand.entity.js';
import { BrandService } from 'src/modules/venues/services/brand.service.js';
import { CompetitorService } from 'src/modules/venues/services/competitor.service.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { mockAgent } from 'src/tests/mock-agent.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { ReportHighlightsAgent } from '../agents/report-highlights.agent.js';
import { ReviewReplyAgent } from '../agents/review-reply.agent.js';
import { Report } from '../entities/report.entity.js';
import { ReportService } from '../services/report.service.js';

const HIGHLIGHTS = {
	title: 'A good month',
	headline: 'Things went well.',
	highlights: [],
	actions: [{ title: 'Answer reviews', text: 'Reply to every review.' }],
};

describe('ReportService.build (pglite)', () => {
	let harness: PgliteTestingModule;
	let service: ReportService;
	const highlightsAgent = mockAgent(HIGHLIGHTS);
	// Answers every review it is given, in a made-up voice the test can recognise
	const replyAgent = mockAgent((input: unknown) => ({
		replies: (JSON.parse(input as string) as { reviews: { reviewId: string }[] }).reviews.map(
			r => ({ reviewId: r.reviewId, reply: `Thanks ${r.reviewId}` }),
		),
	}));

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				ReportService,
				CompetitorService,
				BrandService,
				CityService,
				{ provide: ReportHighlightsAgent, useValue: highlightsAgent },
				{ provide: ReviewReplyAgent, useValue: replyAgent },
			],
		});
		service = harness.moduleRef.get(ReportService);
		entityManagerManager.setEntityManager(harness.orm.em);
	});

	afterAll(async () => {
		await harness.stop();
	});

	// A venue's own brand before the flush that would make it, for the mentions and reports
	const brandOf = (venue: Venue) =>
		(venue.brand ??= harness.orm.em.create(Brand, { name: venue.name, key: venue.name.toLowerCase() }));

	let n = 0;
	const post = (venue: Venue, author: string, postedAt: string, extra: Partial<SocialPost> = {}) => {
		const em = harness.orm.em;
		const p = em.create(SocialPost, {
			city: venue.city,
			externalId: `t${++n}`,
			platform: SocialPlatformEnum.TIKTOK,
			url: `https://tiktok.com/t${n}`,
			postedAt: new Date(postedAt),
			author,
			authorFans: 1000 * n,
			views: 100 * n,
			...extra,
		});
		em.create(Mention, {
			post: p,
			venueName: venue.name,
			venue,
			brand: brandOf(venue),
			matchMethod: MentionMatchMethodEnum.EXACT,
			visited: true,
			sentiment: 'positive',
			summary: 'Nice.',
			dishes: [],
			praise: [],
			complaints: [],
		});
		return p;
	};
	const review = (venue: Venue, reviewId: string, publishedAt: string, extra: Partial<Review> = {}) =>
		harness.orm.em.create(Review, {
			reviewId,
			venue,
			publishedAt: new Date(publishedAt),
			stars: 4,
			text: 'Fine',
			language: 'de',
			...extra,
		});

	it('builds the trend, the previous month, nearby creators and reply drafts', async () => {
		const em = harness.orm.em;
		const city = testCity(em);
		const venue = em.create(Venue, {
			city,
			placeId: 'p-v',
			name: 'Chén Chè',
			category: 'Vietnamese restaurant',
			district: 'Mitte',
			rating: 4.4,
			googleUrl: 'https://maps.google.com/?cid=1',
		});
		const neighbour = em.create(Venue, {
			city,
			placeId: 'p-n',
			name: 'Zola',
			category: 'Pizza restaurant',
			district: 'Mitte',
		});

		// August: one post and two reviews, and a report with an action
		post(venue, 'augustfan', '2026-08-10T12:00:00Z');
		review(venue, 'aug-1', '2026-08-05T12:00:00Z', { ownerResponse: 'Thanks' });
		review(venue, 'aug-2', '2026-08-06T12:00:00Z');
		em.create(Report, {
			brand: brandOf(venue),
			city,
			month: '2026-08',
			data: {} as Report['data'],
			highlights: HIGHLIGHTS,
		});

		// September
		post(venue, 'loyal', '2026-09-10T12:00:00Z');
		post(neighbour, 'loyal', '2026-09-11T12:00:00Z');
		post(neighbour, 'newcomer', '2026-09-12T12:00:00Z');
		post(neighbour, 'paidguy', '2026-09-13T12:00:00Z', { isPromotional: true });
		// Same district name, another city: neither a neighbour nor its creators nearby
		const namesake = em.create(Venue, {
			city: testCity(em, { name: 'Elsewhere' }),
			placeId: 'p-far',
			name: 'Far Away',
			category: 'Pizza restaurant',
			district: 'Mitte',
		});
		post(namesake, 'farfan', '2026-09-14T12:00:00Z');
		review(venue, 'answered', '2026-09-02T12:00:00Z', { stars: 1, ownerResponse: 'Sorry' });
		review(venue, 'stars-only', '2026-09-03T12:00:00Z', { stars: 1, text: null });
		review(venue, 'one-star', '2026-09-04T12:00:00Z', { stars: 1, text: 'Cold soup' });
		for (let i = 0; i < 11; i++)
			review(venue, `five-${i}`, `2026-09-${String(10 + i)}T12:00:00Z`, { stars: 5 });

		for (const [snapshotDate, rating] of [
			['2026-08-02', 4.3],
			['2026-10-02', 4.4],
		] as const)
			em.create(VenueSnapshot, { venue, snapshotDate, rating, reviewsCount: 200 });
		await em.flush();

		const report = await service.build(venue.brand.id, venue.city.id, '2026-09');
		const data = report.data;

		expect(data.venue.googleUrl).toBe('https://maps.google.com/?cid=1');
		expect(data.venue.ratingTrend.map(p => [p.month, p.rating])).toEqual([
			['2026-07', 4.3],
			['2026-09', 4.4],
		]);

		expect(data.previous).toMatchObject({
			month: '2026-08',
			social: { postCount: 1, creators: 1 },
			reviews: { count: 2, replyRate: 0.5 },
			actions: HIGHLIGHTS.actions,
		});

		expect(data.creators.map(c => c.author)).toEqual(['loyal']);
		expect(data.creatorsNearby.map(c => c.author)).toEqual(['newcomer']);
		expect(data.creatorsNearby[0].venues).toEqual(['Zola']);
		expect(data.neighbours.map(n => n.name)).toEqual(['Zola']);
		expect(highlightsAgent.generate).toHaveBeenLastCalledWith(expect.any(String), { cityName: 'Berlin' });

		expect(data.reviews.list).toHaveLength(14);
		expect(data.reviews.list[0].reviewId).toBe('five-10');

		// Unanswered written reviews only, the critical one first, ten at most
		expect(data.reviews.replyDrafts).toHaveLength(10);
		expect(data.reviews.replyDrafts[0]).toEqual({ reviewId: 'one-star', draft: 'Thanks one-star' });
		const drafted = data.reviews.replyDrafts.map(d => d.reviewId);
		expect(drafted).not.toContain('answered');
		expect(drafted).not.toContain('stars-only');

		// The model got the previous month and the creators
		const input = JSON.parse(highlightsAgent.generate.mock.calls.at(-1)![0] as string);
		expect(input.previousMonth).toMatchObject({
			month: '2026-08',
			actionsSuggestedLastMonth: HIGHLIGHTS.actions,
		});
		expect(input.nearbyCreatorsWhoDidNotPostAboutYou[0].author).toBe('newcomer');
		expect(input.googleRatingTrend).toHaveLength(2);

		// Stored as built
		harness.orm.em.clear();
		const stored = await harness.orm.em.findOneOrFail(Report, { id: report.id });
		expect(stored.data.reviews.replyDrafts).toHaveLength(10);
	});

	it('leaves previous out for a first report and keeps the report when drafting fails', async () => {
		const em = harness.orm.em;
		const venue = em.create(Venue, { city: testCity(em), placeId: 'p-new', name: 'Neu', category: 'Cafe' });
		review(venue, 'n-1', '2026-09-05T12:00:00Z', { stars: 2, text: 'Slow' });
		await em.flush();
		replyAgent.generate.mockRejectedValueOnce(new Error('LLM down'));

		const report = await service.build(venue.brand.id, venue.city.id, '2026-09');
		expect(report.data.previous).toBeUndefined();
		expect(report.data.creatorsNearby).toEqual([]);
		expect(report.data.venue.ratingTrend).toEqual([]);
		expect(report.data.reviews.replyDrafts).toEqual([]);
	});
});
