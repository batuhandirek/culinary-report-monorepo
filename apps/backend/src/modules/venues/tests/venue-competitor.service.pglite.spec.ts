import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';

import type { City } from 'src/modules/cities/entities/city.entity.js';
import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import type { Brand } from '../entities/brand.entity.js';
import { CompetitorPickedByEnum } from '../entities/brand-competitor.entity.js';
import { Venue } from '../entities/venue.entity.js';
import { CompetitorService } from '../services/competitor.service.js';

import { brandFactory } from './factories/brand.factory.js';
import { venueFactory } from './factories/venue.factory.js';

describe('CompetitorService (pglite)', () => {
	let harness: PgliteTestingModule;
	let service: CompetitorService;
	let berlin: City;
	let doner: Venue;
	let ruyam: Venue;
	let mustafas: Venue;
	let chain: Brand;
	let kotti: Venue;
	let mitte: Venue;
	let wienBranch: Venue;
	let wienCity: City;

	beforeAll(async () => {
		harness = await createPgliteTestingModule({ providers: [CompetitorService] });
		service = harness.moduleRef.get(CompetitorService);
		entityManagerManager.setEntityManager(harness.orm.em);

		const em = harness.orm.em;
		berlin = testCity(em);
		const wien = testCity(em, { name: 'Wien' });
		wienCity = wien;
		[doner, ruyam, mustafas] = ['Döner Pro', 'Rüyam Gemüse Kebab', "Mustafa's Gemüse Kebap"].map((name, i) =>
			em.create(Venue, { city: berlin, placeId: `place-${i}`, name, category: 'Restaurant' }),
		);
		chain = await brandFactory.create({ name: 'Burgermeister' });
		const branch = (city: City, name: string, reviewsCount: number) =>
			venueFactory.build({ name, reviewsCount }, { associations: { city, brand: chain } });
		kotti = branch(berlin, 'Burgermeister Kotti', 900);
		mitte = branch(berlin, 'Burgermeister Mitte', 300);
		wienBranch = branch(wien, 'Burgermeister Wien', 100);
		await em.flush();
	});

	afterAll(async () => {
		await harness.stop();
	});

	it('adds a brand’s competitors once each, places or whole brands, and lists them by name', async () => {
		await service.add(doner.brand.id, { venueId: ruyam.id });
		await service.add(doner.brand.id, { venueId: mustafas.id });
		await service.add(doner.brand.id, { venueId: ruyam.id });
		await service.add(doner.brand.id, { brandId: chain.id });

		expect(
			(await service.list(doner.brand.id)).map(c => [c.venue?.name ?? c.rival?.name, c.pickedBy]),
		).toEqual([
			['Burgermeister', CompetitorPickedByEnum.ADMIN],
			["Mustafa's Gemüse Kebap", CompetitorPickedByEnum.ADMIN],
			['Rüyam Gemüse Kebab', CompetitorPickedByEnum.ADMIN],
		]);
		// One way only
		expect(await service.list(ruyam.brand.id)).toEqual([]);
	});

	it('refuses the brand itself and its own branches', async () => {
		await expect(service.add(chain.id, { brandId: chain.id })).rejects.toThrow('cannot compete with itself');
		await expect(service.add(chain.id, { venueId: mitte.id })).rejects.toThrow('one of your own branches');
	});

	it('lets an owner pick only places and brands in its cities', async () => {
		const wien = testCity(harness.orm.em, { name: 'Wien' });
		const faraway = harness.orm.em.create(Venue, { city: wien, placeId: 'p-wien', name: 'Wiener Beisl', category: 'Restaurant' });
		await harness.orm.em.flush();
		await expect(
			service.add(ruyam.brand.id, { venueId: faraway.id }, CompetitorPickedByEnum.OWNER),
		).rejects.toThrow('in your city');
		await service.add(ruyam.brand.id, { brandId: chain.id }, CompetitorPickedByEnum.OWNER);
		expect((await service.list(ruyam.brand.id)).map(c => c.pickedBy)).toEqual([CompetitorPickedByEnum.OWNER]);
	});

	it('compares a rival brand in a city by its open branches there, the most reviewed first', async () => {
		const inBerlin = await service.inCity(doner.brand.id, berlin.id);
		expect(inBerlin.map(c => [c.name, c.venues.map(v => v.name)])).toEqual([
			['Burgermeister', ['Burgermeister Kotti', 'Burgermeister Mitte']],
			["Mustafa's Gemüse Kebap", ["Mustafa's Gemüse Kebap"]],
			['Rüyam Gemüse Kebab', ['Rüyam Gemüse Kebab']],
		]);
	});

	it('collects the competing places of several brands in a city, never their own branches', async () => {
		await service.add(ruyam.brand.id, { venueId: doner.id });
		expect((await service.competitorVenueIdsOf([doner.brand.id, ruyam.brand.id], berlin.id)).sort()).toEqual(
			[kotti.id, mitte.id, mustafas.id].sort(),
		);
		expect((await service.competitorVenueIdsOf([ruyam.brand.id], berlin.id)).sort()).toEqual(
			[doner.id, kotti.id, mitte.id].sort(),
		);
	});

	it('removes a competitor by its id on the list, and only from its own brand', async () => {
		const [rival] = await service.list(doner.brand.id);
		await expect(service.remove(ruyam.brand.id, rival.id)).rejects.toThrow();
		await service.remove(doner.brand.id, rival.id);
		expect((await service.list(doner.brand.id)).map(c => c.venue?.name ?? c.rival?.name)).toEqual([
			"Mustafa's Gemüse Kebap",
			'Rüyam Gemüse Kebab',
		]);
	});

	describe('for one branch', () => {
		it('counts a branch-only competitor in its branch’s city only, next to the brand-wide ones', async () => {
			const em = harness.orm.em;
			const beisl = em.create(Venue, { city: wienCity, placeId: 'p-beisl', name: 'Wiener Beisl', category: 'Restaurant' });
			await em.flush();
			await service.add(chain.id, { venueId: doner.id });
			await service.add(chain.id, { venueId: beisl.id }, CompetitorPickedByEnum.ADMIN, wienBranch.id);

			const list = await service.list(chain.id);
			expect(list.map(c => [c.venue?.name, c.branch?.id ?? null])).toEqual([
				['Döner Pro', null],
				['Wiener Beisl', wienBranch.id],
			]);
			expect((await service.inCity(chain.id, wienCity.id)).map(c => [c.name, c.branch?.id])).toEqual([
				['Wiener Beisl', wienBranch.id],
			]);
			expect((await service.inCity(chain.id, berlin.id)).map(c => c.name)).toEqual(['Döner Pro']);
		});

		it('refuses a branch of another brand', async () => {
			await expect(
				service.add(chain.id, { venueId: ruyam.id }, CompetitorPickedByEnum.ADMIN, doner.id),
			).rejects.toThrow('not a branch of Burgermeister');
		});

		it('counts room per subject: the brand-wide list and each branch’s on its own', async () => {
			const em = harness.orm.em;
			const extra = ['A', 'B', 'C', 'D', 'E', 'F'].map(name =>
				em.create(Venue, { city: berlin, placeId: `p-room-${name}`, name: `Imbiss ${name}`, category: 'Restaurant' }),
			);
			await em.flush();
			// Döner Pro is brand-wide already: four more fill the list
			for (const venue of extra.slice(0, 4)) await service.add(chain.id, { venueId: venue.id });
			await expect(service.add(chain.id, { venueId: extra[4].id })).rejects.toThrow('A brand has 5 competitors at most');
			// A branch's list is its own
			await service.add(chain.id, { venueId: extra[4].id }, CompetitorPickedByEnum.ADMIN, kotti.id);
			expect((await service.list(chain.id)).filter(c => c.branch?.id === kotti.id).map(c => c.venue?.name)).toEqual([
				'Imbiss E',
			]);
		});
	});
});
