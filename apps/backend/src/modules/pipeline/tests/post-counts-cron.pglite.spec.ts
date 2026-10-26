import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';

import { CityService } from 'src/modules/cities/services/city.service.js';
import { cityFactory } from 'src/modules/cities/tests/factories/city.factory.js';
import { PgBossService } from 'src/modules/pgboss/pgboss.service.js';
import { PostCountsService } from 'src/modules/social/services/post-counts.service.js';
import { BrandService } from 'src/modules/venues/services/brand.service.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { PipelineStepEnum } from '../constants/pipeline.constant.js';
import { PostCountsCron } from '../crons/post-counts.cron.js';
import { PipelineRun, PipelineRunStatusEnum } from '../entities/pipeline-run.entity.js';
import { PipelineService } from '../services/pipeline.service.js';

describe('Daily post counts (pglite)', () => {
	let harness: PgliteTestingModule;
	const sendJob = jest.fn(async () => 'job-id');
	const refresh = jest.fn(async (_city: unknown, _budgetUsd: number) => ({
		due: 120,
		tiktok: 90,
		instagram: 30,
		read: 117,
		gone: 2,
		notReturned: 1,
		waiting: 0,
	}));

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				BrandService,
				PostCountsCron,
				PipelineService,
				CityService,
				{ provide: PgBossService, useValue: { sendJob } },
				{ provide: PostCountsService, useValue: { refresh } },
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

		await harness.moduleRef.get(PostCountsCron).queueAll(new Date('2026-11-02T05:30:00Z'));

		harness.orm.em.clear();
		const runs = await harness.orm.em.find(PipelineRun, {}, { populate: ['city'] });
		expect(runs.map(r => [r.city.name, r.step, r.month, r.status])).toEqual([
			['Berlin', PipelineStepEnum.REFRESH_POST_COUNTS, '2026-11', PipelineRunStatusEnum.QUEUED],
		]);
		expect(sendJob).toHaveBeenCalledTimes(1);
	});

	it('reads the due posts of the city on the $2 default and records what it did', async () => {
		const em = harness.orm.em;
		const city = cityFactory.build({ name: 'Refreshed' });
		const run = em.create(PipelineRun, {
			city,
			step: PipelineStepEnum.REFRESH_POST_COUNTS,
			month: '2026-10',
			params: {},
			status: PipelineRunStatusEnum.QUEUED,
		});
		await em.flush();

		await harness.moduleRef.get(PipelineService).execute(run.id);

		expect(refresh).toHaveBeenCalledTimes(1);
		expect((refresh.mock.calls[0][0] as { id: string }).id).toBe(city.id);
		expect(refresh.mock.calls[0][1]).toBe(2);
		em.clear();
		const done = await em.findOneOrFail(PipelineRun, { id: run.id });
		expect(done.status).toBe(PipelineRunStatusEnum.SUCCEEDED);
		expect(done.result).toEqual({ '1. REFRESH_POST_COUNTS': await refresh.mock.results[0].value });
	});
});
