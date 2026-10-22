import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';

import { CityService } from 'src/modules/cities/services/city.service.js';
import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { ProspectStageEnum } from 'src/modules/outreach/constants/outreach.constant.js';
import { Prospect } from 'src/modules/outreach/entities/prospect.entity.js';
import { ProspectQueryService } from 'src/modules/outreach/services/prospect-query.service.js';
import { MentionMatchingService } from 'src/modules/social/services/mention-matching.service.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { BrandService } from 'src/modules/venues/services/brand.service.js';
import { BrandLeadScoreService } from 'src/modules/venues/services/brand-lead-score.service.js';
import { brandFactory } from 'src/modules/venues/tests/factories/brand.factory.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { PipelineService } from '../services/pipeline.service.js';

const MONTH = '2026-09';

describe('PipelineService.topBrands (pglite)', () => {
	let harness: PgliteTestingModule;
	let service: PipelineService;
	const topBrandIds = jest.fn<(month: string, top: number, cityId: string) => Promise<string[]>>();
	let city: ReturnType<typeof testCity>;

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				PipelineService,
				ProspectQueryService,
				BrandLeadScoreService,
				BrandService,
				CityService,
				{ provide: MentionMatchingService, useValue: { topBrandIds } },
			],
		});
		service = harness.moduleRef.get(PipelineService);
		entityManagerManager.setEntityManager(harness.orm.em);
	});

	afterAll(async () => {
		await harness.stop();
	});

	it("adds the city's won prospects to the top brands, and lost ones only when they rank", async () => {
		const em = harness.orm.em;
		city = testCity(em);
		const venue = (name: string, inCity = city) => em.create(Venue, { city: inCity, placeId: `place-${name}`, name });
		const buzzing = venue('Buzzing');
		const lostButRanked = venue('Lost but ranked');
		const quietSubscriber = venue('Quiet subscriber');
		const lostAndQuiet = venue('Lost and quiet');
		const optedOutAndQuiet = venue('Opted out and quiet');
		venue('Nobody');
		// Another city's subscriber gets its report from that city's run
		const elsewhere = venue('Subscriber elsewhere', testCity(em, { name: 'Wien' }));
		// Saved first: each venue gets a brand of its own
		await em.flush();
		em.create(Prospect, { brand: elsewhere.brand, stage: ProspectStageEnum.WON });
		em.create(Prospect, { brand: lostButRanked.brand, stage: ProspectStageEnum.LOST });
		em.create(Prospect, { brand: quietSubscriber.brand, stage: ProspectStageEnum.WON });
		em.create(Prospect, { brand: lostAndQuiet.brand, stage: ProspectStageEnum.LOST });
		em.create(Prospect, { brand: optedOutAndQuiet.brand, stage: ProspectStageEnum.OPTED_OUT });
		await em.flush();
		// The quiet subscriber has no mention this month: the top list doesn't name it
		topBrandIds.mockResolvedValue([buzzing.brand.id, lostButRanked.brand.id]);

		const brands = await service.topBrands(city, MONTH, 2);

		expect(topBrandIds).toHaveBeenCalledWith(MONTH, 2, city.id);
		expect(brands.map(t => t.brand.name)).toEqual(['Buzzing', 'Lost but ranked', 'Quiet subscriber']);
		expect(brands[0]).toMatchObject({ branches: [{ id: buzzing.id }] });
	});

	it('counts a won prospect that also ranks once', async () => {
		const em = harness.orm.em;
		const subscriber = await em.findOneOrFail(Venue, { name: 'Quiet subscriber' });
		topBrandIds.mockResolvedValue([subscriber.brand.id]);

		const brands = await service.topBrands(city, MONTH, 1);

		expect(brands.map(t => t.brand.name)).toEqual(['Quiet subscriber']);
	});

	it("covers a chain once with its open branches in the city, and watches every branch's reviews", async () => {
		const em = harness.orm.em;
		await em.nativeDelete(Prospect, {});
		const brand = await brandFactory.create({ name: 'Nhas City Chicken' });
		const branch = (name: string, reviewsCount: number, extra: Partial<Venue> = {}) =>
			em.create(Venue, { city, placeId: `place-${name}`, name, brand, reviewsCount, ...extra });
		const mitte = branch('Nhas Mitte', 2451);
		branch('Nhas Neukölln', 1100);
		branch('Nhas Wedding', 900, { closed: true });
		// A branch in another city is that city's run
		branch('Nhas Wien', 3000, { city: testCity(em, { name: 'Wien' }) });
		em.create(Prospect, { brand, stage: ProspectStageEnum.WON });
		await em.flush();
		// Won, but outside this month's top: still covered
		topBrandIds.mockResolvedValue([]);

		const brands = await service.topBrands(city, MONTH, 5);
		expect(brands).toHaveLength(1);
		expect(brands[0].brand.id).toBe(brand.id);
		// Its open branches here, the most reviewed first
		expect(brands[0].branches.map(v => v.id)).toEqual([mitte.id, expect.any(String)]);
		expect(brands[0].branches.map(v => v.name)).toEqual(['Nhas Mitte', 'Nhas Neukölln']);
		expect((await service.subscribedVenues(city)).map(v => v.name).sort()).toEqual(['Nhas Mitte', 'Nhas Neukölln']);
	});
});
