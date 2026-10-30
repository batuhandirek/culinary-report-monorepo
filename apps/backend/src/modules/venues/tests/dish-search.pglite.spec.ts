import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { ApifyService } from 'src/modules/apify/services/apify.service.js';
import { City } from 'src/modules/cities/entities/city.entity.js';
import { cityFactory } from 'src/modules/cities/tests/factories/city.factory.js';
import { Topic } from 'src/modules/topics/entities/topic.entity.js';
import { VenueTopic } from 'src/modules/topics/entities/venue-topic.entity.js';
import { TopicService } from 'src/modules/topics/services/topic.service.js';
import { VenueTopicService } from 'src/modules/topics/services/venue-topic.service.js';
import { seedTopics } from 'src/modules/topics/tests/factories/topic.factory.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { DishSearchRank } from '../entities/dish-search-rank.entity.js';
import { Venue } from '../entities/venue.entity.js';
import { VenueSnapshot } from '../entities/venue-snapshot.entity.js';
import { VenueStatusChange } from '../entities/venue-status-change.entity.js';
import { DishSearchService } from '../services/dish-search.service.js';
import { VenueService } from '../services/venue.service.js';
import { VenueScrapeService } from '../services/venue-scrape.service.js';
import type { SearchPlaceItem } from '../util/search-ranks.js';

/**
 * A `compass/crawler-google-places` search result as its dataset holds it: every item repeats
 * the search it came from in `searchString` and its place in `rank`.
 */
const result = (
	searchString: string,
	rank: number,
	placeId = `${searchString}-${rank}`,
	title = `Place ${rank}`,
	extra: Partial<SearchPlaceItem> = {},
): SearchPlaceItem => ({
	searchString,
	rank,
	placeId,
	title,
	categoryName: 'Italian restaurant',
	city: 'Berlin',
	neighborhood: 'Mitte',
	street: `Torstraße ${rank}`,
	totalScore: 4.4,
	reviewsCount: 200 + rank,
	permanentlyClosed: false,
	temporarilyClosed: false,
	...extra,
});
/** A search's first `n` places */
const results = (
	searchString: string,
	n: number,
	at: (rank: number) => SearchPlaceItem | null = () => null,
) => Array.from({ length: n }, (_, i) => at(i + 1) ?? result(searchString, i + 1));

