import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';

import { ApifyService } from 'src/modules/apify/services/apify.service.js';
import type { City } from 'src/modules/cities/entities/city.entity.js';
import { CityService } from 'src/modules/cities/services/city.service.js';
import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { PgBossService } from 'src/modules/pgboss/pgboss.service.js';
import { Mention, MentionMatchMethodEnum } from 'src/modules/social/entities/mention.entity.js';
import { SocialPlatformEnum, SocialPost } from 'src/modules/social/entities/social-post.entity.js';
import { Review } from 'src/modules/venues/entities/review.entity.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { BrandService } from 'src/modules/venues/services/brand.service.js';
import { RatingSnapshotService } from 'src/modules/venues/services/rating-snapshot.service.js';
import { ReviewService } from 'src/modules/venues/services/review.service.js';
import { VenueService } from 'src/modules/venues/services/venue.service.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { ONE_OFF_RUNS, PipelineStepEnum } from '../constants/pipeline.constant.js';
import { CreatorWatchCron } from '../crons/creator-watch.cron.js';
import { PipelineRun, PipelineRunStatusEnum } from '../entities/pipeline-run.entity.js';
import { PipelineService } from '../services/pipeline.service.js';
import { PipelineBootService } from '../services/pipeline-boot.service.js';

import { caughtUpIngestion } from './factories/ingestion.mock.js';

const DAY = 86_400_000;

interface ReviewsInput {
	placeIds: string[];
	reviewsStartDate: string;
}

describe('One-off runs, the review backfill and the creator cron (pglite)', () => {
	let harness: PgliteTestingModule;
	let berlin: City;
	const sendJob = jest.fn(async () => 'job-id');
	// The Google reviews each place has; the actor returns those from the start date on
	const onGoogle = new Map<string, { placeId: string; reviewId: string; publishedAtDate: string; stars: number }[]>();
	const runActor = jest.fn(async (_actor: string, input: ReviewsInput, _opts: { maxCostUsd: number }) =>
		input.placeIds.flatMap(id => (onGoogle.get(id) ?? []).filter(i => i.publishedAtDate.slice(0, 10) >= input.reviewsStartDate)),
	);

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				PipelineService,
				PipelineBootService,
				CreatorWatchCron,
				caughtUpIngestion(),
				CityService,
				BrandService,
				ReviewService,
				RatingSnapshotService,
				VenueService,
				{ provide: PgBossService, useValue: { sendJob } },
				{ provide: ApifyService, useValue: { runActor } },
			],
		});
		entityManagerManager.setEntityManager(harness.orm.em);
		const em = harness.orm.em;
		berlin = testCity(em, { name: 'Berlin', cronEnabled: true });
		testCity(em, { name: 'By hand', cronEnabled: false });
		await em.flush();
	});

	afterAll(async () => {
		await harness.stop();
	});

	it('queues each one-off once per cron city, never again on a later boot', async () => {
		const em = harness.orm.em;
		const boot = harness.moduleRef.get(PipelineBootService);
		expect(await boot.queueOneOffs()).toBe(ONE_OFF_RUNS.length);
		expect(await boot.queueOneOffs()).toBe(0);
		em.clear();
		const runs = await em.find(PipelineRun, { step: PipelineStepEnum.BACKFILL_REVIEWS }, { populate: ['city'] });
		expect(runs.map(r => [r.city.name, r.status, r.params])).toEqual([
			['Berlin', PipelineRunStatusEnum.QUEUED, { ...ONE_OFF_RUNS[0].params, key: ONE_OFF_RUNS[0].key }],
		]);
		await em.nativeDelete(PipelineRun, {});
	});

	it('backfills the venues posts named lately that have no reviews stored from then, most named first, within the budget', async () => {
		const em = harness.orm.em;
		const venue = (name: string, reviewsCount: number, extra: Partial<Venue> = {}) =>
			em.create(Venue, { city: berlin, placeId: `place-${name}`, name, category: 'Restaurant', reviewsCount, ...extra });
		const named = venue('Named', 1_000);
		const tracked = venue('Tracked', 500, { reviewsFetchedFrom: new Date('2026-04-01T00:00:00Z'), reviewsFetchedAt: new Date() });
		// Named less, and so big its plan alone is over the budget: left for later
		const huge = venue('Huge', 1_000_000);
		venue('Unnamed', 800);
		let n = 0;
		const post = (place: Venue, daysAgo: number) => {
			const p = em.create(SocialPost, {
				city: berlin,
				externalId: `p${++n}`,
				platform: SocialPlatformEnum.TIKTOK,
				url: `https://tiktok.com/p${n}`,
				postedAt: new Date(Date.now() - daysAgo * DAY),
				author: `creator${n}`,
			});
			em.create(Mention, { post: p, venueName: place.name, venue: place, brand: place.brand, matchMethod: MentionMatchMethodEnum.EXACT, visited: true });
		};
		post(named, 10);
		post(named, 20);
		post(tracked, 10);
		post(huge, 30);
		// Older than the window: not "named lately"
		post(venue('Long ago', 300), 120);
		await em.flush();
		onGoogle.set('place-Named', [
			{ placeId: 'place-Named', reviewId: 'r-before', publishedAtDate: '2026-04-20T10:00:00Z', stars: 5 },
			{ placeId: 'place-Named', reviewId: 'r-june', publishedAtDate: '2026-06-10T10:00:00Z', stars: 4 },
		]);
		runActor.mockClear();

		const run = em.create(PipelineRun, {
			city: berlin,
			step: PipelineStepEnum.BACKFILL_REVIEWS,
			month: '2026-11',
			params: { since: '2026-05-01', talkedDays: 90, budgetUsd: 2, key: 'test' },
			status: PipelineRunStatusEnum.QUEUED,
		});
		await em.flush();
		await harness.moduleRef.get(PipelineService).execute(run.id);
		em.clear();
		const done = await em.findOneOrFail(PipelineRun, { id: run.id });
		expect(done.status).toBe(PipelineRunStatusEnum.SUCCEEDED);
		expect(done.result?.['1. BACKFILL_REVIEWS']).toMatchObject({
			talked: 3,
			withHistory: 1,
			since: '2026-05-01',
			venues: 2,
			taken: 1,
			left: 1,
			runs: 1,
			saved: 1,
			returned: 1,
		});
		// One run for the one venue that fits, from the backfill's day
		expect(runActor).toHaveBeenCalledTimes(1);
		expect(runActor.mock.calls[0][1]).toMatchObject({ placeIds: ['place-Named'], reviewsStartDate: '2026-05-01' });
		expect((await em.find(Review, {})).map(r => r.reviewId)).toEqual(['r-june']);
		// Its stored stretch starts at the backfill's day: later fetches go on from it
		const after = await em.findOneOrFail(Venue, { name: 'Named' });
		expect(after.reviewsFetchedFrom?.toISOString().slice(0, 10)).toBe('2026-05-01');
		expect(after.reviewsFetchedAt).toBeTruthy();
	});

	it('queues the daily creator scrape once per cron city', async () => {
		const em = harness.orm.em;
		await em.nativeDelete(PipelineRun, {});
		const cron = harness.moduleRef.get(CreatorWatchCron);
		await cron.queueAll(new Date());
		await cron.queueAll(new Date());
		em.clear();
		const runs = await em.find(PipelineRun, {}, { populate: ['city'] });
		expect(runs.map(r => [r.city.name, r.step])).toEqual([['Berlin', PipelineStepEnum.SCRAPE_CREATORS]]);
	});
});
