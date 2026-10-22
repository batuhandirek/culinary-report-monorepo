import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';

import { CityService } from 'src/modules/cities/services/city.service.js';
import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { FoodTopicService } from 'src/modules/food-topics/services/food-topic.service.js';
import { VenueFoodTopicService } from 'src/modules/food-topics/services/venue-food-topic.service.js';
import { seedFoodTopics } from 'src/modules/food-topics/tests/factories/food-topic.factory.js';
import { ProspectQueryService } from 'src/modules/outreach/services/prospect-query.service.js';
import { PgBossService } from 'src/modules/pgboss/pgboss.service.js';
import { MentionMatchingService } from 'src/modules/social/services/mention-matching.service.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { BrandService } from 'src/modules/venues/services/brand.service.js';
import { BrandLeadScoreService } from 'src/modules/venues/services/brand-lead-score.service.js';
import { CompetitorService } from 'src/modules/venues/services/competitor.service.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { MONTHLY_STEPS, PipelineStepEnum } from '../constants/pipeline.constant.js';
import { PipelineRun, PipelineRunStatusEnum } from '../entities/pipeline-run.entity.js';
import { PipelineService } from '../services/pipeline.service.js';
import { isPaidStep } from '../util/step-states.js';

const MONTH = '2026-09';

describe('FILL_COMPETITORS (pglite)', () => {
	let harness: PgliteTestingModule;
	let competitors: CompetitorService;
	const topBrandIds = jest.fn<(month: string, top: number, cityId: string) => Promise<string[]>>();
	const venues: Record<string, Venue> = {};
	let city: ReturnType<typeof testCity>;

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				PipelineService,
				CompetitorService,
				FoodTopicService,
				VenueFoodTopicService,
				ProspectQueryService,
				BrandLeadScoreService,
				BrandService,
				CityService,
				{ provide: MentionMatchingService, useValue: { topBrandIds } },
				{ provide: PgBossService, useValue: { sendJob: jest.fn(async () => 'job-id') } },
			],
		});
		competitors = harness.moduleRef.get(CompetitorService);
		entityManagerManager.setEntityManager(harness.orm.em);

		const em = harness.orm.em;
		seedFoodTopics(em);
		city = testCity(em);
		const add = (key: string, name: string, category: string, district: string) =>
			(venues[key] = em.create(Venue, { city, placeId: key, name, category, district }));
		// A report brand with no competitors, and the places that share its food
		add('doner', 'Döner Pro', 'Doner kebab restaurant', 'Friedrichshain-Kreuzberg');
		add('ruyam', 'Rüyam Gemüse Kebab', 'Kebab shop', 'Friedrichshain-Kreuzberg');
		add('mustafa', "Mustafa's Gemüse Kebap", 'Doner kebab restaurant', 'Neukölln');
		// A report brand whose owner already picked one
		add('pizza', 'Pizza Tre', 'Pizza restaurant', 'Friedrichshain-Kreuzberg');
		add('pizza2', 'Pizza Due', 'Pizza restaurant', 'Friedrichshain-Kreuzberg');
		add('pizza3', 'Pizza Uno', 'Pizza restaurant', 'Neukölln');
		// Saved first: each venue gets a brand of its own
		await em.flush();
		await competitors.add(venues.pizza.brand.id, { venueId: venues.pizza2.id });
		topBrandIds.mockResolvedValue([venues.doner.brand.id, venues.pizza.brand.id]);
	});

	afterAll(async () => {
		await harness.stop();
	});

	it('is a free step of the monthly run, after the last match and right before the review scrape', () => {
		const at = MONTHLY_STEPS.indexOf(PipelineStepEnum.FILL_COMPETITORS);
		expect(at).toBe(MONTHLY_STEPS.lastIndexOf(PipelineStepEnum.MATCH_MENTIONS) + 1);
		expect(MONTHLY_STEPS[at + 1]).toBe(PipelineStepEnum.SCRAPE_REVIEWS);
		expect(isPaidStep(PipelineStepEnum.FILL_COMPETITORS)).toBe(false);
	});

	it('fills the report brands that have no competitors and leaves the others as they are', async () => {
		const em = harness.orm.em;
		const run = em.create(PipelineRun, {
			city,
			step: PipelineStepEnum.FILL_COMPETITORS,
			month: MONTH,
			params: {},
			status: PipelineRunStatusEnum.QUEUED,
		});
		await em.flush();

		await harness.moduleRef.get(PipelineService).execute(run.id);

		em.clear();
		const done = await em.findOneOrFail(PipelineRun, { id: run.id });
		expect(done.status).toBe(PipelineRunStatusEnum.SUCCEEDED);
		expect(done.result).toEqual({
			'1. FILL_COMPETITORS': { brands: 2, filled: 1, added: 2, skipped: 1 },
		});
		const placeIds = async (brandId: string) =>
			(await competitors.list(brandId)).map(c => c.venue!.placeId).sort();
		expect(await placeIds(venues.doner.brand.id)).toEqual(['mustafa', 'ruyam']);
		// The owner's pick stays exactly as it was
		expect(await placeIds(venues.pizza.brand.id)).toEqual(['pizza2']);
		// What the review scrape, next in the run, takes
		const scraped = await competitors.competitorVenueIdsOf(
			[venues.doner.brand.id, venues.pizza.brand.id],
			city.id,
		);
		expect(scraped.sort()).toEqual([venues.mustafa.id, venues.pizza2.id, venues.ruyam.id].sort());
	});
});