describe('DishSearchService (pglite)', () => {
	let harness: PgliteTestingModule;
	let service: DishSearchService;
	let city: City;
	let trattoria: Venue;
	const runActor = jest.fn<(...args: unknown[]) => Promise<SearchPlaceItem[]>>();

	// The test city's districts, in its order
	const DISTRICTS = ['Neukölln', 'Friedrichshain-Kreuzberg', 'Mitte'];

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				DishSearchService,
				VenueScrapeService,
				VenueService,
				TopicService,
				VenueTopicService,
				{ provide: ApifyService, useValue: { runActor } },
			],
		});
		service = harness.moduleRef.get(DishSearchService);
		entityManagerManager.setEntityManager(harness.orm.em);

		const em = harness.orm.em;
		// Two dishes and their cuisine parent (Italian), which is no dish and never searched
		seedTopics(em, ['pasta', 'pizza']);
		city = await cityFactory.create();
		trattoria = em.create(Venue, {
			city,
			placeId: 'trattoria',
			name: 'Trattoria Uno',
			category: 'Italian restaurant',
			district: 'Mitte',
		});
		await em.flush();
	});

	afterAll(async () => {
		await harness.stop();
	});

	beforeEach(() => {
		runActor.mockReset();
	});

	/** An instant on a Berlin day, mid-morning */
	const on = (day: string) => new Date(`${day}T10:00:00Z`);

	it("snapshots every dish in every district, each search's top ten in Google's order, dated the city's day", async () => {
		const pastaMitte = 'pasta Mitte Berlin';
		runActor.mockResolvedValueOnce([
			// Out of order and twenty deep, as a dataset can be: `rank` is what counts, ten are kept
			...results(pastaMitte, 20, rank =>
				rank === 3 ? result(pastaMitte, rank, 'trattoria', 'Trattoria Uno')
				: rank === 9 ?
					result(pastaMitte, rank, 'shop', 'Pasta Markt', {
						categoryName: 'Grocery store',
					})
				: rank === 10 ?
					result(pastaMitte, rank, 'potsdam', 'Pasta Potsdam', { city: 'Potsdam' })
				:	null,
			).reverse(),
			...results('pasta Neukölln Berlin', 10, rank =>
				// The same place on two searches
				rank === 1 ?
					result('pasta Neukölln Berlin', rank, 'trattoria', 'Trattoria Uno')
				:	null,
			),
			...results('pasta Friedrichshain-Kreuzberg Berlin', 4),
			...results('pizza Neukölln Berlin', 10),
			// "pizza Friedrichshain-Kreuzberg" and "pizza Mitte" came back empty (cut by the cap)
		]);

		const summary = await service.sweep(city, 25, on('2026-10-25'));
		expect(summary).toEqual({
			searchedOn: '2026-10-25',
			dishes: 2,
			districts: 3,
			searches: 6,
			returned: 4,
			places: 34,
			linked: 32,
			notCovered: 0,
		});
		const [actor, input, options] = runActor.mock.calls[0] as [
			string,
			Record<string, unknown>,
			Record<string, unknown>,
		];
		expect(actor).toBe('compass/crawler-google-places');
		expect(input).toMatchObject({
			searchStringsArray: [
				...DISTRICTS.map(d => `pasta ${d} Berlin`),
				...DISTRICTS.map(d => `pizza ${d} Berlin`),
			],
			maxCrawledPlacesPerSearch: 10,
		});
		expect(input.locationQuery).toBeUndefined();
		expect(options).toMatchObject({ maxCostUsd: 25 });

		const em = harness.orm.em.fork();
		const mitte = await em.find(
			DishSearchRank,
			{ city: city.id, searchedOn: '2026-10-25', topic: { key: 'pasta' }, district: 'Mitte' },
			{ orderBy: { rank: 'asc' } },
		);
		expect(mitte.map(r => r.rank)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
		expect(mitte[2]).toMatchObject({
			placeId: 'trattoria',
			name: 'Trattoria Uno',
			rating: 4.4,
			reviewsCount: 203,
			venue: { id: trattoria.id },
			// The day split out for SQL: a Sunday, the 298th day, ISO week 43
			searchedOn: '2026-10-25',
			year: 2026,
			month: '2026-10',
			monthOfYear: 10,
			dayOfMonth: 25,
			dayOfYear: 298,
			isoYear: 2026,
			isoWeek: 43,
			weekday: 7,
		});
		// Places we don't keep are still on the list, without a venue
		expect(mitte.slice(8).map(r => [r.name, r.venue ?? null])).toEqual([
			['Pasta Markt', null],
			['Pasta Potsdam', null],
		]);
		expect(await em.count(DishSearchRank, { city: city.id, topic: { key: 'pizza' } })).toBe(10);
	});

	it("saves the found places as the city's venues, with the day's rating, never as openings", async () => {
		const em = harness.orm.em.fork();
		const found = await em.findOneOrFail(Venue, { placeId: 'pasta Mitte Berlin-1' });
		expect(found).toMatchObject({ name: 'Place 1', reviewsCount: 201, city: { id: city.id } });
		expect(await em.count(Venue, { placeId: { $in: ['shop', 'potsdam'] } })).toBe(0);
		// One snapshot a venue a day, however many searches found it
		const today = new Date().toISOString().slice(0, 10);
		expect(
			await em.find(
				VenueSnapshot,
				{ venue: trattoria.id },
				{ fields: ['snapshotDate', 'rating'] },
			),
		).toEqual([expect.objectContaining({ snapshotDate: today, rating: 4.4 })]);
		expect(await em.count(VenueSnapshot, { venue: found.id })).toBe(1);
		expect(await em.count(VenueStatusChange, {})).toBe(0);
	});

	it('searches the dishes most open venues serve first, as many as the budget covers in every district', async () => {
		const em = harness.orm.em;
		const topic = (key: string) => em.findOneOrFail(Topic, { key });
		const [pasta, pizza] = [await topic('pasta'), await topic('pizza')];
		const tag = (placeId: string, food: Topic, closed = false) =>
			em.create(VenueTopic, {
				venue: em.create(Venue, {
					city,
					placeId,
					name: placeId,
					category: 'Restaurant',
					closed,
				}),
				topic: food,
				computed: true,
				source: 'category',
				score: 1,
			});
		tag('pizza-1', pizza);
		tag('pizza-2', pizza);
		tag('pasta-1', pasta);
		// Closed places serve nothing
		['closed-1', 'closed-2', 'closed-3'].forEach(id => tag(id, pasta, true));
		await em.flush();

		runActor.mockResolvedValueOnce([]);
		// $0.0042 × 10 × 3 districts = $0.126 a dish
		const summary = await service.sweep(city, 0.2, on('2026-10-26'));
		expect(summary).toMatchObject({ dishes: 1, searches: 3, returned: 0, notCovered: 1 });
		expect(
			(runActor.mock.calls[0][1] as { searchStringsArray: string[] }).searchStringsArray,
		).toEqual(DISTRICTS.map(d => `pizza ${d} Berlin`));
		// Too little for one dish: no run
		expect(await service.sweep(city, 0.1, on('2026-10-26'))).toMatchObject({
			dishes: 0,
			searches: 0,
		});
		expect(runActor).toHaveBeenCalledTimes(1);
		// A search that came back empty stores nothing for that day
		expect(await em.count(DishSearchRank, { searchedOn: '2026-10-26' })).toBe(0);
	});

	it("replaces the searches a rerun the same day got back and keeps the ones it didn't", async () => {
		runActor.mockResolvedValueOnce([
			result('pasta Mitte Berlin', 1, 'trattoria', 'Trattoria Uno'),
		]);
		await service.sweep(city, 25, new Date('2026-10-25T19:00:00Z'));
		const em = harness.orm.em.fork();
		const rows = await em.find(DishSearchRank, {
			city: city.id,
			searchedOn: '2026-10-25',
			topic: { key: 'pasta' },
		});
		expect(rows.filter(r => r.district === 'Mitte').map(r => [r.rank, r.placeId])).toEqual([
			[1, 'trattoria'],
		]);
		expect(rows.filter(r => r.district === 'Neukölln')).toHaveLength(10);
	});

	it("reads a dish's districts in a snapshot with each place's rank in the snapshot before", async () => {
		const em = harness.orm.em;
		await em.nativeDelete(DishSearchRank, {});
		const pasta = 'pasta Mitte Berlin';
		runActor.mockResolvedValueOnce([
			result(pasta, 1, 'a', 'Alfredo'),
			result(pasta, 2, 'trattoria', 'Trattoria Uno'),
			result('pasta Neukölln Berlin', 1, 'n', 'Nonna'),
		]);
		await service.sweep(city, 25, on('2026-10-01'));
		runActor.mockResolvedValueOnce([
			result(pasta, 1, 'trattoria', 'Trattoria Uno'),
			result(pasta, 2, 'b', 'Bellini'),
			result('pasta Friedrichshain-Kreuzberg Berlin', 1, 'k', 'Kreuzpasta'),
		]);
		await service.sweep(city, 25, on('2026-10-25'));

		// The newest by default, against the one before, however far apart
		const table = await service.forTopic(city.id, 'pasta');
		expect(table).toMatchObject({
			snapshots: ['2026-10-25', '2026-10-01'],
			searchedOn: '2026-10-25',
			previousOn: '2026-10-01',
		});
		// Alphabetical; Neukölln was searched on the 1st only
		expect(table.districts.map(d => [d.district, d.previousSearched])).toEqual([
			['Friedrichshain-Kreuzberg', false],
			['Mitte', true],
		]);
		expect(
			table.districts[1].places.map(p => [p.name, p.rank, p.previousRank, p.venueId]),
		).toEqual([
			['Trattoria Uno', 1, 2, trattoria.id],
			['Bellini', 2, undefined, expect.any(String)],
		]);

		// The first snapshot has nothing before it
		const first = await service.forTopic(city.id, 'pasta', '2026-10-01');
		expect(first.previousOn).toBeUndefined();
		expect(first.districts.map(d => [d.district, d.previousSearched])).toEqual([
			['Mitte', false],
			['Neukölln', false],
		]);
		expect((await service.forTopic(city.id, 'pasta', '2026-09-30')).districts).toEqual([]);
		expect(await service.forTopic(city.id, 'pizza')).toEqual({ snapshots: [], districts: [] });
	});

	it("lists a venue's dish searches by snapshot, telling a search it missed from one that didn't run", async () => {
		const searches = await service.forVenue(trattoria.id);
		expect(searches.snapshots).toEqual(['2026-10-25', '2026-10-01']);
		expect(searches.searches).toEqual([
			{
				topicKey: 'pasta',
				topicLabel: 'Pasta',
				district: 'Mitte',
				ranks: [
					{ searchedOn: '2026-10-25', rank: 1 },
					{ searchedOn: '2026-10-01', rank: 2 },
				],
			},
		]);

		// In the 25th's Neukölln search but not the 1st's, which ran without it
		const em = harness.orm.em;
		runActor.mockResolvedValueOnce([
			result('pasta Neukölln Berlin', 1, 'n', 'Nonna'),
			result('pasta Neukölln Berlin', 2, 'trattoria', 'Trattoria Uno'),
		]);
		await service.sweep(city, 25, on('2026-10-25'));
		em.clear();
		const again = await service.forVenue(trattoria.id);
		expect(again.searches.map(s => [s.district, s.ranks])).toEqual([
			[
				'Mitte',
				[
					{ searchedOn: '2026-10-25', rank: 1 },
					{ searchedOn: '2026-10-01', rank: 2 },
				],
			],
			['Neukölln', [{ searchedOn: '2026-10-25', rank: 2 }, { searchedOn: '2026-10-01' }]],
		]);
		// A venue on no list
		const other = await em.findOneOrFail(Venue, { placeId: 'k' });
		await em.nativeDelete(DishSearchRank, { venue: other.id });
		expect((await service.forVenue(other.id)).searches).toEqual([]);
	});

	it("gives each city's newest snapshot for the cron", async () => {
		const other = await cityFactory.create();
		expect(await service.newestSnapshots([city.id, other.id])).toEqual(
			new Map([[city.id, '2026-10-25']]),
		);
		expect(await service.newestSnapshots([])).toEqual(new Map());
	});
});
