import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';

import { ApifyService } from 'src/modules/apify/services/apify.service.js';
import { City } from 'src/modules/cities/entities/city.entity.js';
import { CityService } from 'src/modules/cities/services/city.service.js';
import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { ProspectQueryService } from 'src/modules/outreach/services/prospect-query.service.js';
import { ReportEditorAgent } from 'src/modules/reports/agents/report-editor.agent.js';
import { ReviewReplyAgent } from 'src/modules/reports/agents/review-reply.agent.js';
import { ReportService } from 'src/modules/reports/services/report.service.js';
import { ReportConfigService } from 'src/modules/reports/services/report-config.service.js';
import { ReportTemplateService } from 'src/modules/reports/services/report-template.service.js';
import { ReportSignalsService } from 'src/modules/reports/services/report-signals.service.js';
import { Mention, MentionMatchMethodEnum } from 'src/modules/social/entities/mention.entity.js';
import { SocialPlatformEnum, SocialPost } from 'src/modules/social/entities/social-post.entity.js';
import { MentionMatchingService } from 'src/modules/social/services/mention-matching.service.js';
import { BrandCompetitor } from 'src/modules/venues/entities/brand-competitor.entity.js';
import { Review, ReviewPlatformEnum } from 'src/modules/venues/entities/review.entity.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { VenueSnapshot } from 'src/modules/venues/entities/venue-snapshot.entity.js';
import { BrandService } from 'src/modules/venues/services/brand.service.js';
import { CompetitorService } from 'src/modules/venues/services/competitor.service.js';
import { ReviewService } from 'src/modules/venues/services/review.service.js';
import { TripadvisorReviewService } from 'src/modules/venues/services/tripadvisor-review.service.js';
import { VenueService } from 'src/modules/venues/services/venue.service.js';
import { VenueBusynessService } from 'src/modules/venues/services/venue-busyness.service.js';
import { VenueDeliveryService } from 'src/modules/venues/services/venue-delivery.service.js';
import { VenueReservationService } from 'src/modules/venues/services/venue-reservation.service.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { mockAgent } from 'src/tests/mock-agent.js';
import { TopicService } from 'src/modules/topics/services/topic.service.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { PipelineStepEnum, REVIEW_BACKFILL_BUDGET_SHARE } from '../constants/pipeline.constant.js';
import { PipelineRun, PipelineRunStatusEnum } from '../entities/pipeline-run.entity.js';
import { PipelineService } from '../services/pipeline.service.js';

interface ReviewsInput {
	placeIds: string[];
	reviewsStartDate: string;
}
interface GoogleItem {
	placeId: string;
	reviewId: string;
	publishedAtDate: string;
	stars: number;
	text: string;
	totalScore: number;
	reviewsCount: number;
}

