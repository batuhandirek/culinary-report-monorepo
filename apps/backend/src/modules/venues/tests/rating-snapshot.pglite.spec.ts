import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';

import { ApifyService } from 'src/modules/apify/services/apify.service.js';
import type { City } from 'src/modules/cities/entities/city.entity.js';
import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { Mention } from 'src/modules/social/entities/mention.entity.js';
import { SocialPlatformEnum, SocialPost } from 'src/modules/social/entities/social-post.entity.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { ReviewAnalysisAgent } from '../agents/review-analysis.agent.js';
import { Brand } from '../entities/brand.entity.js';
import { Review } from '../entities/review.entity.js';
import { Venue } from '../entities/venue.entity.js';
import { VenueSnapshot } from '../entities/venue-snapshot.entity.js';
import { RatingSnapshotService } from '../services/rating-snapshot.service.js';
import { ReviewService } from '../services/review.service.js';
import { VenueService } from '../services/venue.service.js';
import { brandKey } from '../util/brands.js';

const NOW = new Date('2026-10-25T04:30:00Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

describe('RatingSnapshotService (pglite)', () => {
	let harness: PgliteTestingModule;
	let service: RatingSnapshotService;
	let city: City;
	const v: Record<string, Venue> = {};
	const runActor = jest.fn(async (_actor: string, input: any, _opts: { maxCostUsd: number }): Promise<any[]> =>
		(input.placeIds as string[])
			// A place with no review at all returns nothing
			.filter(id => id !== 'p-silent')
			.map((placeId, i) => ({ placeId, reviewId: `r-${placeId}`, stars: 5, totalScore: 4.1 + i / 10, reviewsCount: 1000 + i }))
			// An item for a place not asked for is ignored
			.concat([{ placeId: 'p-stranger', reviewId: 'r-x', stars: 3, totalScore: 3, reviewsCount: 3 }]),
	);

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				RatingSnapshotService,
				ReviewService,
				VenueService,
				{ provide: ApifyService, useValue: { runActor } },
				{ provide: ReviewAnalysisAgent, useValue: {} },
			],
		});
		service = harness.moduleRef.get(RatingSnapshotService);
		entityManagerManager.setEntityManager(harness.orm.em);
		const em = harness.orm.em;
		city = testCity(em);
		const elsewhere = testCity(em, { slug: 'hamburg', name: 'Hamburg' });
		const chain = em.create(Brand, { name: 'Chain Burger', key: brandKey('Chain Burger') });
		const venue = (key: string, params: Partial<Venue> = {}) =>
			(v[key] = em.create(Venue, { city, placeId: `p-${key}`, name: key, category: 'Restaurant', ...params } as Venue));
		venue('twice', { reviewsCount: null });
		venue('once', { reviewsCount: 40 });
		venue('stale', { reviewsCount: 100 });
		venue('popular', { reviewsCount: 3015 });
		venue('closedPopular', { reviewsCount: 900, closed: true });
		venue('quiet', { reviewsCount: 499 });
		venue('branchA', { reviewsCount: 200, brand: chain });
		venue('branchB', { reviewsCount: 100, brand: chain });
		venue('branchAway', { reviewsCount: 50, brand: chain, city: elsewhere });
		venue('popularAway', { reviewsCount: 2000, city: elsewhere });
		venue('silent', { reviewsCount: 800 });

		let n = 0;
		const post = (postedAt: Date, mention: Partial<Mention>) =>
			em.create(Mention, {
				post: em.create(SocialPost, {
					city,
					externalId: `rs-${++n}`,
					platform: SocialPlatformEnum.TIKTOK,
					url: `https://tiktok.com/rs/${n}`,
					author: 'foodie',
					postedAt,
				}),
				venueName: 'x',
				visited: true,
				sentiment: 'positive',
				summary: 'Good.',
				...mention,
			});
		post(daysAgo(2), { venue: v.twice });
		post(daysAgo(9), { venue: v.twice });
		post(daysAgo(5), { venue: v.once });
		// Outside the 30 days
		post(daysAgo(40), { venue: v.stale });
		// A post naming the chain but no branch: its branches in the city
		post(daysAgo(3), { brand: chain });
		// Talked about but closed
		post(daysAgo(3), { venue: v.closedPopular });
		await em.flush();
	});

	afterAll(async () => {
		await harness.stop();
	});

	it('takes the venues posted about in the last 30 days, most first, then the ones with 500+ reviews', async () => {
		const due = await service.due(city, NOW);
		expect(due.map(d => [d.id, d.posts])).toEqual([
			[v.twice.id, 2],
			[v.branchA.id, 1],
			[v.branchB.id, 1],
			[v.once.id, 1],
			[v.popular.id, 0],
			[v.silent.id, 0],
		]);
	});

	it('snapshots as many as the budget plans for, one review each, keeping no review', async () => {
		const em = harness.orm.em;
		// $0.003 at 80 % is four reviews' worth
		const result = await service.snapshot(city, 0.003, NOW);
		expect(result).toEqual({ due: 6, talked: 4, requested: 4, snapshots: 4 });
		const [actor, input, opts] = runActor.mock.calls[0];
		expect(actor).toBe('compass/Google-Maps-Reviews-Scraper');
		expect(input).toEqual({
			placeIds: ['p-twice', 'p-branchA', 'p-branchB', 'p-once'],
			maxReviews: 1,
			reviewsSort: 'newest',
			language: 'en',
			personalData: false,
		});
		expect(opts.maxCostUsd).toBe(0.003);

		em.clear();
		const snapshots = await em.find(VenueSnapshot, {}, { populate: ['venue'], orderBy: { reviewsCount: 'asc' } });
		expect(snapshots.map(s => [s.venue.name, s.snapshotDate, s.rating, s.reviewsCount])).toEqual([
			['twice', '2026-10-25', 4.1, 1000],
			['branchA', '2026-10-25', 4.2, 1001],
			['branchB', '2026-10-25', 4.3, 1002],
			['once', '2026-10-25', 4.4, 1003],
		]);
		expect((await em.findOneOrFail(Venue, v.once.id)).reviewsCount).toBe(1003);
		expect(await em.count(Review, {})).toBe(0);
	});

	it('a place without a review gets no snapshot, and a second run the same day replaces the first', async () => {
		const em = harness.orm.em;
		runActor.mockClear();
		const result = await service.snapshot(city, 3, NOW);
		expect(result).toMatchObject({ requested: 6, snapshots: 5 });
		em.clear();
		expect(await em.count(VenueSnapshot, {})).toBe(5);
		expect(await em.count(VenueSnapshot, { venue: v.silent.id })).toBe(0);
	});
});
