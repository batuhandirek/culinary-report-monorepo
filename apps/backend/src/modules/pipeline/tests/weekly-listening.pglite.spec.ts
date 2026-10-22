import { afterAll, afterEach, beforeAll, describe, expect, it, jest } from '@jest/globals';

import { ApifyService } from 'src/modules/apify/services/apify.service.js';
import { City } from 'src/modules/cities/entities/city.entity.js';
import { CitySourceKindEnum } from 'src/modules/cities/entities/city-source.entity.js';
import { CityService } from 'src/modules/cities/services/city.service.js';
import { cityFactory, testCitySource } from 'src/modules/cities/tests/factories/city.factory.js';
import { DataCoverageService } from 'src/modules/overview/services/data-coverage.service.js';
import { PgBossService } from 'src/modules/pgboss/pgboss.service.js';
import { SocialScrapeService } from 'src/modules/social/services/social-scrape.service.js';
import { BrandService } from 'src/modules/venues/services/brand.service.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { PipelineStepEnum } from '../constants/pipeline.constant.js';
import { WeeklyListeningCron } from '../crons/weekly-listening.cron.js';
import { PipelineRun, PipelineRunStatusEnum } from '../entities/pipeline-run.entity.js';
import { PipelineService } from '../services/pipeline.service.js';
import { WEEKLY_LISTENING_DAYS } from '../util/monthly-schedule.js';

const DAY_MS = 24 * 3600 * 1000;

