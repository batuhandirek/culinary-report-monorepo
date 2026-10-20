import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';

import { CityService } from 'src/modules/cities/services/city.service.js';
import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { ProspectStageEnum } from 'src/modules/outreach/constants/outreach.constant.js';
import { Prospect } from 'src/modules/outreach/entities/prospect.entity.js';
import { ProspectQueryService } from 'src/modules/outreach/services/prospect-query.service.js';
import { SearchInterestService } from 'src/modules/trends/services/search-interest.service.js';
import type { Brand } from 'src/modules/venues/entities/brand.entity.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { BrandService } from 'src/modules/venues/services/brand.service.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { PipelineStepEnum } from '../constants/pipeline.constant.js';
import { PipelineRun, PipelineRunStatusEnum } from '../entities/pipeline-run.entity.js';
import { PipelineService } from '../services/pipeline.service.js';

describe('PipelineService SEARCH_INTEREST (pglite)', () => {
	let harness: PgliteTestingModule;
	let service: PipelineService;
	const pull = jest.fn(async (..._args: unknown[]) => ({ terms: 3, withData: 2 }));

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				BrandService,
				CityService,
				PipelineService,
				ProspectQueryService,
				{ provide: SearchInterestService, useValue: { pull } },
			],
		});
		service = harness.moduleRef.get(PipelineService);
		entityManagerManager.setEntityManager(harness.orm.em);
	});

	afterAll(async () => {
		await harness.stop();
	});

	it("pulls the won brands with a branch in the city on the $2 default", async () => {
		const em = harness.orm.em;
		const city = testCity(em);
		const other = testCity(em);
		const won = em.create(Venue, { city, placeId: 'si-won', name: 'Won' });
		const elsewhere = em.create(Venue, { city: other, placeId: 'si-elsewhere', name: 'Elsewhere' });
		const lost = em.create(Venue, { city, placeId: 'si-lost', name: 'Lost' });
		// Saved first: each venue gets its brand
		await em.flush();
		em.create(Prospect, { brand: won.brand, stage: ProspectStageEnum.WON });
		em.create(Prospect, { brand: elsewhere.brand, stage: ProspectStageEnum.WON });
		em.create(Prospect, { brand: lost.brand, stage: ProspectStageEnum.LOST });
		const run = em.create(PipelineRun, {
			city,
			step: PipelineStepEnum.SEARCH_INTEREST,
			month: '2026-09',
			params: {},
			status: PipelineRunStatusEnum.QUEUED,
		});
		await em.flush();

		await service.execute(run.id);

		const [cityId, month, opts] = pull.mock.calls[0] as [string, string, { brands: Brand[]; budgetUsd: number }];
		expect([cityId, month]).toEqual([city.id, '2026-09']);
		expect(opts.brands.map(b => b.name)).toEqual(['Won']);
		expect(opts.budgetUsd).toBe(2);
		em.clear();
		expect((await em.findOneOrFail(PipelineRun, { id: run.id })).status).toBe(
			PipelineRunStatusEnum.SUCCEEDED,
		);
	});
});
