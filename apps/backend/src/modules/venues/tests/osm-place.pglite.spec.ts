import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';

import type { GooglePlaceItem } from 'src/modules/apify/actors/google-places.actor.js';
import { ApifyService } from 'src/modules/apify/services/apify.service.js';
import { City } from 'src/modules/cities/entities/city.entity.js';
import { cityFactory } from 'src/modules/cities/tests/factories/city.factory.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { VenueScrapeSourceEnum } from '../constants/venue-status.constant.js';
import { OsmPlace } from '../entities/osm-place.entity.js';
import { Venue } from '../entities/venue.entity.js';
import { VenueStatusChange } from '../entities/venue-status-change.entity.js';
import { OsmPlaceService } from '../services/osm-place.service.js';
import { OverpassService } from '../services/overpass.service.js';
import { VenueService } from '../services/venue.service.js';
import { VenueScrapeService } from '../services/venue-scrape.service.js';
import type { OverpassElement } from '../util/osm-places.js';

import { venueFactory } from './factories/venue.factory.js';

// Wittenbergplatz, Berlin, and about `m` metres north of it
const AT = { lat: 52.5019, lng: 13.3426 };
const north = (m: number) => AT.lat + m / 110_574;

const node = (
	id: number,
	name: string,
	metresNorth: number,
	tags: Record<string, string> = {},
): OverpassElement => ({
	type: 'node',
	id,
	lat: north(metresNorth),
	lon: AT.lng,
	tags: { amenity: 'restaurant', name, ...tags },
});

/** A `compass/crawler-google-places` list item for a search, as the dataset holds it. */
const place = (
	searchString: string,
	placeId: string,
	title: string,
	metresNorth: number,
	extra: Partial<GooglePlaceItem> = {},
): GooglePlaceItem => ({
	searchString,
	placeId,
	title,
	categoryName: 'Turkish restaurant',
	city: 'Berlin',
	street: 'Wittenbergplatz 5',
	location: { lat: north(metresNorth), lng: AT.lng },
	totalScore: 4.7,
	reviewsCount: 2997,
	...extra,
});

