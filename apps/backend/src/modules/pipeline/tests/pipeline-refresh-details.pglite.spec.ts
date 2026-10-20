import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';

import { CityService } from 'src/modules/cities/services/city.service.js';
import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { ProspectStageEnum } from 'src/modules/outreach/constants/outreach.constant.js';
import { Prospect } from 'src/modules/outreach/entities/prospect.entity.js';
import { ProspectQueryService } from 'src/modules/outreach/services/prospect-query.service.js';
import { MentionMatchingService } from 'src/modules/social/services/mention-matching.service.js';
import { Brand } from 'src/modules/venues/entities/brand.entity.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { BrandCompetitor } from 'src/modules/venues/entities/brand-competitor.entity.js';
import { BrandService } from 'src/modules/venues/services/brand.service.js';
import { CompetitorService } from 'src/modules/venues/services/competitor.service.js';
import { BrandLeadScoreService } from 'src/modules/venues/services/brand-lead-score.service.js';
import { VenueScrapeService } from 'src/modules/venues/services/venue-scrape.service.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { PipelineStepEnum } from '../constants/pipeline.constant.js';
import { PipelineRun, PipelineRunStatusEnum } from '../entities/pipeline-run.entity.js';
import { PipelineService } from '../services/pipeline.service.js';

describe('PipelineService REFRESH_VENUE_DETAILS (pglite)', () => {
	let harness: PgliteTestingModule;
	let service: PipelineService;
	const topBrandIds = jest.fn<(month: string, top: number, cityId: string) => Promise<string[]>>();
	const refreshDetails =
		jest.fn<(placeIds: string[], budgetUsd: number) => Promise<Record<string, number>>>();

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				BrandService,
				CityService,
				PipelineService,
				ProspectQueryService,
				CompetitorService,
				BrandLeadScoreService,
				{ provide: MentionMatchingService, useValue: { topBrandIds } },
				{ provide: VenueScrapeService, useValue: { refreshDetails } },
			],
		});
		service = harness.moduleRef.get(PipelineService);
		entityManagerManager.setEntityManager(harness.orm.em);
	});

	afterAll(async () => {
		await harness.stop();
	});

	it("refreshes every branch of the report brands and the won prospects, and their competitors, on the $2 default", async () => {
		const em = harness.orm.em;
		const city = testCity(em);
		const venue = (name: string, brand = em.create(Brand, { name, key: name })) =>
			em.create(Venue, { city, placeId: `place-${name}`, name, brand });
		const ranked = venue('Ranked');
		const subscriber = venue('Subscriber');
		// A chain: both branches are refreshed
		venue('Subscriber Two', subscriber.brand);
		const rival = venue('Rival');
		const subscribersRival = venue('Subscribers rival');
		venue('Nobody');
		em.create(Prospect, { brand: subscriber.brand, stage: ProspectStageEnum.WON });
		em.create(BrandCompetitor, { brand: ranked.brand, venue: rival });
		em.create(BrandCompetitor, { brand: subscriber.brand, venue: subscribersRival });
		// A competitor that is a report brand itself is asked for once, as a report branch
		em.create(BrandCompetitor, { brand: subscriber.brand, rival: ranked.brand });
		const run = em.create(PipelineRun, {
			city,
			step: PipelineStepEnum.REFRESH_VENUE_DETAILS,
			month: '2026-09',
			params: {},
			status: PipelineRunStatusEnum.QUEUED,
		});
		await em.flush();
		topBrandIds.mockResolvedValue([ranked.brand.id]);
		refreshDetails.mockResolvedValue({ requested: 4, saved: 4, withPopularTimes: 1 });

		await service.execute(run.id);

		const [placeIds, budgetUsd] = refreshDetails.mock.calls[0];
		expect([...placeIds].sort()).toEqual(
			['place-Ranked', 'place-Rival', 'place-Subscriber', 'place-Subscriber Two', 'place-Subscribers rival'].sort(),
		);
		expect(budgetUsd).toBe(2);
		em.clear();
		const done = await em.findOneOrFail(PipelineRun, { id: run.id });
		expect(done.status).toBe(PipelineRunStatusEnum.SUCCEEDED);
		expect(done.result).toEqual({
			'1. REFRESH_VENUE_DETAILS': {
				requested: 4,
				saved: 4,
				withPopularTimes: 1,
				competitors: 2,
			},
		});
	});
});
