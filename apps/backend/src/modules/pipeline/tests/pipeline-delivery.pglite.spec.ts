import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';

import { CityService } from 'src/modules/cities/services/city.service.js';
import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { ProspectQueryService } from 'src/modules/outreach/services/prospect-query.service.js';
import { MentionMatchingService } from 'src/modules/social/services/mention-matching.service.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { BrandCompetitor } from 'src/modules/venues/entities/brand-competitor.entity.js';
import { BrandService } from 'src/modules/venues/services/brand.service.js';
import { CompetitorService } from 'src/modules/venues/services/competitor.service.js';
import { VenueDeliveryService } from 'src/modules/venues/services/venue-delivery.service.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { PipelineStepEnum } from '../constants/pipeline.constant.js';
import { PipelineRun, PipelineRunStatusEnum } from '../entities/pipeline-run.entity.js';
import { PipelineService } from '../services/pipeline.service.js';

describe('PipelineService SCRAPE_DELIVERY (pglite)', () => {
	let harness: PgliteTestingModule;
	const topBrandIds = jest.fn<(month: string, top: number, cityId: string) => Promise<string[]>>();
	const scrape = jest.fn<(venues: Venue[], city: unknown, month: string, budgetUsd: number) => Promise<unknown>>();

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				BrandService,
				CityService,
				PipelineService,
				ProspectQueryService,
				CompetitorService,
				{ provide: MentionMatchingService, useValue: { topBrandIds } },
				{ provide: VenueDeliveryService, useValue: { scrape } },
			],
		});
		entityManagerManager.setEntityManager(harness.orm.em);
	});

	afterAll(async () => {
		await harness.stop();
	});

	it("scrapes the report brands' branches and their competitors for the month, on the $7 default", async () => {
		const em = harness.orm.em;
		const city = testCity(em);
		const ranked = em.create(Venue, { city, placeId: 'ranked', name: 'Ranked' });
		const rival = em.create(Venue, { city, placeId: 'rival', name: 'Rival' });
		em.create(Venue, { city, placeId: 'nobody', name: 'Nobody' });
		// Saved first: each venue gets its brand
		await em.flush();
		em.create(BrandCompetitor, { brand: ranked.brand, venue: rival });
		const run = em.create(PipelineRun, {
			city,
			step: PipelineStepEnum.SCRAPE_DELIVERY,
			month: '2026-09',
			params: {},
			status: PipelineRunStatusEnum.QUEUED,
		});
		await em.flush();
		topBrandIds.mockResolvedValue([ranked.brand.id]);
		scrape.mockResolvedValue({ venues: 2 });

		await harness.moduleRef.get(PipelineService).execute(run.id);

		const [venues, , month, budgetUsd] = scrape.mock.calls[0];
		expect(venues.map(v => v.name).sort()).toEqual(['Ranked', 'Rival']);
		expect([month, budgetUsd]).toEqual(['2026-09', 7]);
	});
});
