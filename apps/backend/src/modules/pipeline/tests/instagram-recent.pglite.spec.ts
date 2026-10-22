import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';

import { CityService } from 'src/modules/cities/services/city.service.js';
import { cityFactory } from 'src/modules/cities/tests/factories/city.factory.js';
import { PgBossService } from 'src/modules/pgboss/pgboss.service.js';
import { SocialScrapeService } from 'src/modules/social/services/social-scrape.service.js';
import { BrandService } from 'src/modules/venues/services/brand.service.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { PipelineStepEnum } from '../constants/pipeline.constant.js';
import { InstagramRecentCron } from '../crons/instagram-recent.cron.js';
import { PipelineRun, PipelineRunStatusEnum } from '../entities/pipeline-run.entity.js';
import { PipelineService } from '../services/pipeline.service.js';
import { INSTAGRAM_RECENT_DAYS } from '../util/monthly-schedule.js';

describe('Daily Instagram scrape (pglite)', () => {
	let harness: PgliteTestingModule;
	const sendJob = jest.fn(async () => 'job-id');
	const scrapeCityInstagram = jest.fn(async (_opts: Record<string, unknown>) => ({
		found: 412,
		saved: 380,
	}));

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				BrandService,
				InstagramRecentCron,
				PipelineService,
				CityService,
				{ provide: PgBossService, useValue: { sendJob } },
				{ provide: SocialScrapeService, useValue: { scrapeCityInstagram } },
			],
		});
		entityManagerManager.setEntityManager(harness.orm.em);
	});

	afterAll(async () => {
		await harness.stop();
	});

	it('queues the scrape, then extraction and matching, per city with the cron and Instagram on, labelled with the month', async () => {
		cityFactory.build({ name: 'Berlin', cronEnabled: true, instagramEnabled: true });
		cityFactory.build({ name: 'No Instagram', cronEnabled: true, instagramEnabled: false });
		cityFactory.build({ name: 'By hand', cronEnabled: false, instagramEnabled: true });
		await harness.orm.em.flush();

		await harness.moduleRef.get(InstagramRecentCron).queueAll(new Date('2026-11-01T04:00:00Z'));

		harness.orm.em.clear();
		// Oldest first: the order the queue works them in
		const runs = await harness.orm.em.find(PipelineRun, {}, { populate: ['city'], orderBy: { createdAt: 'asc' } });
		expect(runs.map(r => [r.city.name, r.step, r.month, r.status])).toEqual([
			['Berlin', PipelineStepEnum.SCRAPE_INSTAGRAM_RECENT, '2026-11', PipelineRunStatusEnum.QUEUED],
			['Berlin', PipelineStepEnum.EXTRACT_MENTIONS, '2026-11', PipelineRunStatusEnum.QUEUED],
			['Berlin', PipelineStepEnum.MATCH_MENTIONS, '2026-11', PipelineRunStatusEnum.QUEUED],
		]);
		expect(sendJob).toHaveBeenCalledTimes(3);
	});

	it('scrapes the posts feed only, two days back whatever the month, on the $2 default', async () => {
		const em = harness.orm.em;
		const city = cityFactory.build({ name: 'Scraped' });
		const run = em.create(PipelineRun, {
			city,
			step: PipelineStepEnum.SCRAPE_INSTAGRAM_RECENT,
			month: '2026-09',
			params: {},
			status: PipelineRunStatusEnum.QUEUED,
		});
		await em.flush();
		const before = Date.now();

		await harness.moduleRef.get(PipelineService).execute(run.id);

		const opts = scrapeCityInstagram.mock.calls[0][0];
		expect(opts).toMatchObject({ perSource: 100, budgetUsd: 2, kinds: ['posts'] });
		const since = Date.parse(opts.since as string);
		expect(before - since).toBeGreaterThanOrEqual(
			INSTAGRAM_RECENT_DAYS * 24 * 3600 * 1000 - 1000,
		);
		expect(before - since).toBeLessThan(INSTAGRAM_RECENT_DAYS * 24 * 3600 * 1000 + 60_000);
		em.clear();
		const done = await em.findOneOrFail(PipelineRun, { id: run.id });
		expect(done.status).toBe(PipelineRunStatusEnum.SUCCEEDED);
		expect(done.result).toEqual({ '1. SCRAPE_INSTAGRAM_RECENT': { found: 412, saved: 380 } });
	});
});
