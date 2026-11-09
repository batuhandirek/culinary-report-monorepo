import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';

import type { GooglePlaceItem } from 'src/modules/apify/actors/google-places.actor.js';
import { ApifyService } from 'src/modules/apify/services/apify.service.js';
import { City } from 'src/modules/cities/entities/city.entity.js';
import { cityFactory } from 'src/modules/cities/tests/factories/city.factory.js';
import { PgBossService } from 'src/modules/pgboss/pgboss.service.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { VenueScrapeSourceEnum } from '../constants/venue-status.constant.js';
import { Venue } from '../entities/venue.entity.js';
import { VenueLookup } from '../entities/venue-lookup.entity.js';
import { VenueStatusChange } from '../entities/venue-status-change.entity.js';
import { BrandAutoMergeJob } from '../jobs/brand-auto-merge.job.js';
import { VenueService } from '../services/venue.service.js';
import { lookupStale, VenueScrapeService } from '../services/venue-scrape.service.js';

import { DETAIL_ITEM, LIST_ITEM } from './fixtures/google-place-items.js';

describe('lookupStale', () => {
	it('is stale three months after the last lookup', () => {
		expect(lookupStale(new Date('2026-07-02'), new Date('2026-09-02'))).toBe(false);
		expect(lookupStale(new Date('2026-07-02'), new Date('2026-10-02'))).toBe(true);
	});
});

/**
 * The venue side of a places run: the one save path and its three rules, and the lookups a run
 * plans and records.
 */
