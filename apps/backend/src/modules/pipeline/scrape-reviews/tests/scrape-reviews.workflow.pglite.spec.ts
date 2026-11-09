import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';

import type { GoogleMapsReviewItem } from 'src/modules/apify/actors/google-maps-reviews.actor.js';
import { ApifyService } from 'src/modules/apify/services/apify.service.js';
import { FakeApify } from 'src/modules/apify/tests/factories/fake-apify.js';
import type { City } from 'src/modules/cities/entities/city.entity.js';
import { CityService } from 'src/modules/cities/services/city.service.js';
import { cityFactory } from 'src/modules/cities/tests/factories/city.factory.js';
import { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';
import { fakeDurable } from 'src/modules/durable-workflows/tests/factories/durable.mock.js';
import { Review } from 'src/modules/venues/entities/review.entity.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { ReviewService } from 'src/modules/venues/services/review.service.js';
import { TripadvisorReviewService } from 'src/modules/venues/services/tripadvisor-review.service.js';
import { VenueService } from 'src/modules/venues/services/venue.service.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { ReviewsWorkflow } from '../../atoms/reviews/workflows/reviews.workflow.js';
import { PipelineStepEnum } from '../../constants/pipeline.constant.js';
import { FillCompetitorsWorkflow } from '../../fill-competitors/workflows/fill-competitors.workflow.js';
import { ReportBrandsService } from '../../shared/services/report-brands.service.js';
import { ScrapeReviewsWorkflow } from '../workflows/scrape-reviews.workflow.js';

const NOW = new Date('2026-10-02T06:00:00Z');

/**
 * The month's review scrape as the operation runs it (the facade faked to run a started child
 * inline, the clock fixed): the competitors filled first, the scope split into the tracked venues'
 * run from the month's first day and the backfill of the venues new to the set, each a
 * `reviews.run` child owned by the operation, then the TripAdvisor side's plans on a tenth of
 * the budget and its save in the step the Data page reads.
 */
describe('ScrapeReviewsWorkflow (pglite)', () => {
	let harness: PgliteTestingModule;
	let workflow: ScrapeReviewsWorkflow;
	let reviews: ReviewsWorkflow;
	let city: City;
	let branch1: Venue;
	let branch2: Venue;
	let competitor: Venue;
	const apify = new FakeApify<GoogleMapsReviewItem>();
	const durable = fakeDurable(() => [workflow, reviews], 'op-1');
	durable.step = async <T>(name: string, fn: () => Promise<T>): Promise<T> =>
		name === 'clock' ? (NOW.toISOString() as unknown as T) : fn();
	const fillCompetitors = {
		month: jest.fn(async (_cityId: string, _month: string) => ({ filled: 0 })),
	};
	// TripAdvisor's two children are covered in tripadvisor-review.pglite.spec.ts: here its plans
	// run nothing (no page to search, none to fetch) and its saves answer fixed counts
	const tripadvisor = {
		planPages: jest.fn(
			(_city: { id: string }, _venues: { placeId: string }[], _budgetUsd: number) => ({
				venueIds: {},
				call: null,
			}),
		),
		savePages: jest.fn(async () => ({ searched: 1, found: 1 })),
		planMonth: jest.fn(async (_month: string, _venueIds: string[], _budgetUsd: number) => ({
			venueIds: {},
			call: null,
		})),
		saveMonth: jest.fn(
			async (
				_month: string,
				_plan: { venueIds: object; call: null },
				_recordId: string | null,
			) => 2,
		),
	};
	const reportBrands = {
		scope: async () => ({
			brands: [{ branches: [branch1, branch2] }],
			branches: [branch1, branch2],
			competitors: [competitor],
		}),
	};

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				ScrapeReviewsWorkflow,
				ReviewsWorkflow,
				ReviewService,
				VenueService,
				CityService,
				{ provide: ApifyService, useValue: apify },
				{ provide: DurableWorkflowsService, useValue: durable },
				{ provide: FillCompetitorsWorkflow, useValue: fillCompetitors },
				{ provide: TripadvisorReviewService, useValue: tripadvisor },
				{ provide: ReportBrandsService, useValue: reportBrands },
			],
		});
		workflow = harness.moduleRef.get(ScrapeReviewsWorkflow);
		reviews = harness.moduleRef.get(ReviewsWorkflow);
		entityManagerManager.setEntityManager(harness.orm.em);
		const em = harness.orm.em;
		city = await cityFactory.create({
			stepBudgetsUsd: { [PipelineStepEnum.SCRAPE_REVIEWS]: 12 },
		});
		const venue = (placeId: string, params: Partial<Venue> = {}) =>
			em.create(Venue, { city, placeId, name: placeId, ...params } as Venue);
		// Tracked: a review stored from before the backfill window
		branch1 = venue('b1');
		em.create(Review, {
			venue: branch1,
			reviewId: 'old',
			publishedAt: new Date('2026-01-10T10:00:00Z'),
		});
		// Only the weekly fetch's last week: no history, backfilled
		branch2 = venue('b2', {
			reviewsFetchedFrom: new Date('2026-09-20T00:00:00Z'),
			reviewsFetchedAt: new Date('2026-09-27T06:00:00Z'),
		});
		competitor = venue('c1');
		await em.flush();
	});

	afterAll(async () => {
		await harness.stop();
	});

	it('fills the competitors, runs the tracked venues from the month and the new ones from six months back on 40 %, then the TripAdvisor side', async () => {
		const em = harness.orm.em;
		const item = (placeId: string, reviewId: string, publishedAtDate: string) => ({
			placeId,
			reviewId,
			publishedAtDate,
			stars: 4,
			text: 'Fine',
			totalScore: 4.3,
			reviewsCount: 50,
		});
		apify.answer = input =>
			input.reviewsStartDate === '2026-09-01' ?
				[item('b1', 'b1-sep', '2026-09-05T10:00:00Z')]
			:	[
					item('b2', 'b2-may', '2026-05-05T10:00:00Z'),
					item('b2', 'b2-sep', '2026-09-22T10:00:00Z'),
					item('c1', 'c1-jun', '2026-06-01T10:00:00Z'),
				];

		const result = await workflow.month(city.id, '2026-09');

		// The dependency under its one id
		expect(durable.started[0].options).toMatchObject({
			workflowId: `fill-competitors.month-${city.id}-2026-09`,
		});
		expect(fillCompetitors.month).toHaveBeenCalledWith(city.id, '2026-09');
		// Google's $10.80: 60 % to the month's run, 40 % to the backfill
		expect(apify.calls.map(c => [c.input.placeIds, c.input.reviewsStartDate])).toEqual([
			[['b1'], '2026-09-01'],
			[['b2', 'c1'], '2026-03-01'],
		]);
		expect(apify.calls[0].options).toEqual({
			maxCostUsd: 6.48,
			purpose: 'google-reviews 2026-09 from 2026-09-01: 1 venues',
			ownerWorkflowId: 'op-1',
		});
		expect(apify.calls[1].options.maxCostUsd).toBeCloseTo(4.32, 6);
		// TripAdvisor: the branches, a tenth of the budget split between the page search and the month
		const [taCity, taVenues, pagesBudget] = tripadvisor.planPages.mock.calls[0];
		expect([taCity.id, taVenues.map(v => v.placeId)]).toEqual([city.id, ['b1', 'b2']]);
		expect(pagesBudget).toBeCloseTo(0.6, 6);
		const [taMonth, taVenueIds, monthBudget] = tripadvisor.planMonth.mock.calls[0];
		expect([taMonth, taVenueIds.length]).toEqual(['2026-09', 2]);
		expect(monthBudget).toBeCloseTo(0.6, 6);
		expect(tripadvisor.saveMonth).toHaveBeenCalledWith(
			'2026-09',
			{ venueIds: {}, call: null },
			null,
		);
		expect(result).toEqual({
			saved: 4,
			backfilled: 2,
			backfillSince: '2026-03-01',
			backfillSaved: 3,
			branches: 1,
			competitors: 1,
			tripadvisor: { searched: 1, found: 1, saved: 2 },
		});
		em.clear();
		expect(await em.count(Review, {})).toBe(5);
		// The backfilled venue's stretch now starts six months back, joined to the weekly one
		expect(
			(await em.findOneOrFail(Venue, { placeId: 'b2' })).reviewsFetchedFrom?.toISOString(),
		).toBe('2026-03-01T00:00:00.000Z');
	});
});
