import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import _ from 'lodash';

import type { GoogleMapsReviewItem } from 'src/modules/apify/actors/google-maps-reviews.actor.js';
import { ApifyService } from 'src/modules/apify/services/apify.service.js';
import { FakeApify } from 'src/modules/apify/tests/factories/fake-apify.js';
import type { City } from 'src/modules/cities/entities/city.entity.js';
import { cityFactory } from 'src/modules/cities/tests/factories/city.factory.js';
import { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';
import { fakeDurable } from 'src/modules/durable-workflows/tests/factories/durable.mock.js';
import { Review } from 'src/modules/venues/entities/review.entity.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { VenueSnapshot } from 'src/modules/venues/entities/venue-snapshot.entity.js';
import { ReviewService } from 'src/modules/venues/services/review.service.js';
import { VenueService } from 'src/modules/venues/services/venue.service.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { ReviewsWorkflow } from '../workflows/reviews.workflow.js';

const NOW = new Date('2026-10-02T06:30:00Z');

/** One review as the actor returns it, with its place's all-time figures */
const review = (
	placeId: string,
	reviewId: string,
	publishedAtDate: string,
	totalScore: number,
	reviewsCount: number,
): GoogleMapsReviewItem => ({
	placeId,
	reviewId,
	publishedAtDate,
	stars: 5,
	text: 'Good',
	totalScore,
	reviewsCount,
});

/**
 * The atom: the actor's input built from the fetch, the run's cap and owner, what the save keeps
 * (the rows from the day on, each venue's snapshot and stretch, the capped run's last venue left
 * unstamped, the newest-review check's verdicts) and the result a caller reads.
 */
describe('ReviewsWorkflow (pglite)', () => {
	let harness: PgliteTestingModule;
	let reviews: ReviewsWorkflow;
	let city: City;
	const apify = new FakeApify<GoogleMapsReviewItem>();
	const durable = fakeDurable(() => [reviews], 'op-1');

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				ReviewsWorkflow,
				ReviewService,
				VenueService,
				{ provide: ApifyService, useValue: apify },
				{ provide: DurableWorkflowsService, useValue: durable },
			],
		});
		reviews = harness.moduleRef.get(ReviewsWorkflow);
		entityManagerManager.setEntityManager(harness.orm.em);
		city = await cityFactory.create();
	});

	afterAll(async () => {
		await harness.stop();
	});

	beforeEach(async () => {
		apify.reset();
		durable.started.length = 0;
		const em = harness.orm.em;
		await em.nativeDelete(Review, {});
		await em.nativeDelete(VenueSnapshot, {});
		await em.nativeDelete(Venue, {});
		em.clear();
	});

	const venue = (placeId: string, params: Partial<Venue> = {}) =>
		harness.orm.em.create(Venue, { city, placeId, name: placeId, ...params } as Venue);

	it("a fetch from a day: the actor's input, the cap floored, the operation as the run's owner; the reviews from the day on saved, each venue's rating snapshotted, its stretch stamped", async () => {
		const em = harness.orm.em;
		venue('pa', { rating: 4.0, reviewsCount: 100 });
		venue('pb', { rating: 4.5, reviewsCount: 50 });
		venue('pq', { rating: 3.9 });
		await em.flush();
		apify.answer = () => [
			review('pa', 'r1', '2026-09-03T10:00:00Z', 4.2, 130),
			review('pa', 'r2', '2026-09-20T10:00:00Z', 4.2, 130),
			// After the month: paid for too, kept as October's
			review('pb', 'r3', '2026-10-01T10:00:00Z', 4.6, 60),
			// Before the start day (the actor rounds to days): left out
			review('pb', 'r0', '2026-08-31T23:00:00Z', 4.6, 60),
		];
		const purpose = 'google-reviews 2026-09 from 2026-09-01: 3 venues';
		const result = await reviews.call({
			fetch: { mode: 'since', placeIds: ['pa', 'pb', 'pq'], since: '2026-09-01' },
			maxCostUsd: 0.01,
			purpose,
			now: NOW.toISOString(),
		});

		expect(apify.calls).toHaveLength(1);
		const [{ actor, input, options }] = apify.calls;
		expect(actor).toBe('compass/Google-Maps-Reviews-Scraper');
		expect(input).toEqual({
			placeIds: ['pa', 'pb', 'pq'],
			reviewsStartDate: '2026-09-01',
			reviewsSort: 'newest',
			language: 'en',
			personalData: false,
		});
		// A cap under $0.05 risks a refused start
		expect(options).toEqual({ maxCostUsd: 0.05, purpose, ownerWorkflowId: 'op-1' });
		expect(durable.started[0].options).toEqual({ attributes: { purpose } });
		expect(result).toEqual({
			recordId: 'run-1',
			found: 4,
			saved: 3,
			rated: 2,
			returned: ['pa', 'pb'],
			capped: false,
			upToDate: 0,
			missed: 0,
		});

		em.clear();
		const snapshots = await em.find(VenueSnapshot, {}, { populate: ['venue'] });
		expect(
			snapshots.map(s => [s.venue.name, s.snapshotDate, s.rating, s.reviewsCount]).sort(),
		).toEqual([
			['pa', '2026-10-02', 4.2, 130],
			['pb', '2026-10-02', 4.6, 60],
		]);
		expect(await em.findOneOrFail(Venue, { placeId: 'pa' })).toMatchObject({
			rating: 4.2,
			reviewsCount: 130,
			reviewsFetchedFrom: new Date('2026-09-01T00:00:00Z'),
			reviewsFetchedAt: NOW,
		});
		// No item: no snapshot, the rating left as it was, not fetched
		expect(await em.findOneOrFail(Venue, { placeId: 'pq' })).toMatchObject({
			rating: 3.9,
			reviewsFetchedAt: null,
		});
		expect((await em.find(Review, {})).map(r => r.reviewId).sort()).toEqual(['r1', 'r2', 'r3']);
	});

	it('a run that spent its cap leaves its last venue unstamped: the cap may have cut its older reviews', async () => {
		const em = harness.orm.em;
		venue('pa');
		venue('pb');
		await em.flush();
		// 80 reviews at $0.0006 = $0.048: 90 % of the $0.05 cap
		apify.answer = () =>
			['pa', 'pb'].flatMap(placeId =>
				_.range(40).map(i =>
					review(placeId, `${placeId}-${i}`, '2026-09-10T10:00:00Z', 4, 40),
				),
			);
		const result = await reviews.call({
			fetch: { mode: 'since', placeIds: ['pa', 'pb'], since: '2026-09-01' },
			maxCostUsd: 0.05,
			purpose: 'capped',
			now: NOW.toISOString(),
		});
		expect(result).toMatchObject({
			found: 80,
			saved: 80,
			capped: true,
			returned: ['pa', 'pb'],
		});
		em.clear();
		expect((await em.findOneOrFail(Venue, { placeId: 'pa' })).reviewsFetchedAt).toEqual(NOW);
		expect((await em.findOneOrFail(Venue, { placeId: 'pb' })).reviewsFetchedAt).toBeNull();
	});

	it("each place's newest review: a quiet place gets its snapshot and counts as fetched, one with a newer review was missed, one with no review at all counts as fetched", async () => {
		const em = harness.orm.em;
		venue('pa');
		venue('pb', { rating: 3 });
		venue('pc');
		await em.flush();
		apify.answer = () => [
			review('pa', 'a-new', '2026-10-01T10:00:00Z', 4.1, 10),
			review('pb', 'b-old', '2026-05-01T10:00:00Z', 4.4, 20),
		];
		const result = await reviews.call({
			fetch: {
				mode: 'newest',
				places: [
					{ placeId: 'pa', since: '2026-09-25' },
					{ placeId: 'pb', since: '2026-09-25' },
					{ placeId: 'pc', since: '2026-09-20' },
				],
			},
			maxCostUsd: 0.1,
			purpose: 'google-ratings: 3 venues without new reviews',
			now: NOW.toISOString(),
		});
		expect(apify.calls[0].input).toEqual({
			placeIds: ['pa', 'pb', 'pc'],
			maxReviews: 1,
			reviewsSort: 'newest',
			language: 'en',
			personalData: false,
		});
		expect(apify.calls[0].options.maxCostUsd).toBe(0.1);
		expect(result).toEqual({
			recordId: 'run-1',
			found: 2,
			saved: 0,
			rated: 1,
			returned: ['pa', 'pb'],
			capped: false,
			upToDate: 1,
			missed: 1,
		});
		em.clear();
		// The check writes no review: the missed place's come with its next fetch
		expect(await em.count(Review, {})).toBe(0);
		expect(await em.count(VenueSnapshot, {})).toBe(1);
		expect(await em.findOneOrFail(Venue, { placeId: 'pa' })).toMatchObject({
			reviewsFetchedAt: null,
		});
		expect(await em.findOneOrFail(Venue, { placeId: 'pb' })).toMatchObject({
			rating: 4.4,
			reviewsCount: 20,
			reviewsFetchedFrom: new Date('2026-09-25T00:00:00Z'),
			reviewsFetchedAt: NOW,
		});
		expect(await em.findOneOrFail(Venue, { placeId: 'pc' })).toMatchObject({
			reviewsFetchedFrom: new Date('2026-09-20T00:00:00Z'),
			reviewsFetchedAt: NOW,
		});
	});

	it('a fan-out fails only once every run has settled, naming the failed one; the others are saved', async () => {
		const em = harness.orm.em;
		venue('pa');
		await em.flush();
		let runs = 0;
		apify.answer = () => {
			if (++runs === 1) throw new Error('actor refused');
			return [review('pa', 'r1', '2026-09-03T10:00:00Z', 4, 1)];
		};
		const call = (purpose: string) => ({
			fetch: { mode: 'since' as const, placeIds: ['pa'], since: '2026-09-01' },
			maxCostUsd: 1,
			purpose,
		});
		await expect(reviews.callAll([call('first'), call('second')], NOW)).rejects.toThrow(
			'1 of 2 review runs failed (first: actor refused)',
		);
		expect(apify.calls).toHaveLength(2);
		em.clear();
		expect(await em.count(Review, {})).toBe(1);
	});
});