describe('VenueScrapeService (pglite)', () => {
	let harness: PgliteTestingModule;
	let service: VenueScrapeService;
	let city: City;
	const storedItems = jest.fn(async (..._args: unknown[]): Promise<unknown[]> => []);
	const sendJob = jest.fn(async (..._args: unknown[]) => undefined);

	const place = (searchString: string, placeId: string, title: string): GooglePlaceItem => ({
		searchString,
		placeId,
		title,
		categoryName: 'Restaurant',
		city: city.name,
		street: 'Torstraße 1',
		totalScore: 4.4,
		reviewsCount: 12,
		permanentlyClosed: false,
		url: `https://www.google.com/maps/place/?q=place_id:${placeId}`,
	});

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				VenueScrapeService,
				VenueService,
				{ provide: ApifyService, useValue: { storedItems } },
				{ provide: PgBossService, useValue: { sendJob } },
			],
		});
		service = harness.moduleRef.get(VenueScrapeService);
		entityManagerManager.setEntityManager(harness.orm.em);
		city = await cityFactory.create();
	});

	afterAll(async () => {
		await harness.stop();
	});

	beforeEach(() => {
		sendJob.mockClear();
		storedItems.mockClear();
	});

	describe('lookups', () => {
		it('plans each name once, found or not, and records the lookups', async () => {
			const july = new Date('2026-07-02T06:00:00Z');
			const { queries } = await service.planLookups(
				city,
				['Mezame Matcha', 'Tacos Lupita'],
				july,
			);
			expect(queries).toEqual(['Mezame Matcha', 'Tacos Lupita']);

			expect(
				await service.recordLookups(city, queries, { 'Mezame Matcha': ['mezame'] }, july),
			).toEqual({ lookedUp: 2, retried: 0 });
			const lookups = await harness.orm.em.find(
				VenueLookup,
				{ city },
				{ orderBy: { query: 'asc' } },
			);
			expect(lookups.map(l => [l.results, l.lookedUpAt])).toEqual([
				[1, july],
				[0, july],
			]);
		});

		it('does not plan a name searched within three months', async () => {
			expect(
				await service.planLookups(
					city,
					['Tacos Lupita', 'Mezame Matcha'],
					new Date('2026-09-02T06:00:00Z'),
				),
			).toEqual({ queries: [] });
		});

		it('plans a stale name again and updates its row, never doubling it', async () => {
			const november = new Date('2026-11-02T06:00:00Z');
			const { queries } = await service.planLookups(
				city,
				['Tacos Lupita', 'Bao Bar'],
				november,
			);
			expect(queries).toEqual(['Tacos Lupita', 'Bao Bar']);
			expect(
				await service.recordLookups(
					city,
					queries,
					{ 'Tacos Lupita': ['lupita'] },
					november,
				),
			).toEqual({ lookedUp: 2, retried: 1 });
			harness.orm.em.clear();
			const lookups = await harness.orm.em.find(
				VenueLookup,
				{ city },
				{ orderBy: { query: 'asc' } },
			);
			// Three names, three rows: the retried one is updated, not doubled
			expect(lookups).toHaveLength(3);
			expect(
				lookups.find(l => l.results === 1 && l.lookedUpAt.getTime() === november.getTime()),
			).toBeDefined();
		});

		it('caps the plan after dropping the names searched lately, so a new name further down is reached', async () => {
			// Tacos Lupita and Bao Bar were searched in November: they take none of the two places
			expect(
				await service.planLookups(
					city,
					['Tacos Lupita', 'Bao Bar', 'Heller Kaffees', 'Kaffee Perry', 'Third Name'],
					new Date('2026-12-02T06:00:00Z'),
					2,
				),
			).toEqual({ queries: ['Heller Kaffees', 'Kaffee Perry'] });
		});
	});

	describe('savePlaces', () => {
		it('a search: a known venue updated, a new food place in the city added, a cleaner or a namesake elsewhere left out, never an opening', async () => {
			const em = harness.orm.em;
			em.create(Venue, { city, placeId: 'known', name: 'Known Before' });
			await em.flush();

			const result = await service.savePlaces(
				[
					{ ...place('Known', 'known', 'Known Now'), totalScore: 4.9 },
					place('Facil', 'facil', 'Restaurant Facil'),
					{ ...place('Facil', 'facil-clean', 'Facil Clean'), categoryName: 'Cleaners' },
					{ ...place('Facil', 'facil-potsdam', 'Facil Potsdam'), city: 'Potsdam' },
				],
				{ city, source: VenueScrapeSourceEnum.LOOKUP, newPlaces: 'food-in-city' },
			);
			expect(result.saved).toBe(2);
			expect(Object.keys(result.venueIds).sort()).toEqual(['facil', 'known']);
			em.clear();
			expect(
				await em.count(Venue, { placeId: { $in: ['facil-clean', 'facil-potsdam'] } }),
			).toBe(0);
			expect(await em.findOneOrFail(Venue, { placeId: 'known' })).toMatchObject({
				name: 'Known Now',
				rating: 4.9,
			});
			expect(await em.count(VenueStatusChange, {})).toBe(0);
			// Every save queues the city's brand merge
			expect(sendJob).toHaveBeenCalledWith(
				BrandAutoMergeJob.jobName,
				new BrandAutoMergeJob({ cityId: city.id }),
				{ singletonKey: city.id },
			);
		});

		it("the city's own list keeps every place, and detail pages add none", async () => {
			const all = await service.savePlaces(
				[
					{ ...place('cafe', 'facil-clean', 'Facil Clean'), categoryName: 'Cleaners' },
					{ ...place('cafe', 'facil-potsdam', 'Facil Potsdam'), city: 'Potsdam' },
				],
				{ city, source: VenueScrapeSourceEnum.CITY, newPlaces: 'all' },
			);
			expect(all.saved).toBe(2);
			const none = await service.savePlaces(
				[
					{ ...place('', 'known', 'Known Now'), totalScore: 3.1 },
					place('', 'brand-new', 'Brand New'),
				],
				{ source: VenueScrapeSourceEnum.DETAILS, newPlaces: 'none' },
			);
			expect(none).toEqual({
				saved: 1,
				venueIds: expect.objectContaining({ known: expect.any(String) }),
			});
			const em = harness.orm.em.fork();
			expect(await em.count(Venue, { placeId: 'brand-new' })).toBe(0);
			expect((await em.findOneOrFail(Venue, { placeId: 'known' })).rating).toBe(3.1);
		});
	});

	it('stamps the city once its list is taken', async () => {
		await service.markCityScraped(city, new Date('2026-10-02T06:00:00Z'));
		expect((await harness.orm.em.fork().findOneOrFail(City, city.id)).venuesScrapedAt).toEqual(
			new Date('2026-10-02T06:00:00Z'),
		);
	});

	it("counts a detail run's places with popular times from its stored items", async () => {
		storedItems.mockResolvedValueOnce([
			DETAIL_ITEM,
			LIST_ITEM,
			{ placeId: 'x', popularTimesHistogram: {} },
		]);
		expect(await service.detailsSummary('run-1')).toEqual({ withPopularTimes: 1 });
		expect(storedItems).toHaveBeenCalledWith('run-1');
	});
});
