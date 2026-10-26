import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';

import { CityService } from 'src/modules/cities/services/city.service.js';
import { cityFactory } from 'src/modules/cities/tests/factories/city.factory.js';
import { PgBossService } from 'src/modules/pgboss/pgboss.service.js';
import { AccountScrapeService } from 'src/modules/social/services/account-scrape.service.js';
import { BrandService } from 'src/modules/venues/services/brand.service.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { PipelineStepEnum } from '../constants/pipeline.constant.js';
import { AccountFollowersCron } from '../crons/account-followers.cron.js';
import { PipelineRun, PipelineRunStatusEnum } from '../entities/pipeline-run.entity.js';
import { PipelineService } from '../services/pipeline.service.js';

describe('Daily follower fill (pglite)', () => {
	let harness: PgliteTestingModule;
	const sendJob = jest.fn(async () => 'job-id');
	const refresh = jest.fn(async (_city: unknown, _budgetUsd: number) => ({
		missing: 40,
		asked: 40,
		filled: 37,
		profiles: 37,
	}));

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				BrandService,
				AccountFollowersCron,
				PipelineService,
				CityService,
				{ provide: PgBossService, useValue: { sendJob } },
				{ provide: AccountScrapeService, useValue: { fillFollowers: refresh } },
			],
		});
		entityManagerManager.setEntityManager(harness.orm.em);
	});

	afterAll(async () => {
		await harness.stop();
	});

	it('queues one run per city with the cron on, labelled with the month', async () => {
		cityFactory.build({ name: 'Berlin', cronEnabled: true, instagramEnabled: false });
		cityFactory.build({ name: 'By hand', cronEnabled: false });
		await harness.orm.em.flush();

		await harness.moduleRef.get(AccountFollowersCron).queueAll(new Date('2026-11-02T05:45:00Z'));

		harness.orm.em.clear();
		const runs = await harness.orm.em.find(PipelineRun, {}, { populate: ['city'] });
		expect(runs.map(r => [r.city.name, r.step, r.month, r.status])).toEqual([
			['Berlin', PipelineStepEnum.FILL_ACCOUNT_FOLLOWERS, '2026-11', PipelineRunStatusEnum.QUEUED],
		]);
		expect(sendJob).toHaveBeenCalledTimes(1);
	});

	it("fills the city's brand accounts on the $1 default and records what it did", async () => {
		const em = harness.orm.em;
		const city = cityFactory.build({ name: 'Refreshed' });
		const run = em.create(PipelineRun, {
			city,
			step: PipelineStepEnum.FILL_ACCOUNT_FOLLOWERS,
			month: '2026-10',
			params: {},
			status: PipelineRunStatusEnum.QUEUED,
		});
		await em.flush();

		await harness.moduleRef.get(PipelineService).execute(run.id);

		expect(refresh).toHaveBeenCalledTimes(1);
		expect((refresh.mock.calls[0][0] as { id: string }).id).toBe(city.id);
		expect(refresh.mock.calls[0][1]).toBe(1);
		em.clear();
		const done = await em.findOneOrFail(PipelineRun, { id: run.id });
		expect(done.status).toBe(PipelineRunStatusEnum.SUCCEEDED);
		expect(done.result).toEqual({ '1. FILL_ACCOUNT_FOLLOWERS': await refresh.mock.results[0].value });
	});
});
