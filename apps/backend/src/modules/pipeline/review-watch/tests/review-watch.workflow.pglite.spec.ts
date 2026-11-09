import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';

import type { GoogleMapsReviewItem } from 'src/modules/apify/actors/google-maps-reviews.actor.js';
import { ApifyService } from 'src/modules/apify/services/apify.service.js';
import { FakeApify } from 'src/modules/apify/tests/factories/fake-apify.js';
import type { City } from 'src/modules/cities/entities/city.entity.js';
import { CityService } from 'src/modules/cities/services/city.service.js';
import { cityFactory } from 'src/modules/cities/tests/factories/city.factory.js';
import { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';
import { fakeDurable } from 'src/modules/durable-workflows/tests/factories/durable.mock.js';
import { PgBossService } from 'src/modules/pgboss/pgboss.service.js';
import { Review } from 'src/modules/venues/entities/review.entity.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { ReviewService } from 'src/modules/venues/services/review.service.js';
import { VenueService } from 'src/modules/venues/services/venue.service.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { ReviewsWorkflow } from '../../atoms/reviews/workflows/reviews.workflow.js';
import { PipelineStepEnum } from '../../constants/pipeline.constant.js';
import { ReadReviewsWorkflow } from '../../read-reviews/workflows/read-reviews.workflow.js';
import { ReportBrandsService } from '../../shared/services/report-brands.service.js';
import { ReviewWatchWorkflow } from '../workflows/review-watch.workflow.js';

const NOW = new Date('2026-10-26T05:00:00Z');

/**
 * The weekly watch as the operation runs it (the facade faked to run a started child inline, the
 * clock fixed): the subscribers' venues fetched ten days back (or from their last fetch) as
 * `reviews.run` children, the city's reviews read, one alert per new critical unanswered review.
 */
describe('ReviewWatchWorkflow (pglite)', () => {
	let harness: PgliteTestingModule;
	let workflow: ReviewWatchWorkflow;
	let reviews: ReviewsWorkflow;
	let city: City;
	let subscribed: Venue[] = [];
	const apify = new FakeApify<GoogleMapsReviewItem>();
	const durable = fakeDurable(() => [workflow, reviews], 'op-1');
	durable.step = async <T>(name: string, fn: () => Promise<T>): Promise<T> =>
		name === 'clock' ? (NOW.toISOString() as unknown as T) : fn();
	const readReviews = { readCity: jest.fn(async (_cityId: string) => ({ read: 2 })) };
	const reportBrands = { subscribedVenues: async () => subscribed };
	const publishWithEm = jest.fn(async () => undefined);

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				ReviewWatchWorkflow,
				ReviewsWorkflow,
				ReviewService,
				VenueService,
				CityService,
				{ provide: ApifyService, useValue: apify },
				{ provide: DurableWorkflowsService, useValue: durable },
				{ provide: ReadReviewsWorkflow, useValue: readReviews },
				{ provide: ReportBrandsService, useValue: reportBrands },
				{ provide: PgBossService, useValue: { publishWithEm } },
			],
		});
		workflow = harness.moduleRef.get(ReviewWatchWorkflow);
		reviews = harness.moduleRef.get(ReviewsWorkflow);
		entityManagerManager.setEntityManager(harness.orm.em);
		city = await cityFactory.create({
			stepBudgetsUsd: { [PipelineStepEnum.WATCH_REVIEWS]: 1 },
		});
	});

	afterAll(async () => {
		await harness.stop();
	});

	it('a city without subscribers does nothing', async () => {
		expect(await workflow.week(city.id, '2026-W44')).toEqual({ venues: 0 });
		expect(apify.calls).toHaveLength(0);
	});

	it("fetches the subscribers' reviews of the last ten days, or since their last fetch, reads them and alerts on the critical unanswered ones", async () => {
		const em = harness.orm.em;
		const fresh = em.create(Venue, { city, placeId: 'w1', name: 'Fresh' });
		// Its stretch covers the tenth day back: it starts at its last fetch
		const covered = em.create(Venue, {
			city,
			placeId: 'w2',
			name: 'Covered',
			reviewsFetchedFrom: new Date('2026-10-01T00:00:00Z'),
			reviewsFetchedAt: new Date('2026-10-20T06:00:00Z'),
		});
		await em.flush();
		subscribed = [fresh, covered];
		apify.answer = input =>
			(input.placeIds as string[]).map(placeId => ({
				placeId,
				reviewId: `${placeId}-new`,
				publishedAtDate: '2026-10-22T10:00:00Z',
				stars: placeId === 'w1' ? 2 : 5,
				text: placeId === 'w1' ? 'Cold food' : 'Great',
				totalScore: 4.2,
				reviewsCount: 90,
			}));

		const result = await workflow.week(city.id, '2026-W44');

		expect(
			apify.calls.map(c => [c.input.placeIds, c.input.reviewsStartDate, c.options]),
		).toEqual([
			[
				['w1'],
				'2026-10-16',
				{
					maxCostUsd: 0.5,
					purpose: 'google-reviews since 2026-10-16 from 2026-10-16: 1 venues',
					ownerWorkflowId: 'op-1',
				},
			],
			[
				['w2'],
				'2026-10-20',
				{
					maxCostUsd: 0.5,
					purpose: 'google-reviews since 2026-10-16 from 2026-10-20: 1 venues',
					ownerWorkflowId: 'op-1',
				},
			],
		]);
		expect(readReviews.readCity).toHaveBeenCalledWith(city.id);
		expect(result).toEqual({ venues: 2, saved: 2, read: { read: 2 }, alerted: 1 });
		// The two-star review alerted once: stamped, and published
		expect(publishWithEm).toHaveBeenCalledTimes(1);
		em.clear();
		const alerted = await em.find(
			Review,
			{ alertedAt: { $ne: null } },
			{ populate: ['venue'] },
		);
		expect(alerted.map(r => r.venue.name)).toEqual(['Fresh']);
	});
});