describe('OsmPlaceService (pglite)', () => {
	let harness: PgliteTestingModule;
	let service: OsmPlaceService;
	let scrapeService: VenueScrapeService;
	let city: City;
	let known: Venue;
	const foodPlaces = jest.fn<(relationId: number) => Promise<OverpassElement[]>>();

	/**
	 * The lookups as the `osm-places` workflow runs them: the plan, the run's places saved by the
	 * atom's rule (`items` is what Google returned), the searched places stamped and linked
	 */
	const lookup = async (budgetUsd: number, items: GooglePlaceItem[], now?: Date) => {
		const plan = await service.planLookups(city, budgetUsd);
		const saved =
			plan.queries.length ?
				await scrapeService.savePlaces(items, {
					city,
					source: VenueScrapeSourceEnum.LOOKUP,
					newPlaces: 'food-in-city',
				})
			:	{ saved: 0 };
		const result = await service.saveLookups(
			city,
			plan.osmPlaceIds,
			{ found: plan.queries.length ? items.length : 0, saved: saved.saved },
			now,
		);
		return { plan, result };
	};

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				OsmPlaceService,
				VenueScrapeService,
				VenueService,
				{ provide: OverpassService, useValue: { foodPlaces } },
				{ provide: ApifyService, useValue: {} },
			],
		});
		service = harness.moduleRef.get(OsmPlaceService);
		scrapeService = harness.moduleRef.get(VenueScrapeService);
		entityManagerManager.setEntityManager(harness.orm.em);

		city = await cityFactory.create({ osmRelationId: 62422 });
		known = await venueFactory.create(
			{
				placeId: 'known',
				name: 'Pizza Roma Berlin',
				lat: north(10),
				lng: AT.lng,
				category: 'Pizza restaurant',
			},
			{ associations: { city } },
		);
	});

	beforeEach(() => {
		foodPlaces.mockReset();
	});

	afterAll(async () => {
		await harness.stop();
	});

	it('stores what OSM lists and links the places the venue list has', async () => {
		foodPlaces.mockResolvedValueOnce([
			node(1, 'Pizza Roma', 0, { cuisine: 'pizza' }),
			node(2, 'Baba Pirzola', 0, {
				'addr:street': 'Wittenbergplatz',
				'addr:housenumber': '5',
				'addr:postcode': '10789',
			}),
			node(3, 'Faustus', 0, { website: 'https://faustus.de' }),
			// No name: not a place to check
			{ type: 'node', id: 4, lat: AT.lat, lon: AT.lng, tags: { amenity: 'cafe' } },
			// Listed twice (in both groups of the query)
			node(1, 'Pizza Roma', 0, { cuisine: 'pizza' }),
		]);
		const result = await service.sync(city, new Date('2026-10-21T10:00:00Z'));
		expect(foodPlaces).toHaveBeenCalledWith(62422);
		expect(result).toEqual({
			added: 3,
			updated: 0,
			gone: 0,
			listed: 3,
			matched: 1,
			notFound: 0,
			toLookUp: 2,
		});

		const em = harness.orm.em.fork();
		const rows = await em.find(OsmPlace, { city: city.id }, { orderBy: { osmKey: 'asc' } });
		expect(rows.map(r => [r.osmKey, r.name, r.venue?.id ?? null])).toEqual([
			['node/1', 'Pizza Roma', known.id],
			['node/2', 'Baba Pirzola', null],
			['node/3', 'Faustus', null],
		]);
		expect(rows[1]).toMatchObject({
			street: 'Wittenbergplatz',
			houseNumber: '5',
			postalCode: '10789',
		});
		expect(rows[0].tags).toMatchObject({ cuisine: 'pizza' });
	});

	it('plans the unlinked places by name and address, and links what Google had once it is saved', async () => {
		const { plan, result } = await lookup(
			10,
			[
				place('Faustus, Berlin', 'faustus', 'Faustus', 3, {
					categoryName: 'German restaurant',
				}),
				place('Baba Pirzola, Wittenbergplatz 5, 10789 Berlin', 'baba', 'Baba Pirzola', 2),
			],
			new Date('2026-10-21T11:00:00Z'),
		);
		// Sit-down places first, the one OSM keeps up (a website) before the other; typed as a
		// guest types them, one place each
		expect(plan.queries).toEqual([
			'Faustus, Berlin',
			'Baba Pirzola, Wittenbergplatz 5, 10789 Berlin',
		]);
		expect(plan.osmPlaceIds).toHaveLength(2);
		expect(result).toEqual({
			searched: 2,
			found: 2,
			saved: 2,
			linked: 2,
			listed: 3,
			matched: 3,
			notFound: 0,
			toLookUp: 0,
		});

		const em = harness.orm.em.fork();
		const baba = await em.findOneOrFail(Venue, { placeId: 'baba' });
		expect(baba).toMatchObject({ name: 'Baba Pirzola', reviewsCount: 2997 });
		expect((await em.findOneOrFail(OsmPlace, { osmKey: 'node/2' })).venue?.id).toBe(baba.id);
		// A search finds old places: never an opening
		expect(await em.count(VenueStatusChange, {})).toBe(0);
	});

	it('never searches a place twice, and fits the searches to the budget', async () => {
		foodPlaces.mockResolvedValueOnce([
			node(1, 'Pizza Roma', 0),
			node(2, 'Baba Pirzola', 0),
			node(3, 'Faustus', 0),
			node(10, 'Lost Place', 500),
			node(11, 'Another Lost Place', 900),
			node(12, 'Third Lost Place', 1300),
		]);
		const synced = await service.sync(city, new Date('2026-10-22T10:00:00Z'));
		expect(synced).toMatchObject({ added: 3, updated: 3, listed: 6, matched: 3, toLookUp: 3 });

		// $0.01 at 80 % covers two searches at $0.004; Google finds a stranger and a shop for them
		const first = await lookup(0.01, [
			place('Another Lost Place, Berlin', 'stranger', 'Grill Ecke', 900),
			place('Lost Place, Berlin', 'shop', 'Späti Ecke', 500, {
				categoryName: 'Convenience store',
			}),
		]);
		expect(first.plan.queries).toEqual(['Lost Place, Berlin', 'Another Lost Place, Berlin']);
		expect(first.result).toMatchObject({
			searched: 2,
			found: 2,
			saved: 1,
			linked: 0,
			notFound: 2,
			toLookUp: 1,
		});
		const em = harness.orm.em.fork();
		// Not a food place: not saved
		expect(await em.count(Venue, { placeId: 'shop' })).toBe(0);
		// Saved, but not the OSM place: that stays unlinked
		expect(await em.count(Venue, { placeId: 'stranger' })).toBe(1);

		const second = await lookup(10, []);
		expect(second.plan.queries).toEqual(['Third Lost Place, Berlin']);
		expect(second.result).toMatchObject({ searched: 1, found: 0, notFound: 3, toLookUp: 0 });

		const third = await lookup(10, []);
		expect(third.plan).toEqual({ osmPlaceIds: [], queries: [] });
		expect(third.result).toMatchObject({ searched: 0 });
	});

	it('counts only what the last sync listed, and keeps a gone place', async () => {
		foodPlaces.mockResolvedValueOnce([
			node(1, 'Pizza Roma', 0),
			node(2, 'Baba Pirzola', 0),
			node(3, 'Faustus', 0),
			node(10, 'Lost Place', 500),
		]);
		const result = await service.sync(city, new Date('2026-10-23T10:00:00Z'));
		expect(result).toMatchObject({
			added: 0,
			updated: 4,
			gone: 2,
			listed: 4,
			matched: 3,
			notFound: 1,
			toLookUp: 0,
		});
		expect(await harness.orm.em.fork().count(OsmPlace, { city: city.id })).toBe(6);
	});

	it('stores nothing of an empty or a cut-short answer: the checklist stays as it was', async () => {
		const lastSync = new Date('2026-10-23T10:00:00Z');
		const before = await service.coverage(city);
		expect(before).toEqual({ listed: 4, matched: 3, notFound: 1, toLookUp: 0 });

		// Nothing listed
		foodPlaces.mockResolvedValueOnce([]);
		await expect(service.sync(city, new Date('2026-11-02T06:00:00Z'))).rejects.toThrow(
			'Overpass listed 0 food places',
		);
		// Only elements that are no place (no name)
		foodPlaces.mockResolvedValueOnce([
			{ type: 'node', id: 4, lat: AT.lat, lon: AT.lng, tags: { amenity: 'cafe' } },
		]);
		await expect(service.sync(city, new Date('2026-11-02T06:00:00Z'))).rejects.toThrow(
			'Overpass listed 0 food places',
		);
		// Under half of the four the last sync listed, with a place it never had
		foodPlaces.mockResolvedValueOnce([node(20, 'Half An Answer', 2000)]);
		await expect(service.sync(city, new Date('2026-11-02T06:00:00Z'))).rejects.toThrow(
			'Overpass listed 1 food places for ' + city.name + ' against 4',
		);

		const em = harness.orm.em.fork();
		expect((await em.findOneOrFail(City, city.id)).osmPlacesSyncedAt).toEqual(lastSync);
		expect(await em.count(OsmPlace, { city: city.id })).toBe(6);
		expect(await em.count(OsmPlace, { seenAt: { $gt: lastSync } })).toBe(0);
		expect(await service.coverage(city)).toEqual(before);

		// Half of them is a list: two places closed, the sync goes through
		foodPlaces.mockResolvedValueOnce([node(1, 'Pizza Roma', 0), node(2, 'Baba Pirzola', 0)]);
		const result = await service.sync(city, new Date('2026-11-03T06:00:00Z'));
		expect(result).toMatchObject({ updated: 2, gone: 4, listed: 2, matched: 2 });
	});

	it('refuses a city without an OSM boundary', async () => {
		const elsewhere = await cityFactory.create({ name: 'Wien' });
		await expect(service.sync(elsewhere)).rejects.toThrow('no OpenStreetMap relation id');
		expect(foodPlaces).not.toHaveBeenCalled();
	});
});
