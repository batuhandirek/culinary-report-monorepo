import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';

import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { AdminBrandsController } from '../controllers/admin.brands.controller.js';
import type { Brand } from '../entities/brand.entity.js';
import { CompetitorPickedByEnum } from '../entities/brand-competitor.entity.js';
import { Venue } from '../entities/venue.entity.js';
import { CompetitorService } from '../services/competitor.service.js';

import { brandFactory } from './factories/brand.factory.js';
import { venueFactory } from './factories/venue.factory.js';

describe('AdminBrandsController competitors (pglite)', () => {
	let harness: PgliteTestingModule;
	let controller: AdminBrandsController;
	let service: CompetitorService;
	let venue: Venue;
	let byAdmin: Venue;
	let byOwner: Venue;
	let chain: Brand;

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [AdminBrandsController, CompetitorService],
		});
		controller = harness.moduleRef.get(AdminBrandsController);
		service = harness.moduleRef.get(CompetitorService);
		entityManagerManager.setEntityManager(harness.orm.em);

		const em = harness.orm.em;
		const city = testCity(em);
		[venue, byAdmin, byOwner] = ['Döner Pro', 'Rüyam Gemüse Kebab', 'Imren Grill'].map((name, i) =>
			em.create(Venue, { city, placeId: `place-${i}`, name, category: 'Restaurant' }),
		);
		chain = await brandFactory.create({ name: 'Burgermeister' });
		venueFactory.build({ name: 'Burgermeister Kotti' }, { associations: { city, brand: chain } });
		venueFactory.build({ name: 'Burgermeister Mitte' }, { associations: { city, brand: chain } });
		await em.flush();
	});

	afterAll(async () => {
		await harness.stop();
	});

	it('lists each competitor, a place or a brand, with who picked it', async () => {
		await service.add(venue.brand.id, { venueId: byOwner.id }, CompetitorPickedByEnum.OWNER);
		await controller.addBrandCompetitor(venue.brand.id, { venueId: byAdmin.id });
		const list = await controller.addBrandCompetitor(venue.brand.id, { brandId: chain.id });

		expect(list.map(c => [c.venue?.name ?? c.rival?.name, c.pickedBy])).toEqual([
			['Burgermeister', CompetitorPickedByEnum.ADMIN],
			['Imren Grill', CompetitorPickedByEnum.OWNER],
			['Rüyam Gemüse Kebab', CompetitorPickedByEnum.ADMIN],
		]);
		expect(list[0].rival).toMatchObject({ id: chain.id, branches: 2, cities: [{ name: 'Berlin' }] });
		expect(list[1].venue).toMatchObject({ id: byOwner.id, city: { name: 'Berlin' }, brand: { id: byOwner.brand.id } });
	});

	it('refuses both a venue and a brand at once, and takes one off by its id', async () => {
		await expect(
			controller.addBrandCompetitor(venue.brand.id, { venueId: byAdmin.id, brandId: chain.id }),
		).rejects.toThrow('Give a venue or a brand');
		const [first] = await controller.listBrandCompetitors(venue.brand.id);
		const left = await controller.removeBrandCompetitor(venue.brand.id, first.id);
		expect(left.map(c => c.venue?.name)).toEqual(['Imren Grill', 'Rüyam Gemüse Kebab']);
	});

	it('adds a competitor for one branch, says which, and refuses another brand’s branch', async () => {
		const em = harness.orm.em;
		const [kotti] = await em.find(Venue, { brand: chain.id, name: 'Burgermeister Kotti' });
		const list = await controller.addBrandCompetitor(chain.id, { venueId: byAdmin.id, branchId: kotti.id });
		expect(list.map(c => [c.venue?.name, c.branch?.id])).toEqual([['Rüyam Gemüse Kebab', kotti.id]]);
		await expect(
			controller.addBrandCompetitor(chain.id, { venueId: byOwner.id, branchId: venue.id }),
		).rejects.toThrow('not a branch of Burgermeister');
	});
});