describe('PipelineService SCRAPE_REVIEWS (pglite)', () => {
	let harness: PgliteTestingModule;
	let service: PipelineService;
	let cityId: string;
	const cityRef = () => harness.orm.em.getReference(City, cityId);
	// The Google reviews each place has on Google; the actor returns those from the start date on
	const onGoogle = new Map<string, GoogleItem[]>();
	const runActor = jest.fn(async (_actor: string, input: ReviewsInput, _opts: { maxCostUsd: number }) =>
		input.placeIds.flatMap(id =>
			(onGoogle.get(id) ?? []).filter(i => i.publishedAtDate.slice(0, 10) >= input.reviewsStartDate),
		),
	);
	const topBrandIds = jest.fn(async (..._args: unknown[]) => [] as string[]);

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				BrandService,
				CityService,
				CompetitorService,
				PipelineService,
				ProspectQueryService,
				ReviewService,
				VenueService,
				ReportService,
				// Real: the report keeps the aspect vocabulary it was built with (the auto-mock has no index)
				TopicService,
				ReportConfigService,
				ReportTemplateService,
				ReportSignalsService,
				VenueBusynessService,
				VenueReservationService,
				VenueDeliveryService,
				{ provide: ApifyService, useValue: { runActor } },
				{ provide: MentionMatchingService, useValue: { topBrandIds } },
				{
					provide: TripadvisorReviewService,
					useValue: { findPages: async () => ({ searched: 0, found: 0 }), scrapeMonth: async () => 0 },
				},
				{
					provide: ReportEditorAgent,
					useValue: mockAgent({ title: 'First report', headline: 'Hello.', highlights: [], actions: [] }),
				},
				{ provide: ReviewReplyAgent, useValue: mockAgent({ replies: [] }) },
			],
		});
		service = harness.moduleRef.get(PipelineService);
		entityManagerManager.setEntityManager(harness.orm.em);
		const city = testCity(harness.orm.em);
		await harness.orm.em.flush();
		cityId = city.id;
	});

	afterAll(async () => {
		await harness.stop();
	});

	let n = 0;
	const item = (placeId: string, publishedAtDate: string): GoogleItem => ({
		placeId,
		reviewId: `g-${placeId}-${++n}`,
		publishedAtDate,
		stars: 4,
		text: 'Good food',
		totalScore: 4.3,
		reviewsCount: 400,
	});
	const execute = async (params: Record<string, unknown>) => {
		const em = harness.orm.em;
		const run = em.create(PipelineRun, {
			city: cityRef(),
			step: PipelineStepEnum.SCRAPE_REVIEWS,
			month: '2026-09',
			params,
			status: PipelineRunStatusEnum.QUEUED,
		});
		await em.flush();
		runActor.mockClear();
		await service.execute(run.id);
		em.clear();
		const done = await em.findOneOrFail(PipelineRun, run.id);
		expect(done.status).toBe(PipelineRunStatusEnum.SUCCEEDED);
		return {
			result: Object.values(done.result ?? {})[0] as Record<string, unknown>,
			calls: runActor.mock.calls.map(([, input, opts]) => ({
				placeIds: input.placeIds,
				since: input.reviewsStartDate,
				cap: opts.maxCostUsd,
			})),
		};
	};

	let newBrandId: string;

	it('starts a venue with no review from before the month six months back, in a second run on its capped share', async () => {
		const em = harness.orm.em;
		const city = cityRef();
		const known = em.create(Venue, { city, placeId: 'known', name: 'Döner Pro' });
		const fresh = em.create(Venue, { city, placeId: 'fresh', name: 'Chén Chè' });
		const rival = em.create(Venue, { city, placeId: 'rival', name: 'Zola' });
		// Known has August on file; Fresh only a TripAdvisor review and one the weekly watch
		// stored this month: neither is Google history
		em.create(Review, { venue: known, reviewId: 'known-aug', publishedAt: new Date('2026-08-15T10:00:00Z') });
		em.create(Review, {
			venue: fresh,
			reviewId: 'ta_1',
			platform: ReviewPlatformEnum.TRIPADVISOR,
			publishedAt: new Date('2026-08-20T10:00:00Z'),
		});
		em.create(Review, { venue: fresh, reviewId: 'fresh-watch', publishedAt: new Date('2026-09-25T10:00:00Z') });
		await em.flush();
		// A competitor nobody scraped yet: backfilled too, after the report brands' branches
		em.create(BrandCompetitor, { brand: known.brand, venue: rival });
		// What a first report needs: three posts in September, 12 reviews then, 5 a month before
		for (const [i, day] of ['08', '15', '22'].entries()) {
			const post = em.create(SocialPost, {
				city,
				externalId: `rev-post-${i}`,
				platform: SocialPlatformEnum.TIKTOK,
				url: `https://tiktok.com/rev-post-${i}`,
				postedAt: new Date(`2026-09-${day}T18:00:00Z`),
				author: `creator${i}`,
				authorFans: 5000,
				views: 10_000 * (i + 1),
			});
			em.create(Mention, {
				post,
				venueName: fresh.name,
				venue: fresh,
				brand: fresh.brand,
				matchMethod: MentionMatchMethodEnum.EXACT,
				visited: true,
				sentiment: 'positive',
				summary: 'Nice.',
			});
		}
		await em.flush();
		newBrandId = fresh.brand.id;
		onGoogle.set('known', [item('known', '2026-09-10T12:00:00Z'), item('known', '2026-10-01T09:00:00Z')]);
		onGoogle.set('fresh', [
			...['2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08'].flatMap(m =>
				[3, 9, 14, 20, 26].map(d => item('fresh', `${m}-${String(d).padStart(2, '0')}T12:00:00Z`)),
			),
			...[2, 4, 6, 9, 11, 13, 16, 18, 20, 23, 25, 28].map(d =>
				item('fresh', `2026-09-${String(d).padStart(2, '0')}T12:00:00Z`),
			),
			// Before the backfill's start: never asked for
			item('fresh', '2026-02-20T12:00:00Z'),
		]);
		onGoogle.set('rival', [item('rival', '2026-05-05T12:00:00Z')]);
		topBrandIds.mockResolvedValue([known.brand.id, fresh.brand.id]);

		const { result, calls } = await execute({});

		// $12 by default, less TripAdvisor's tenth: $10.80, the month first
		const google = 10.8;
		expect(calls).toEqual([
			{ placeIds: ['known'], since: '2026-09-01', cap: expect.closeTo(google * (1 - REVIEW_BACKFILL_BUDGET_SHARE), 5) },
			{ placeIds: ['fresh', 'rival'], since: '2026-03-01', cap: expect.closeTo(google * REVIEW_BACKFILL_BUDGET_SHARE, 5) },
		]);
		expect(calls[0].cap + calls[1].cap).toBeCloseTo(google);
		expect(result).toMatchObject({ saved: 2 + 42 + 1, backfilled: 2, backfillSince: '2026-03-01', backfillSaved: 43 });

		const em2 = harness.orm.em;
		// Six months and September, the watch's one besides
		expect(await em2.count(Review, { venue: { placeId: 'fresh' }, platform: ReviewPlatformEnum.GOOGLE })).toBe(43);
		// The rating snapshot is today's, whatever month the reviews were
		const today = new Date().toISOString().slice(0, 10);
		const snapshots = await em2.find(VenueSnapshot, { venue: { placeId: { $in: ['fresh', 'rival'] } } });
		expect(snapshots.map(s => s.snapshotDate)).toEqual([today, today]);
	});

	it('gives the new brand a previous month and, with enough reviews, a correlation in its first report', async () => {
		const report = await harness.moduleRef.get(ReportService).build(newBrandId, cityId, '2026-09');
		expect(report.data.previous?.reviews).toBeDefined();
		// August's five from the backfill and the TripAdvisor one
		expect(report.data.previous?.reviews?.count).toBe(6);
		expect(report.data.correlations?.buzzToReviews).toBeDefined();
	});

	it('once tracked, the venues get the month alone; `params.since` starts every venue there in one run', async () => {
		const plain = await execute({});
		expect(plain.calls).toEqual([
			{ placeIds: ['known', 'fresh', 'rival'], since: '2026-09-01', cap: expect.closeTo(10.8, 5) },
		]);
		expect(plain.result).toMatchObject({ backfilled: 0 });
		expect(plain.result.backfillSince).toBeUndefined();

		const manual = await execute({ since: '2026-08-01', budgetUsd: 14 });
		expect(manual.calls).toEqual([
			{ placeIds: ['known', 'fresh', 'rival'], since: '2026-08-01', cap: expect.closeTo(12.6, 5) },
		]);
		expect(manual.result).toMatchObject({ backfilled: 0 });
	});

	it('gives the backfill the whole Google budget when no venue is tracked yet', async () => {
		const em = harness.orm.em;
		const first = em.create(Venue, { city: cityRef(), placeId: 'first-city-run', name: 'Brammibal' });
		await em.flush();
		topBrandIds.mockResolvedValue([first.brand.id]);

		const { calls, result } = await execute({});
		expect(calls).toEqual([{ placeIds: ['first-city-run'], since: '2026-03-01', cap: expect.closeTo(10.8, 5) }]);
		expect(result).toMatchObject({ saved: 0, backfilled: 1, backfillSince: '2026-03-01' });
	});
});
