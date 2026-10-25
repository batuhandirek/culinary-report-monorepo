import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';

import { ApifyService } from 'src/modules/apify/services/apify.service.js';
import { City } from 'src/modules/cities/entities/city.entity.js';
import { cityFactory } from 'src/modules/cities/tests/factories/city.factory.js';
import { FoodTopicService } from 'src/modules/food-topics/services/food-topic.service.js';
import { VenueFoodTopicService } from 'src/modules/food-topics/services/venue-food-topic.service.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { Venue } from '../entities/venue.entity.js';
import { VenueLookup } from '../entities/venue-lookup.entity.js';
import { VenueStatusChange } from '../entities/venue-status-change.entity.js';
import { GooglePlaceItem, VenueService } from '../services/venue.service.js';
import { lookupStale, VenueScrapeService } from '../services/venue-scrape.service.js';

describe('lookupStale', () => {
	it('is stale three months after the last lookup', () => {
		expect(lookupStale(new Date('2026-07-02'), new Date('2026-09-02'))).toBe(false);
		expect(lookupStale(new Date('2026-07-02'), new Date('2026-10-02'))).toBe(true);
	});
});

describe('VenueScrapeService.lookupNames (pglite)', () => {
	let harness: PgliteTestingModule;
	let service: VenueScrapeService;
	let city: City;
	const runActor = jest.fn<(...args: unknown[]) => Promise<GooglePlaceItem[]>>();

	const place = (searchString: string, placeId: string, title: string): GooglePlaceItem =>
		({
			searchString,
			placeId,
			title,
			categoryName: 'Restaurant',
			city: city.name,
			street: 'Torstraße 1',
			totalScore: 4.4,
			reviewsCount: 12,
			permanentlyClosed: false,
			temporarilyClosed: false,
			url: `https://www.google.com/maps/place/?q=place_id:${placeId}`,
		}) as GooglePlaceItem;

	const searched = (call: number): string[] =>
		(runActor.mock.calls[call][1] as { searchStringsArray: string[] }).searchStringsArray;

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				VenueScrapeService,
				VenueService,
				FoodTopicService,
				VenueFoodTopicService,
				{ provide: ApifyService, useValue: { runActor } },
			],
		});
		service = harness.moduleRef.get(VenueScrapeService);
		entityManagerManager.setEntityManager(harness.orm.em);
		city = await cityFactory.create();
	});

	afterAll(async () => {
		await harness.stop();
	});

	it('searches each name once, found or not, and stamps the lookup', async () => {
		runActor.mockResolvedValueOnce([place('Mezame Matcha', 'mezame', 'Mezame Matcha')]);
		const july = new Date('2026-07-02T06:00:00Z');

		const res = await service.lookupNames(city, ['Mezame Matcha', 'Tacos Lupita'], 6, july);

		expect(res).toEqual({ lookedUp: 2, retried: 0, saved: 1 });
		expect(searched(0)).toEqual(['Mezame Matcha', 'Tacos Lupita']);
		const lookups = await harness.orm.em.find(VenueLookup, { city }, { orderBy: { query: 'asc' } });
		expect(lookups.map(l => [l.results, l.lookedUpAt])).toEqual([[1, july], [0, july]]);
		expect(await harness.orm.em.count(Venue, { placeId: 'mezame' })).toBe(1);
	});

	it('does not pay again for a name searched within three months', async () => {
		const res = await service.lookupNames(
			city,
			['Tacos Lupita', 'Mezame Matcha'],
			6,
			new Date('2026-09-02T06:00:00Z'),
		);
		expect(res).toEqual({ lookedUp: 0, retried: 0, saved: 0 });
		expect(runActor).toHaveBeenCalledTimes(1);
	});

	it('searches a stale name again, updating its row, and saves the place as a lookup, never an opening', async () => {
		runActor.mockResolvedValueOnce([place('Tacos Lupita', 'lupita', 'Tacos Lupita')]);
		const november = new Date('2026-11-02T06:00:00Z');

		const res = await service.lookupNames(city, ['Tacos Lupita', 'Bao Bar'], 6, november);

		expect(res).toEqual({ lookedUp: 2, retried: 1, saved: 1 });
		expect(searched(1)).toEqual(['Tacos Lupita', 'Bao Bar']);
		harness.orm.em.clear();
		const lookups = await harness.orm.em.find(VenueLookup, { city }, { orderBy: { query: 'asc' } });
		// Three names, three rows: the retried one is updated, not doubled
		expect(lookups).toHaveLength(3);
		const lupita = lookups.find(l => l.results === 1 && l.lookedUpAt.getTime() === november.getTime());
		expect(lupita).toBeDefined();
		expect(await harness.orm.em.count(Venue, { placeId: 'lupita' })).toBe(1);
		expect(await harness.orm.em.count(VenueStatusChange, {})).toBe(0);
	});

	it('caps the run after dropping the names searched lately, so a new name further down is reached', async () => {
		runActor.mockResolvedValueOnce([]);
		const december = new Date('2026-12-02T06:00:00Z');

		// Tacos Lupita and Bao Bar were searched in November: they take none of the two places
		const res = await service.lookupNames(
			city,
			['Tacos Lupita', 'Bao Bar', 'Heller Kaffees', 'Kaffee Perry', 'Third Name'],
			6,
			december,
			2,
		);

		expect(res).toEqual({ lookedUp: 2, retried: 0, saved: 0 });
		expect(searched(2)).toEqual(['Heller Kaffees', 'Kaffee Perry']);
	});

	it('keeps only the places that serve food in the city: never a cleaner or a namesake elsewhere', async () => {
		runActor.mockResolvedValueOnce([
			place('Facil', 'facil', 'Restaurant Facil'),
			{ ...place('Facil', 'facil-clean', 'Facil Clean'), categoryName: 'Cleaners' },
			{ ...place('Facil', 'facil-potsdam', 'Facil Potsdam'), city: 'Potsdam' },
		]);

		const res = await service.lookupNames(city, ['Facil'], 6, new Date('2026-12-01T06:00:00Z'));

		expect(res.saved).toBe(1);
		expect(await harness.orm.em.count(Venue, { placeId: { $in: ['facil', 'facil-clean', 'facil-potsdam'] } })).toBe(1);
		expect(await harness.orm.em.count(Venue, { placeId: 'facil' })).toBe(1);
	});
});
