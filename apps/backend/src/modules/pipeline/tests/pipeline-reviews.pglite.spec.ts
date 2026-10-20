import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';

import { CityService } from 'src/modules/cities/services/city.service.js';
import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { ProspectQueryService } from 'src/modules/outreach/services/prospect-query.service.js';
import { MentionMatchingService } from 'src/modules/social/services/mention-matching.service.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { BrandService } from 'src/modules/venues/services/brand.service.js';
import { CompetitorService } from 'src/modules/venues/services/competitor.service.js';
import { ReviewService } from 'src/modules/venues/services/review.service.js';
import { TripadvisorReviewService } from 'src/modules/venues/services/tripadvisor-review.service.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { PipelineStepEnum } from '../constants/pipeline.constant.js';
import { PipelineRun, PipelineRunStatusEnum } from '../entities/pipeline-run.entity.js';
import { PipelineService } from '../services/pipeline.service.js';

describe('PipelineService SCRAPE_REVIEWS (pglite)', () => {
	let harness: PgliteTestingModule;
	let service: PipelineService;
	const scrapeMonth = jest.fn(async (..._args: unknown[]) => 12);
	const topBrandIds = jest.fn(async (..._args: unknown[]) => [] as string[]);

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				BrandService,
				CityService,
				PipelineService,
				ProspectQueryService,
				{ provide: ReviewService, useValue: { scrapeMonth } },
				{ provide: MentionMatchingService, useValue: { topBrandIds } },
				{ provide: CompetitorService, useValue: { competitorVenueIdsOf: async () => [] } },
				{
					provide: TripadvisorReviewService,
					useValue: { findPages: async () => ({ searched: 0, found: 0 }), scrapeMonth: async () => 0 },
				},
			],
		});
		service = harness.moduleRef.get(PipelineService);
		entityManagerManager.setEntityManager(harness.orm.em);
	});

	afterAll(async () => {
		await harness.stop();
	});

	it("scrapes the report brands' reviews from the month's first day, or from `since` for a backfill", async () => {
		const em = harness.orm.em;
		const city = testCity(em);
		const venue = em.create(Venue, { city, placeId: 'rev-1', name: 'Döner Pro' });
		await em.flush();
		topBrandIds.mockResolvedValue([venue.brand.id]);
		const run = (params: Record<string, unknown>) =>
			em.create(PipelineRun, {
				city,
				step: PipelineStepEnum.SCRAPE_REVIEWS,
				month: '2026-09',
				params,
				status: PipelineRunStatusEnum.QUEUED,
			});
		const plain = run({});
		const backfill = run({ since: '2026-08-01', budgetUsd: 12 });
		await em.flush();

		await service.execute(plain.id);
		await service.execute(backfill.id);

		const [first, second] = scrapeMonth.mock.calls;
		expect(first[0]).toBe('2026-09');
		expect(first[1]).toEqual([venue.id]);
		expect(first[4]).toBeUndefined();
		expect(second[4]).toBe('2026-08-01');
		// $12 less TripAdvisor's tenth
		expect(second[2]).toBeCloseTo(10.8);
	});
});