describe('Weekly listening (pglite)', () => {
	let harness: PgliteTestingModule;
	const sendJob = jest.fn(async () => 'job-id');
	const runActor = jest.fn(
		async (_actor: string, _input: any, _opts: { maxCostUsd: number }): Promise<any[]> => [],
	);

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				BrandService,
				WeeklyListeningCron,
				PipelineService,
				CityService,
				SocialScrapeService,
				DataCoverageService,
				{ provide: PgBossService, useValue: { sendJob } },
				{ provide: ApifyService, useValue: { runActor } },
			],
		});
		entityManagerManager.setEntityManager(harness.orm.em);
	});

	afterAll(async () => {
		await harness.stop();
	});

	afterEach(() => {
		runActor.mockClear();
	});

	const runStep = async (cityName: string, step: PipelineStepEnum) => {
		const em = harness.orm.em;
		const city = await em.findOneOrFail(City, { name: cityName });
		const run = em.create(PipelineRun, {
			city,
			step,
			month: '2026-10',
			params: {},
			status: PipelineRunStatusEnum.QUEUED,
		});
		await em.flush();
		await harness.moduleRef.get(PipelineService).execute(run.id);
		em.clear();
		return em.findOneOrFail(PipelineRun, { id: run.id });
	};

	it('queues the TikTok and reels runs, then extraction and matching, per cron city with sources', async () => {
		const em = harness.orm.em;
		const berlin = cityFactory.build({ name: 'Berlin', cronEnabled: true, instagramEnabled: true });
		// Twenty hashtags and two searches: the budget split below
		for (let i = 0; i < 20; i++)
			testCitySource(em, berlin, CitySourceKindEnum.TIKTOK_HASHTAG, `berlinfood${i}`);
		testCitySource(em, berlin, CitySourceKindEnum.TIKTOK_SEARCH, 'berlin ramen');
		testCitySource(em, berlin, CitySourceKindEnum.TIKTOK_SEARCH, 'kreuzberg food');
		testCitySource(em, berlin, CitySourceKindEnum.INSTAGRAM_HASHTAG, 'berlinbrunch');
		const wien = cityFactory.build({ name: 'Wien', cronEnabled: true, instagramEnabled: false });
		testCitySource(em, wien, CitySourceKindEnum.TIKTOK_SEARCH, 'wien schnitzel');
		// TikTok sources all off and no Instagram: nothing to listen to
		const quiet = cityFactory.build({ name: 'Quiet', cronEnabled: true, instagramEnabled: false });
		testCitySource(em, quiet, CitySourceKindEnum.TIKTOK_HASHTAG, 'quietfood', false);
		const byHand = cityFactory.build({ name: 'By hand', cronEnabled: false, instagramEnabled: true });
		testCitySource(em, byHand, CitySourceKindEnum.TIKTOK_SEARCH, 'by hand');
		await em.flush();

		await harness.moduleRef.get(WeeklyListeningCron).queueAll(new Date('2026-11-01T03:00:00Z'));

		em.clear();
		// Oldest first: the order the queue works them in
		const runs = await em.find(PipelineRun, {}, { populate: ['city'], orderBy: { createdAt: 'asc' } });
		expect(runs.map(r => [r.city.name, r.step, r.month, r.status])).toEqual([
			['Berlin', PipelineStepEnum.SCRAPE_TIKTOK_RECENT, '2026-11', PipelineRunStatusEnum.QUEUED],
			['Berlin', PipelineStepEnum.SCRAPE_INSTAGRAM_REELS, '2026-11', PipelineRunStatusEnum.QUEUED],
			['Berlin', PipelineStepEnum.EXTRACT_MENTIONS, '2026-11', PipelineRunStatusEnum.QUEUED],
			['Berlin', PipelineStepEnum.MATCH_MENTIONS, '2026-11', PipelineRunStatusEnum.QUEUED],
			['Wien', PipelineStepEnum.SCRAPE_TIKTOK_RECENT, '2026-11', PipelineRunStatusEnum.QUEUED],
			['Wien', PipelineStepEnum.EXTRACT_MENTIONS, '2026-11', PipelineRunStatusEnum.QUEUED],
			['Wien', PipelineStepEnum.MATCH_MENTIONS, '2026-11', PipelineRunStatusEnum.QUEUED],
		]);
		expect(sendJob).toHaveBeenCalledTimes(7);
		await em.nativeDelete(PipelineRun, {});
	});

	it("searches the last week and pages each hashtag to fit the weekly $6, whatever the run's month", async () => {
		const done = await runStep('Berlin', PipelineStepEnum.SCRAPE_TIKTOK_RECENT);

		expect(done.status).toBe(PipelineRunStatusEnum.SUCCEEDED);
		const [hashtags, search] = runActor.mock.calls;
		// The search gets its actor's $4 floor; $2 over twenty hashtags at $0.0037 an item is 27 a tag
		expect(hashtags[0]).toBe('clockworks/tiktok-scraper');
		expect(hashtags[1]).toMatchObject({ resultsPerPage: 27 });
		expect(hashtags[1].hashtags).toHaveLength(20);
		expect(hashtags[2].maxCostUsd).toBe(2);
		expect(search[0]).toBe('novi/advanced-search-tiktok-api');
		expect(search[1]).toMatchObject({
			keywords: expect.arrayContaining(['berlin ramen', 'kreuzberg food']),
			limit: 30,
			region: 'DE',
			publishTime: 'WEEK',
		});
		expect(search[2].maxCostUsd).toBe(4);
		expect(done.result).toEqual({ '1. SCRAPE_TIKTOK_RECENT': { found: 0, saved: 0 } });
	});

	it('keeps the month-end pass smaller: three months of searches, a shorter page per hashtag', async () => {
		await runStep('Berlin', PipelineStepEnum.SCRAPE_TIKTOK);

		const [hashtags, search] = runActor.mock.calls;
		// $7: the search's $4 floor, $3 over twenty hashtags is 40 a tag
		expect(hashtags[1]).toMatchObject({ resultsPerPage: 40 });
		expect(hashtags[2].maxCostUsd).toBe(3);
		expect(search[1]).toMatchObject({ limit: 50, publishTime: 'THREE_MONTH' });
		expect(search[2].maxCostUsd).toBe(4);
	});

	it("scrapes each Instagram hashtag's top reels of the last eight days on $1", async () => {
		const before = Date.now();
		await runStep('Berlin', PipelineStepEnum.SCRAPE_INSTAGRAM_REELS);

		expect(runActor).toHaveBeenCalledTimes(1);
		const [actor, input, opts] = runActor.mock.calls[0];
		expect(actor).toBe('apify/instagram-scraper');
		expect(input).toMatchObject({
			directUrls: ['https://www.instagram.com/explore/tags/berlinbrunch/'],
			resultsType: 'reels',
			resultsLimit: 30,
			onlyPostsNewerThan: new Date(before - WEEKLY_LISTENING_DAYS * DAY_MS).toISOString().slice(0, 10),
		});
		expect(opts.maxCostUsd).toBe(1);
	});

	it("shows the weekly steps' latest runs on the Data page", async () => {
		const em = harness.orm.em;
		const berlin = await em.findOneOrFail(City, { name: 'Berlin' });
		const coverage = await harness.moduleRef.get(DataCoverageService).coverage(berlin.id, 1);
		const recurring = new Map(coverage.recurring.map(r => [r.step, r]));
		expect(recurring.get(PipelineStepEnum.SCRAPE_TIKTOK_RECENT)).toMatchObject({ state: 'succeeded', paid: true });
		expect(recurring.get(PipelineStepEnum.SCRAPE_INSTAGRAM_REELS)).toMatchObject({ state: 'succeeded', paid: true });
		// Neither is a step of the monthly grid
		expect(coverage.months[0].steps.map(s => s.step)).not.toContain(PipelineStepEnum.SCRAPE_TIKTOK_RECENT);
	});
});
