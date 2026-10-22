import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';

import { CityService } from 'src/modules/cities/services/city.service.js';
import { cityFactory } from 'src/modules/cities/tests/factories/city.factory.js';
import { PgBossService } from 'src/modules/pgboss/pgboss.service.js';
import { BrandService } from 'src/modules/venues/services/brand.service.js';
import { previousMonth } from 'src/modules/venues/util/month.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { PipelineStepEnum } from '../constants/pipeline.constant.js';
import { MonthlyPipelineCron } from '../crons/monthly-pipeline.cron.js';
import { PipelineRun, PipelineRunStatusEnum } from '../entities/pipeline-run.entity.js';
import { PipelineService } from '../services/pipeline.service.js';
import { cityVenueScrapeDue } from '../util/monthly-schedule.js';

describe('MonthlyPipelineCron (pglite)', () => {
	let harness: PgliteTestingModule;
	const sendJob = jest.fn(async () => 'job-id');

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				BrandService,
				MonthlyPipelineCron,
				PipelineService,
				CityService,
				{ provide: PgBossService, useValue: { sendJob } },
			],
		});
		entityManagerManager.setEntityManager(harness.orm.em);
	});

	afterAll(async () => {
		await harness.stop();
	});

	it('queues one monthly run per active city with the cron on', async () => {
		const now = new Date();
		const recently = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
		const berlin = cityFactory.build({
			name: 'Berlin',
			cronEnabled: true,
			venuesScrapedAt: recently,
		});
		const wien = cityFactory.build({
			name: 'Wien',
			cronEnabled: true,
			venuesScrapedAt: recently,
		});
		cityFactory.build({ name: 'Paused', cronEnabled: true, active: false });
		cityFactory.build({ name: 'By hand', cronEnabled: false });
		await harness.orm.em.flush();

		await harness.moduleRef.get(MonthlyPipelineCron).queueRuns(now);

		harness.orm.em.clear();
		const runs = await harness.orm.em.find(
			PipelineRun,
			{},
			{ populate: ['city'], orderBy: { createdAt: 'asc' } },
		);
		expect(runs.map(r => [r.city.name, r.step, r.month, r.status]).sort()).toEqual(
			[berlin, wien]
				.map(c => [
					c.name,
					PipelineStepEnum.MONTHLY,
					previousMonth(),
					PipelineRunStatusEnum.QUEUED,
				])
				.sort(),
		);
		expect(sendJob).toHaveBeenCalledTimes(2);
	});

	it("queues the city's Places list and brand search first when a quarter has passed or it never had one", async () => {
		const em = harness.orm.em;
		await em.nativeDelete(PipelineRun, {});
		const fresh = await cityFactory.create({ name: 'Fresh', cronEnabled: true });
		// The other cities from the test above were scraped a month ago: not due
		await harness.moduleRef.get(MonthlyPipelineCron).handleCron();

		em.clear();
		// Queued in this order; the queue runs one at a time
		const runs = await em.find(PipelineRun, { city: fresh.id }, { orderBy: { createdAt: 'asc' } });
		expect(runs.map(r => r.step)).toEqual([
			PipelineStepEnum.SCRAPE_VENUES,
			PipelineStepEnum.SEARCH_BRANCHES,
			PipelineStepEnum.MONTHLY,
		]);
		expect(await em.count(PipelineRun, { step: PipelineStepEnum.SCRAPE_VENUES })).toBe(1);
		expect(await em.count(PipelineRun, { step: PipelineStepEnum.SEARCH_BRANCHES })).toBe(1);
	});

	it('checks a city with an OSM boundary against OpenStreetMap every month, after a Places list', async () => {
		const em = harness.orm.em;
		await em.nativeDelete(PipelineRun, {});
		const now = new Date();
		const due = await cityFactory.create({ name: 'Mapped', cronEnabled: true, osmRelationId: 62422 });
		const scraped = await cityFactory.create({
			name: 'Mapped too',
			cronEnabled: true,
			osmRelationId: 62423,
			venuesScrapedAt: new Date(now.getTime() - 30 * 24 * 3600 * 1000),
		});
		await harness.moduleRef.get(MonthlyPipelineCron).queueRuns(now);

		em.clear();
		const steps = async (cityId: string) =>
			(await em.find(PipelineRun, { city: cityId }, { orderBy: { createdAt: 'asc' } })).map(r => r.step);
		expect(await steps(due.id)).toEqual([
			PipelineStepEnum.SCRAPE_VENUES,
			PipelineStepEnum.SEARCH_BRANCHES,
			PipelineStepEnum.SYNC_OSM_PLACES,
			PipelineStepEnum.LOOKUP_OSM_PLACES,
			PipelineStepEnum.MONTHLY,
		]);
		// Not a quarter since its Places list: OSM still runs
		expect(await steps(scraped.id)).toEqual([
			PipelineStepEnum.SYNC_OSM_PLACES,
			PipelineStepEnum.LOOKUP_OSM_PLACES,
			PipelineStepEnum.MONTHLY,
		]);
		// The cities above have no boundary
		expect(await em.count(PipelineRun, { step: PipelineStepEnum.SYNC_OSM_PLACES })).toBe(2);
	});
});

describe('cityVenueScrapeDue', () => {
	const now = new Date('2027-01-02T06:00:00Z');

	it('is due for a city never scraped, and a quarter after the last scrape', () => {
		expect(cityVenueScrapeDue(null, now)).toBe(true);
		// Scraped on the last quarter's run, half an hour after this time of day
		expect(cityVenueScrapeDue(new Date('2026-10-02T06:30:00Z'), now)).toBe(true);
		expect(cityVenueScrapeDue(new Date('2026-11-02T06:30:00Z'), now)).toBe(false);
	});
});
