import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import _ from 'lodash';

import type { GoogleMapsReviewItem } from 'src/modules/apify/actors/google-maps-reviews.actor.js';
import { ApifyService } from 'src/modules/apify/services/apify.service.js';
import { FakeApify } from 'src/modules/apify/tests/factories/fake-apify.js';
import type { City } from 'src/modules/cities/entities/city.entity.js';
import { CityService } from 'src/modules/cities/services/city.service.js';
import { cityFactory } from 'src/modules/cities/tests/factories/city.factory.js';
import { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';
import { fakeDurable } from 'src/modules/durable-workflows/tests/factories/durable.mock.js';
import { Mention } from 'src/modules/social/entities/mention.entity.js';
import { SocialPlatformEnum, SocialPost } from 'src/modules/social/entities/social-post.entity.js';
import { Review } from 'src/modules/venues/entities/review.entity.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { VenueSnapshot } from 'src/modules/venues/entities/venue-snapshot.entity.js';
import { RatingSnapshotService } from 'src/modules/venues/services/rating-snapshot.service.js';
import { BACKFILL_RUN_VENUES, ReviewService } from 'src/modules/venues/services/review.service.js';
import { VenueService } from 'src/modules/venues/services/venue.service.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { ReviewsWorkflow } from '../../atoms/reviews/workflows/reviews.workflow.js';
import { BackfillReviewsWorkflow } from '../workflows/backfill-reviews.workflow.js';

const NOW = new Date('2026-11-01T00:00:00Z');
const SINCE = '2026-05-01';

/**
 * A city-wide backfill as the operation runs it (the facade faked to run a started child inline,
 * the clock fixed): the venues posts named lately without reviews stored from the day, planned as
 * the budget covers, fetched in runs of `BACKFILL_RUN_VENUES` one after the other until the
 * budget is spent, each capped over its plan and never more than the budget left.
 */
describe('BackfillReviewsWorkflow (pglite)', () => {
	let harness: PgliteTestingModule;
	let workflow: BackfillReviewsWorkflow;
	let reviews: ReviewsWorkflow;
	let city: City;
	const apify = new FakeApify<GoogleMapsReviewItem>();
	const durable = fakeDurable(() => [workflow, reviews], 'op-1');
	durable.step = async <T>(name: string, fn: () => Promise<T>): Promise<T> =>
		name === 'clock' ? (NOW.toISOString() as unknown as T) : fn();

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				BackfillReviewsWorkflow,
				ReviewsWorkflow,
				RatingSnapshotService,
				ReviewService,
				VenueService,
				CityService,
				{ provide: ApifyService, useValue: apify },
				{ provide: DurableWorkflowsService, useValue: durable },
			],
		});
		workflow = harness.moduleRef.get(BackfillReviewsWorkflow);
		reviews = harness.moduleRef.get(ReviewsWorkflow);
		entityManagerManager.setEntityManager(harness.orm.em);
		city = await cityFactory.create();
	});

	afterAll(async () => {
		await harness.stop();
	});

	let n = 0;
	/** A venue (no review count: planned at the five-review minimum, $0.003), named by a post `daysAgo` */
	const talked = (placeId: string, daysAgo = 10): Venue => {
		const em = harness.orm.em;
		const venue = em.create(Venue, {
			city,
			placeId,
			name: placeId,
			reviewsCount: null,
		} as Venue);
		em.create(Mention, {
			post: em.create(SocialPost, {
				city,
				externalId: `bf-${++n}`,
				platform: SocialPlatformEnum.TIKTOK,
				url: `https://tiktok.com/bf/${n}`,
				author: 'foodie',
				postedAt: new Date(NOW.getTime() - daysAgo * 86_400_000),
			}),
			venue,
			venueName: placeId,
			visited: true,
		});
		return venue;
	};

	beforeEach(async () => {
		const em = harness.orm.em;
		apify.reset();
		await em.nativeDelete(Mention, {});
		await em.nativeDelete(SocialPost, {});
		await em.nativeDelete(Review, {});
		await em.nativeDelete(VenueSnapshot, {});
		await em.nativeDelete(Venue, {});
		em.clear();
		// 101 talked venues: two runs; one with history, one nobody posted about
		_.range(101).forEach(i => talked(`p-${String(i).padStart(3, '0')}`));
		const stored = talked('p-stored');
		em.create(Review, {
			venue: stored,
			reviewId: 'stored-1',
			publishedAt: new Date(`${SINCE}T10:00:00Z`),
		});
		em.create(Venue, { city, placeId: 'p-quiet', name: 'quiet', reviewsCount: 5000 } as Venue);
		await em.flush();
	});

	const reviewsOf = (placeIds: string[], each: number): GoogleMapsReviewItem[] =>
		placeIds.flatMap(placeId =>
			_.range(each).map(i => ({
				placeId,
				reviewId: `${placeId}-${i}`,
				publishedAtDate: '2026-06-01T10:00:00Z',
				stars: 4,
				text: 'Fine',
				totalScore: 4.1,
				reviewsCount: 30,
			})),
		);

	it('plans the talked venues without history as the budget covers, and stops once the budget is spent', async () => {
		apify.answer = input => reviewsOf(input.placeIds as string[], 6);
		const result = await workflow.run(city.id, {
			since: SINCE,
			talkedDays: 90,
			budgetUsd: 0.31,
		});

		expect(result).toEqual({
			talked: 102,
			withHistory: 1,
			since: SINCE,
			budgetUsd: 0.31,
			venues: 101,
			taken: 101,
			left: 0,
			plannedUsd: 0.3,
			// The first run's 600 reviews ($0.36) spent the budget: the second never ran
			runs: 1,
			saved: 600,
			returned: 100,
		});
		expect(apify.calls).toHaveLength(1);
		const [{ input, options }] = apify.calls;
		expect(input.reviewsStartDate).toBe(SINCE);
		expect((input.placeIds as string[]).length).toBe(BACKFILL_RUN_VENUES);
		expect(input.placeIds).not.toContain('p-stored');
		expect(input.placeIds).not.toContain('p-quiet');
		// The plan's $0.30 with headroom would be $0.45: the budget is the cap
		expect(options).toEqual({
			maxCostUsd: 0.31,
			purpose: `google-reviews backfill from ${SINCE}: 100 venues`,
			ownerWorkflowId: 'op-1',
		});
		const em = harness.orm.em;
		em.clear();
		expect(await em.count(Review, {})).toBe(601);
		// A venue that came back whole has its stretch from the day
		expect(
			(await em.findOneOrFail(Venue, { placeId: 'p-000' })).reviewsFetchedFrom?.toISOString(),
		).toBe(`${SINCE}T00:00:00.000Z`);
	});

	it('goes on to the next run while the budget lasts, its cap over its own plan', async () => {
		apify.answer = input => reviewsOf((input.placeIds as string[]).slice(0, 2), 1);
		const result = await workflow.run(city.id, {
			since: SINCE,
			talkedDays: 90,
			budgetUsd: 0.31,
		});

		expect(result).toMatchObject({ runs: 2, saved: 3, returned: 3 });
		expect(apify.calls.map(c => (c.input.placeIds as string[]).length)).toEqual([100, 1]);
		// One venue's $0.003 plan with headroom, floored at the actor's lowest cap
		expect(apify.calls[1].options.maxCostUsd).toBe(0.05);
	});
});
