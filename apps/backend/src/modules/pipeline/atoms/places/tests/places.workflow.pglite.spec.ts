import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';

import type { GooglePlaceItem } from 'src/modules/apify/actors/google-places.actor.js';
import { ApifyService } from 'src/modules/apify/services/apify.service.js';
import type { City } from 'src/modules/cities/entities/city.entity.js';
import { CityService } from 'src/modules/cities/services/city.service.js';
import { cityFactory } from 'src/modules/cities/tests/factories/city.factory.js';
import { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';
import { fakeDurable } from 'src/modules/durable-workflows/tests/factories/durable.mock.js';
import {
	VenueScrapeSourceEnum,
	VenueStatusChangeKindEnum,
} from 'src/modules/venues/constants/venue-status.constant.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { VenueSnapshot } from 'src/modules/venues/entities/venue-snapshot.entity.js';
import { VenueStatusChange } from 'src/modules/venues/entities/venue-status-change.entity.js';
import { VenueService } from 'src/modules/venues/services/venue.service.js';
import { VenueScrapeService } from 'src/modules/venues/services/venue-scrape.service.js';
import { DETAIL_ITEM } from 'src/modules/venues/tests/fixtures/google-place-items.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { PlacesWorkflow } from '../workflows/places.workflow.js';

import { FakePlacesApify } from './factories/places.mock.js';

/** A list item as the actor returns it for a search: the search echoed, its place in the list */
const place = (
	searchString: string,
	placeId: string,
	title: string,
	rank: number,
	extra: Partial<GooglePlaceItem> = {},
): GooglePlaceItem => ({
	searchString,
	rank,
	placeId,
	title,
	categoryName: 'Restaurant',
	city: 'Berlin',
	street: `Torstraße ${rank}`,
	totalScore: 4.4,
	reviewsCount: 12,
	permanentlyClosed: false,
	...extra,
});

/**
 * The atom: the actor's input built from the search and the city, the run's cap, memory and
 * owner, the places saved by the caller's rule, and the result a caller reads (ids per query in
 * Google's order, the venues kept).
 */
describe('PlacesWorkflow (pglite)', () => {
	let harness: PgliteTestingModule;
	let places: PlacesWorkflow;
	let city: City;
	const apify = new FakePlacesApify();
	const durable = fakeDurable(() => [places], 'op-1');

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				PlacesWorkflow,
				VenueScrapeService,
				VenueService,
				CityService,
				{ provide: ApifyService, useValue: apify },
				{ provide: DurableWorkflowsService, useValue: durable },
			],
		});
		places = harness.moduleRef.get(PlacesWorkflow);
		entityManagerManager.setEntityManager(harness.orm.em);
		city = await cityFactory.create({ lat: 52.52, lng: 13.405 });
	});

	afterAll(async () => {
		await harness.stop();
	});

	beforeEach(() => {
		apify.reset();
	});

	it("a grid search: the city's grid, the cap floored, the operation as the run's owner, every place of the city's list saved", async () => {
		apify.answerSearches([
			place('restaurant', 'r1', 'Ristorante Uno', 1),
			place('restaurant', 'r2', 'Cleaners', 2, { categoryName: 'Cleaners' }),
			place('bar', 'b1', 'Bar Eins', 1),
		]);
		const result = await places.call({
			cityId: city.id,
			search: { mode: 'grid', queries: ['restaurant', 'bar'], perQuery: 10 },
			maxCostUsd: 0.1,
			purpose: 'google-places Berlin: restaurant, bar',
			save: { source: VenueScrapeSourceEnum.CITY, newPlaces: 'all', openings: false },
		});

		expect(apify.calls).toHaveLength(1);
		const [{ actor, input, options }] = apify.calls;
		expect(actor).toBe('compass/crawler-google-places');
		expect(input).toEqual({
			searchStringsArray: ['restaurant', 'bar'],
			locationQuery: 'Berlin, Germany',
			maxCrawledPlacesPerSearch: 10,
			language: 'en',
			maxReviews: 0,
			maxImages: 0,
			maxQuestions: 0,
		});
		// The actor refuses a cap under $0.50; a list run takes the actor's own memory
		expect(options).toEqual({
			maxCostUsd: 0.5,
			purpose: 'google-places Berlin: restaurant, bar',
			ownerWorkflowId: 'op-1',
		});
		expect(durable.started[0].options).toEqual({
			attributes: { cityId: city.id, purpose: 'google-places Berlin: restaurant, bar' },
		});

		// The city's own list keeps every place, a cleaner too
		expect(result).toMatchObject({
			recordId: 'run-1',
			found: 3,
			saved: 3,
			byQuery: { restaurant: ['r1', 'r2'], bar: ['b1'] },
		});
		expect(Object.keys(result.venueIds).sort()).toEqual(['b1', 'r1', 'r2']);
		const em = harness.orm.em.fork();
		expect(await em.count(Venue, { city: city.id })).toBe(3);
		expect(await em.count(VenueSnapshot, {})).toBe(3);
		// The first list is the baseline: nothing opened
		expect(await em.count(VenueStatusChange, {})).toBe(0);

		// The next list records a new place with few reviews as an opening, a known place not
		apify.answerSearches([
			place('restaurant', 'r1', 'Ristorante Uno', 1),
			place('restaurant', 'r3', 'Neu Eröffnet', 2),
		]);
		await places.call({
			cityId: city.id,
			search: { mode: 'grid', queries: ['restaurant'], perQuery: 10 },
			maxCostUsd: 1,
			purpose: 'list again',
			save: { source: VenueScrapeSourceEnum.CITY, newPlaces: 'all', openings: true },
		});
		const changes = await em.find(VenueStatusChange, {}, { populate: ['venue'] });
		expect(changes.map(c => [c.venue.placeId, c.kind, c.source])).toEqual([
			['r3', VenueStatusChangeKindEnum.OPENED, VenueScrapeSourceEnum.CITY],
		]);
	});

	it('a typed search saves a known venue and a new food place in the city, leaves the rest out, and lists them all in order', async () => {
		apify.answerSearches([
			// Out of order, as a dataset can be: `rank` is what counts
			place('Facil', 'facil-potsdam', 'Facil Potsdam', 3, { city: 'Potsdam' }),
			place('Facil', 'facil-clean', 'Facil Clean', 2, { categoryName: 'Cleaners' }),
			place('Facil', 'facil', 'Restaurant Facil', 1),
			place('Facil', 'r1', 'Ristorante Uno', 4, { totalScore: 4.9 }),
		]);
		const result = await places.call({
			cityId: city.id,
			search: { mode: 'typed', queries: ['Facil'], perQuery: 4 },
			maxCostUsd: 2,
			purpose: 'lookup',
			save: { source: VenueScrapeSourceEnum.LOOKUP, newPlaces: 'food-in-city' },
		});
		expect(apify.calls[0].input).toMatchObject({
			searchStringsArray: ['Facil'],
			maxCrawledPlacesPerSearch: 4,
		});
		expect(apify.calls[0].input.locationQuery).toBeUndefined();
		expect(apify.calls[0].options.maxCostUsd).toBe(2);
		expect(result).toMatchObject({
			found: 4,
			saved: 2,
			byQuery: { Facil: ['facil', 'facil-clean', 'facil-potsdam', 'r1'] },
		});
		expect(Object.keys(result.venueIds).sort()).toEqual(['facil', 'r1']);
		const em = harness.orm.em.fork();
		expect(await em.count(Venue, { placeId: { $in: ['facil-clean', 'facil-potsdam'] } })).toBe(
			0,
		);
		expect((await em.findOneOrFail(Venue, { placeId: 'r1' })).rating).toBe(4.9);
		// A search finds old places: never an opening
		expect(await em.count(VenueStatusChange, { source: VenueScrapeSourceEnum.LOOKUP })).toBe(0);
	});

	it("a map search: one search from a map of the city, its own memory, the one query's places in Google's order", async () => {
		apify.answer = () => [
			place('ignored', 'p2', 'Second', 2),
			place('ignored', 'p1', 'First', 1),
		];
		const result = await places.call({
			cityId: city.id,
			search: { mode: 'map', query: 'pasta Mitte Berlin', perQuery: 10 },
			maxCostUsd: 0.5,
			purpose: 'dish search',
			save: { source: VenueScrapeSourceEnum.LOOKUP, newPlaces: 'food-in-city' },
		});
		expect(apify.calls[0].input).toMatchObject({
			startUrls: [
				{
					url: 'https://www.google.com/maps/search/pasta+Mitte+Berlin/@52.52,13.405,12z?hl=en',
				},
			],
			maxCrawledPlacesPerSearch: 10,
		});
		expect(apify.calls[0].input.searchStringsArray).toBeUndefined();
		expect(apify.calls[0].options).toMatchObject({ maxCostUsd: 0.5, memoryMbytes: 2048 });
		expect(result.byQuery).toEqual({ 'pasta Mitte Berlin': ['p1', 'p2'] });
	});

	it('detail pages update known places only, add none, and answer no query', async () => {
		const em = harness.orm.em.fork();
		em.create(Venue, { city, placeId: DETAIL_ITEM.placeId!, name: 'Pinoli' });
		await em.flush();
		apify.answer = () => [
			DETAIL_ITEM,
			{ placeId: 'ChIJunknown', title: 'Unknown', popularTimesHistogram: {} },
		];
		const result = await places.call({
			cityId: null,
			search: { mode: 'details', placeIds: [DETAIL_ITEM.placeId!, 'ChIJunknown'] },
			maxCostUsd: 2,
			purpose: 'details',
			save: { source: VenueScrapeSourceEnum.DETAILS, newPlaces: 'none' },
		});
		expect(apify.calls[0].input).toMatchObject({
			placeIds: [DETAIL_ITEM.placeId, 'ChIJunknown'],
			scrapePlaceDetailPage: true,
			scrapeOrderOnline: true,
			maxQuestions: 0,
		});
		expect(durable.started.at(-1)!.options).toEqual({ attributes: { purpose: 'details' } });
		expect(result).toMatchObject({ found: 2, saved: 1, byQuery: {} });
		expect(Object.keys(result.venueIds)).toEqual([DETAIL_ITEM.placeId]);
		expect(await em.count(Venue, { placeId: 'ChIJunknown' })).toBe(0);
		em.clear();
		const pinoli = await em.findOneOrFail(Venue, { placeId: DETAIL_ITEM.placeId! });
		expect(pinoli.details?.popularTimesHistogram?.Fr).toHaveLength(6);
	});

	it('an empty query list means nothing came back', async () => {
		apify.answer = () => [];
		const result = await places.call({
			cityId: city.id,
			search: { mode: 'grid', queries: ['nothing'], perQuery: 3 },
			maxCostUsd: 1,
			purpose: 'empty',
			save: { source: VenueScrapeSourceEnum.LOOKUP, newPlaces: 'food-in-city' },
		});
		expect(result).toMatchObject({
			found: 0,
			saved: 0,
			byQuery: { nothing: [] },
			venueIds: {},
		});
	});
});
