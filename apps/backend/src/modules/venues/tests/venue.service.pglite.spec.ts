import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';

import type { City } from 'src/modules/cities/entities/city.entity.js';
import { cityFactory } from 'src/modules/cities/tests/factories/city.factory.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { Venue } from '../entities/venue.entity.js';
import { VenueSnapshot } from '../entities/venue-snapshot.entity.js';
import { VenueService } from '../services/venue.service.js';

describe('VenueService (pglite)', () => {
	let harness: PgliteTestingModule;
	let service: VenueService;
	let city: City;

	beforeAll(async () => {
		harness = await createPgliteTestingModule({ providers: [VenueService] });
		service = harness.moduleRef.get(VenueService);
		entityManagerManager.setEntityManager(harness.orm.em);
		city = await cityFactory.create();
	});

	afterAll(async () => {
		await harness.stop();
	});

	it('creates a venue in the city with its rating as a snapshot, and updates it on the next scrape', async () => {
		const em = harness.orm.em;
		const item = {
			placeId: 'place-1',
			title: 'Chén Chè',
			neighborhood: 'Mitte',
			postalCode: '10119',
			categoryName: 'Vietnamese restaurant',
			city: 'Berlin',
			totalScore: 4.1,
			reviewsCount: 3000,
		};
		await service.saveGooglePlace(item, new Date('2026-09-01T10:00:00Z'), city);
		await em.flush();
		// A refresh without a city updates the known venue
		await service.saveGooglePlace(
			{ ...item, totalScore: 4.0, reviewsCount: 3300 },
			new Date('2026-10-01T10:00:00Z'),
		);
		await em.flush();
		em.clear();

		const venue = await em.findOneOrFail(Venue, { placeId: 'place-1' });
		expect(venue).toMatchObject({
			name: 'Chén Chè',
			rating: 4.0,
			reviewsCount: 3300,
			district: 'Mitte',
			locality: 'Berlin',
			city: { id: city.id },
		});
		expect(await em.count(VenueSnapshot, { venue })).toBe(2);
	});

	it('ignores an item without a place id, and a new place without a city', async () => {
		expect(await service.saveGooglePlace({ title: 'Nameless' }, new Date(), city)).toBeNull();
		expect(await service.saveGooglePlace({ placeId: 'place-new', title: 'New' })).toBeNull();
	});

	it("fills a missing district from the city's postal codes, else the postal code's most common one", async () => {
		const em = harness.orm.em;
		const save = (placeId: string, postalCode: string, district: string | null, inCity = city) =>
			service.saveGooglePlace(
				{ placeId, title: placeId, postalCode, neighborhood: district ?? undefined },
				new Date(),
				inCity,
			);
		await save('a', '12047', 'Neukölln');
		await save('b', '12047', 'Neukölln');
		await save('c', '12047', 'Friedrichshain-Kreuzberg');
		await save('d', '12047', null);
		// Google's neighbourhood, not one of the city's districts
		await save('e', '10999', 'Wrangelkiez');
		// Another city's venue with the same postal code is left alone
		const other = cityFactory.build({ name: 'Elsewhere', districts: [] });
		await save('f', '12047', null, other);
		await em.flush();
		em.assign(city, {
			districts: city.districts.map(d =>
				d.name === 'Friedrichshain-Kreuzberg' ? { ...d, postalCodes: ['10999'] } : d,
			),
		});
		await em.flush();

		expect(await service.fillDistricts(city)).toBe(2);
		em.clear();
		expect((await em.findOneOrFail(Venue, { placeId: 'd' })).district).toBe('Neukölln');
		expect((await em.findOneOrFail(Venue, { placeId: 'e' })).district).toBe('Friedrichshain-Kreuzberg');
		expect((await em.findOneOrFail(Venue, { placeId: 'f' })).district).toBeNull();
	});
});
