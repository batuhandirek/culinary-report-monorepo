import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';

import { CityService } from 'src/modules/cities/services/city.service.js';
import { cityFactory } from 'src/modules/cities/tests/factories/city.factory.js';
import { ProspectQueryService } from 'src/modules/outreach/services/prospect-query.service.js';
import { ReportService } from 'src/modules/reports/services/report.service.js';
import { MentionMatchingService } from 'src/modules/social/services/mention-matching.service.js';
import { BrandReportScopeEnum } from 'src/modules/venues/entities/brand.entity.js';
import { BrandService } from 'src/modules/venues/services/brand.service.js';
import { BrandLeadScoreService } from 'src/modules/venues/services/brand-lead-score.service.js';
import { brandFactory } from 'src/modules/venues/tests/factories/brand.factory.js';
import { venueFactory } from 'src/modules/venues/tests/factories/venue.factory.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { PipelineStepEnum } from '../constants/pipeline.constant.js';
import { PipelineRun, PipelineRunStatusEnum } from '../entities/pipeline-run.entity.js';
import { PipelineService } from '../services/pipeline.service.js';

const MONTH = '2026-09';

describe('BUILD_REPORTS for a brand reported across its cities (pglite)', () => {
	let harness: PgliteTestingModule;
	let service: PipelineService;
	const topBrandIds = jest.fn<(month: string, top: number, cityId: string) => Promise<string[]>>();
	const build = jest.fn(async () => ({}));

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				PipelineService,
				ProspectQueryService,
				BrandLeadScoreService,
				BrandService,
				CityService,
				{ provide: MentionMatchingService, useValue: { topBrandIds } },
				{ provide: ReportService, useValue: { build } },
			],
		});
		service = harness.moduleRef.get(PipelineService);
		entityManagerManager.setEntityManager(harness.orm.em);
	});

	afterAll(async () => {
		await harness.stop();
	});

	const runReports = async (cityId: string) => {
		const em = harness.orm.em;
		const run = em.create(PipelineRun, {
			city: cityId,
			step: PipelineStepEnum.BUILD_REPORTS,
			month: MONTH,
			params: {},
			status: PipelineRunStatusEnum.QUEUED,
		});
		await em.flush();
		await service.execute(run.id);
		return em.findOneOrFail(PipelineRun, { id: run.id });
	};

	it("waits for every city's run, then builds one report across them; a city-scoped brand gets one per city", async () => {
		const em = harness.orm.em;
		const berlin = await cityFactory.create({ name: 'Berlin', cronEnabled: true, active: true });
		const hamburg = await cityFactory.create({ name: 'Hamburg', cronEnabled: true, active: true });
		const chain = await brandFactory.create({ name: 'Burgermeister', reportScope: BrandReportScopeEnum.ALL });
		const perCity = await brandFactory.create({ name: 'Peter Pane' });
		for (const city of [berlin, hamburg])
			for (const brand of [chain, perCity])
				venueFactory.build({ name: brand.name }, { associations: { city, brand } });
		await em.flush();
		topBrandIds.mockResolvedValue([chain.id, perCity.id]);

		// Berlin first: Hamburg has not run, so the chain waits
		let run = await runReports(berlin.id);
		expect(run.status).toBe(PipelineRunStatusEnum.SUCCEEDED);
		expect(run.result).toMatchObject({ '1. BUILD_REPORTS': { built: 1, acrossCities: 0, waiting: 1 } });
		expect(build.mock.calls).toEqual([[perCity.id, berlin.id, MONTH, { peerBrandIds: [chain.id, perCity.id] }]]);

		// Hamburg last: Berlin's run succeeded, so Hamburg builds the chain's report across both
		build.mockClear();
		run = await runReports(hamburg.id);
		expect(run.result).toMatchObject({ '1. BUILD_REPORTS': { built: 1, acrossCities: 1, waiting: 0 } });
		expect(build.mock.calls).toEqual([
			[chain.id, null, MONTH],
			[perCity.id, hamburg.id, MONTH, { peerBrandIds: [chain.id, perCity.id] }],
		]);
	});
});
