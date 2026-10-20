import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';

import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { Brand } from 'src/modules/venues/entities/brand.entity.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { BrandLeadScoreService } from 'src/modules/venues/services/brand-lead-score.service.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { ProspectStageEnum } from '../constants/outreach.constant.js';
import { Prospect } from '../entities/prospect.entity.js';
import { ProspectQueryService } from '../services/prospect-query.service.js';

describe('ProspectQueryService (pglite)', () => {
	let harness: PgliteTestingModule;
	let service: ProspectQueryService;

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [ProspectQueryService, BrandLeadScoreService],
		});
		service = harness.moduleRef.get(ProspectQueryService);
		entityManagerManager.setEntityManager(harness.orm.em);

		const em = harness.orm.em;
		// A one-branch brand per venue, the lead score on the brand
		const venue = (name: string, leadScore: number | null, closed = false) =>
			em.create(Venue, {
				city: testCity(em),
				placeId: `place-${name}`,
				name,
				closed,
				brand: em.create(Brand, { name, key: name.toLowerCase(), leadScore }),
			});
		venue('Best, already won', 95);
		venue('Second, already contacted', 90);
		venue('Third', 80);
		venue('Fourth', 70);
		venue('Closed', 99, true);
		venue('Unscored', null);
		venue('Fifth', 10);
		await em.flush();
		const byName = (name: string) => em.findOneOrFail(Brand, { name });
		em.create(Prospect, {
			brand: await byName('Best, already won'),
			stage: ProspectStageEnum.WON,
		});
		em.create(Prospect, { brand: await byName('Second, already contacted'), instagram: 'second.berlin' });
		await em.flush();
	});

	afterAll(async () => {
		await harness.stop();
	});

	it('suggests the best-scoring brands with an open branch that are not prospects yet', async () => {
		expect((await service.suggested(2)).map(b => b.name)).toEqual(['Third', 'Fourth']);
		expect((await service.suggested(10)).map(b => b.name)).toEqual([
			'Third',
			'Fourth',
			'Fifth',
		]);
	});

	it('names the brands of won prospects', async () => {
		const won = await harness.orm.em.findOneOrFail(Brand, { name: 'Best, already won' });
		expect(await service.wonBrandIds()).toEqual([won.id]);
	});

	it("gives the brands' Instagram handles outreach knows", async () => {
		const second = await harness.orm.em.findOneOrFail(Brand, { name: 'Second, already contacted' });
		const won = await harness.orm.em.findOneOrFail(Brand, { name: 'Best, already won' });
		expect(await service.instagramHandles([second.id, won.id])).toEqual([
			{ brandId: second.id, instagram: 'second.berlin' },
		]);
	});
});
