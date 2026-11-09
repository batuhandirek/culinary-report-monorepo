import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';

import type { GooglePlaceItem } from 'src/modules/apify/actors/google-places.actor.js';
import { ApifyService } from 'src/modules/apify/services/apify.service.js';
import type { City } from 'src/modules/cities/entities/city.entity.js';
import { CityService } from 'src/modules/cities/services/city.service.js';
import { cityFactory } from 'src/modules/cities/tests/factories/city.factory.js';
import { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';
import { fakeDurable } from 'src/modules/durable-workflows/tests/factories/durable.mock.js';
import { TopicService } from 'src/modules/topics/services/topic.service.js';
import { VenueTopicService } from 'src/modules/topics/services/venue-topic.service.js';
import { seedTopics } from 'src/modules/topics/tests/factories/topic.factory.js';
import { DishSearchRank } from 'src/modules/venues/entities/dish-search-rank.entity.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { DishSearchService } from 'src/modules/venues/services/dish-search.service.js';
import { VenueService } from 'src/modules/venues/services/venue.service.js';
import { VenueScrapeService } from 'src/modules/venues/services/venue-scrape.service.js';
import { calendarDay } from 'src/modules/venues/util/week.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { FakePlacesApify, searchTextOf } from '../../atoms/places/tests/factories/places.mock.js';
import { PlacesWorkflow } from '../../atoms/places/workflows/places.workflow.js';
import { DishSearchesWorkflow } from '../workflows/dish-searches.workflow.js';

const result = (
	searchString: string,
	rank: number,
	placeId = `${searchString}-${rank}`,
	title = `Place ${rank}`,
): GooglePlaceItem => ({
	searchString,
	rank,
	placeId,
	title,
	categoryName: 'Italian restaurant',
	city: 'Berlin',
	street: `Torstraße ${rank}`,
	totalScore: 4.4,
	reviewsCount: 200 + rank,
});

/**
 * The day's sweep as a workflow, the facade faked to run a started child inline: every search a
 * `places.run` of its own, started in the plan's order, each a map search at the actor's lowest
 * cap in its own memory and tagged with the operation as its owner; a failed search left out of
 * the snapshot, the rest stored.
 */
describe('DishSearchesWorkflow (pglite)', () => {
	let harness: PgliteTestingModule;
	let workflow: DishSearchesWorkflow;
	let places: PlacesWorkflow;
	let city: City;
	const apify = new FakePlacesApify();
	const durable = fakeDurable(() => [places], 'dish-searches.day-city-today');
	const DISTRICTS = ['Neukölln', 'Friedrichshain-Kreuzberg', 'Mitte'];

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				DishSearchesWorkflow,
				PlacesWorkflow,
				DishSearchService,
				VenueScrapeService,
				VenueService,
				CityService,
				TopicService,
				VenueTopicService,
				{ provide: ApifyService, useValue: apify },
				{ provide: DurableWorkflowsService, useValue: durable },
			],
		});
		workflow = harness.moduleRef.get(DishSearchesWorkflow);
		places = harness.moduleRef.get(PlacesWorkflow);
		entityManagerManager.setEntityManager(harness.orm.em);
		const em = harness.orm.em;
		seedTopics(em, ['pasta', 'pizza']);
		city = await cityFactory.create({ lat: 52.52, lng: 13.405 });
		em.create(Venue, {
			city,
			placeId: 'trattoria',
			name: 'Trattoria Uno',
			category: 'Italian restaurant',
		});
		await em.flush();
	});

	afterAll(async () => {
		await harness.stop();
	});

	beforeEach(() => {
		apify.reset();
		durable.started.length = 0;
	});

	it('runs every search as a child of its own, in order, from a map of the city, and stores what came back', async () => {
		const today = calendarDay(new Date(), 'Europe/Berlin').date;
		const pastaMitte = 'pasta Mitte Berlin';
		apify.answerSearches([
			result(pastaMitte, 2),
			result(pastaMitte, 1, 'trattoria', 'Trattoria Uno'),
			result('pizza Neukölln Berlin', 1),
		]);

		const summary = await workflow.day(city.id, today);

		expect(summary).toMatchObject({
			searchedOn: today,
			dishes: 3,
			searches: 9,
			returned: 2,
			places: 3,
			linked: 3,
			failed: 0,
		});
		expect(apify.calls.map(c => searchTextOf(c.input))).toEqual([
			...DISTRICTS.map(d => `italian food ${d} Berlin`),
			...DISTRICTS.map(d => `pasta ${d} Berlin`),
			...DISTRICTS.map(d => `pizza ${d} Berlin`),
		]);
		const { input, options } = apify.calls[5];
		// On a map of the city, as a guest there searches: no map grid, Google's own order
		expect(input).toMatchObject({
			startUrls: [
				{
					url: 'https://www.google.com/maps/search/pasta+Mitte+Berlin/@52.52,13.405,12z?hl=en',
				},
			],
			maxCrawledPlacesPerSearch: 10,
		});
		expect(input.searchStringsArray).toBeUndefined();
		expect(input.locationQuery).toBeUndefined();
		// The actor's lowest cap, a search's own memory, the day's run as the owner
		expect(options).toEqual({
			maxCostUsd: 0.5,
			memoryMbytes: 2048,
			purpose: `google-places dish searches Berlin ${today}: ${pastaMitte}`,
			ownerWorkflowId: 'dish-searches.day-city-today',
		});
		// Every child started before any was awaited, each tagged for the admin
		expect(durable.started).toHaveLength(9);
		expect(durable.started[5].options).toEqual({
			attributes: {
				cityId: city.id,
				purpose: `google-places dish searches Berlin ${today}: ${pastaMitte}`,
			},
		});

		const em = harness.orm.em.fork();
		const mitte = await em.find(
			DishSearchRank,
			{ city: city.id, searchedOn: today, topic: { key: 'pasta' }, district: 'Mitte' },
			{ orderBy: { rank: 'asc' } },
		);
		expect(mitte.map(r => [r.rank, r.placeId, r.venue ? 'venue' : null])).toEqual([
			[1, 'trattoria', 'venue'],
			[2, `${pastaMitte}-2`, 'venue'],
		]);
		expect(await em.count(Venue, { placeId: `${pastaMitte}-2` })).toBe(1);
	});

	it('leaves a failed search out of the snapshot and keeps the rest', async () => {
		const today = calendarDay(new Date(), 'Europe/Berlin').date;
		// A fresh day: a rerun keeps a failed search's earlier rows, so the day's rows go first
		await harness.orm.em.fork().nativeDelete(DishSearchRank, {});
		apify.answer = input => {
			const text = searchTextOf(input);
			if (text === 'pasta Mitte Berlin') throw new Error('Run failed');
			return [result(text, 1, `one-${text}`)];
		};
		const summary = await workflow.day(city.id, today);
		expect(summary).toMatchObject({ searches: 9, returned: 8, failed: 1 });
		const em = harness.orm.em.fork();
		expect(
			await em.count(DishSearchRank, {
				searchedOn: today,
				district: 'Mitte',
				topic: { key: 'pasta' },
			}),
		).toBe(0);
		expect(await em.count(DishSearchRank, { searchedOn: today })).toBe(8);
	});
});
