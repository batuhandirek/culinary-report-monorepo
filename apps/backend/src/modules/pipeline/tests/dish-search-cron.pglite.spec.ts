import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';

import { CityService } from 'src/modules/cities/services/city.service.js';
import { cityFactory } from 'src/modules/cities/tests/factories/city.factory.js';
import { PgBossService } from 'src/modules/pgboss/pgboss.service.js';
import { BrandService } from 'src/modules/venues/services/brand.service.js';
import { DishSearchService } from 'src/modules/venues/services/dish-search.service.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { PipelineStepEnum } from '../constants/pipeline.constant.js';
import { DishSearchCron } from '../crons/dish-search.cron.js';
import { PipelineRun, PipelineRunStatusEnum } from '../entities/pipeline-run.entity.js';
import { PipelineService } from '../services/pipeline.service.js';

describe('DishSearchCron (pglite)', () => {
	let harness: PgliteTestingModule;
	const sendJob = jest.fn(async () => 'job-id');
	const newestSnapshots = jest.fn<(cityIds: string[]) => Promise<Map<string, string>>>();

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				BrandService,
				DishSearchCron,
				PipelineService,
				CityService,
				{ provide: PgBossService, useValue: { sendJob } },
				{ provide: DishSearchService, useValue: { newestSnapshots } },
			],
		});
		entityManagerManager.setEntityManager(harness.orm.em);
	});

	afterAll(async () => {
		await harness.stop();
	});

	it('queues a snapshot for each cron city with districts whose newest is its interval old', async () => {
		const em = harness.orm.em;
		const never = cityFactory.build({ name: 'Never', cronEnabled: true });
		const fresh = cityFactory.build({ name: 'Fresh', cronEnabled: true });
		const stale = cityFactory.build({ name: 'Stale', cronEnabled: true });
		const weekly = cityFactory.build({
			name: 'Weekly',
			cronEnabled: true,
			dishSearchEveryDays: 7,
		});
		const off = cityFactory.build({ name: 'Off', cronEnabled: true, dishSearchEveryDays: 0 });
		const noDistricts = cityFactory.build({
			name: 'No districts',
			cronEnabled: true,
			districts: [],
		});
		const waiting = cityFactory.build({ name: 'Waiting', cronEnabled: true });
		const byHand = cityFactory.build({ name: 'By hand', cronEnabled: false });
		await em.flush();
		// A snapshot run already in the queue (the monthly run can hold it for hours)
		em.create(PipelineRun, {
			city: waiting,
			step: PipelineStepEnum.TRACK_DISH_SEARCHES,
			month: '2026-10',
			params: {},
			status: PipelineRunStatusEnum.QUEUED,
		});
		await em.flush();
		newestSnapshots.mockResolvedValue(
			new Map([
				[fresh.id, '2026-10-21'],
				[stale.id, '2026-09-25'],
				[weekly.id, '2026-10-18'],
			]),
		);

		// 05:15 UTC is 06:15 in Berlin on the 26th
		const now = new Date('2026-10-26T05:15:00Z');
		const cron = harness.moduleRef.get(DishSearchCron);
		const queued = await cron.queueDue(now);
		expect(new Set(queued)).toEqual(new Set([never.id, stale.id, weekly.id]));
		// Asked about the cron cities with districts only
		expect(new Set(newestSnapshots.mock.calls[0][0])).toEqual(
			new Set([never.id, fresh.id, stale.id, weekly.id, off.id, waiting.id]),
		);
		expect(newestSnapshots.mock.calls[0][0]).not.toContain(noDistricts.id);
		expect(newestSnapshots.mock.calls[0][0]).not.toContain(byHand.id);

		em.clear();
		const runs = await em.find(
			PipelineRun,
			{ step: PipelineStepEnum.TRACK_DISH_SEARCHES, city: { $in: queued } },
			{ populate: ['city'] },
		);
		// The run's month is a label: the month of the city's day
		expect(runs.map(r => [r.city.name, r.month, r.status]).sort()).toEqual([
			['Never', '2026-10', PipelineRunStatusEnum.QUEUED],
			['Stale', '2026-10', PipelineRunStatusEnum.QUEUED],
			['Weekly', '2026-10', PipelineRunStatusEnum.QUEUED],
		]);

		// The next morning, with those runs still waiting: nothing queued twice
		expect(await cron.queueDue(new Date('2026-10-27T05:15:00Z'))).toEqual([]);
	});
});
