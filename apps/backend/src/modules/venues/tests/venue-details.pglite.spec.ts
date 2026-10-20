import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';

import { ApifyService } from 'src/modules/apify/services/apify.service.js';
import type { City } from 'src/modules/cities/entities/city.entity.js';
import { cityFactory } from 'src/modules/cities/tests/factories/city.factory.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { Venue } from '../entities/venue.entity.js';
import { VenueScrapeService } from '../services/venue-scrape.service.js';
import { VenueService } from '../services/venue.service.js';
import { offeredAmenities, venueDetailsFromItem } from '../util/venue-details.js';

import { DETAIL_ITEM, LIST_ITEM } from './fixtures/google-place-items.js';

describe('venueDetailsFromItem', () => {
	it('reads a list item, treating empty placeholders as absent', () => {
		expect(venueDetailsFromItem(LIST_ITEM)).toEqual({
			openingHours: LIST_ITEM.openingHours,
			amenities: {
				Accessibility: {
					'Assistive hearing loop': false,
					'Wheelchair accessible entrance': false,
				},
			},
			reviewsDistribution: LIST_ITEM.reviewsDistribution,
			imagesCount: 667,
			reserveTableUrl: LIST_ITEM.reserveTableUrl,
			temporarilyClosed: false,
		});
	});

	it('reads a detail item: popular times, menu, platforms and similar places', () => {
		const details = venueDetailsFromItem(DETAIL_ITEM);
		expect(Object.keys(details.popularTimesHistogram!)).toEqual(['Mo', 'Th', 'Fr', 'Sa']);
		expect(details).toMatchObject({
			popularTimesLivePercent: 35,
			popularTimesLiveText: 'Usually not too busy',
			menu: 'https://pinoli-restaurant.de/speisekarte',
			orderBy: [{ name: 'Lieferando.de', url: 'https://www.lieferando.de/pinoli' }],
			peopleAlsoSearch: [
				{
					title: 'Trattoria da Rudow',
					category: 'People also search for',
					totalScore: 4.6,
					reviewsCount: 812,
				},
				{
					title: 'Ristorante Il Ponte',
					category: 'People also search for',
					totalScore: 4.4,
				},
			],
		});
		expect(offeredAmenities(details)).toEqual([
			'Outdoor seating',
			'Takeout',
			'Accepts reservations',
			'Credit cards',
			'NFC mobile payments',
			'Wheelchair accessible entrance',
		]);
	});
});

describe('Venue details (pglite)', () => {
	let harness: PgliteTestingModule;
	let venueService: VenueService;
	let scrapeService: VenueScrapeService;
	let city: City;
	const runActor = jest.fn<(...args: unknown[]) => Promise<unknown[]>>();

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				VenueService,
				VenueScrapeService,
				{ provide: ApifyService, useValue: { runActor } },
			],
		});
		venueService = harness.moduleRef.get(VenueService);
		scrapeService = harness.moduleRef.get(VenueScrapeService);
		entityManagerManager.setEntityManager(harness.orm.em);
		city = await cityFactory.create();
	});

	afterAll(async () => {
		await harness.stop();
	});

	it('stores a detail page, and a later list scrape keeps what it lacks', async () => {
		const em = harness.orm.em;
		const detailDay = new Date('2026-10-02T06:00:00Z');
		await venueService.saveGooglePlace(DETAIL_ITEM, detailDay, city);
		await em.flush();
		em.clear();

		let venue = await em.findOneOrFail(Venue, { placeId: LIST_ITEM.placeId! });
		expect(venue.detailsAt).toEqual(detailDay);
		expect(venue.details?.popularTimesHistogram?.Sa).toHaveLength(6);
		expect(venue.details?.amenities?.['Service options']?.['Outdoor seating']).toBe(true);

		// The cheap list scrape: fresh hours and stars, Accessibility only, empty placeholders
		const listDay = new Date('2026-10-20T06:00:00Z');
		await venueService.saveGooglePlace(LIST_ITEM, listDay);
		await em.flush();
		em.clear();

		venue = await em.findOneOrFail(Venue, { placeId: LIST_ITEM.placeId! });
		expect(venue.detailsAt).toEqual(listDay);
		expect(venue.details).toMatchObject({
			reviewsDistribution: LIST_ITEM.reviewsDistribution,
			popularTimesLivePercent: 35,
			menu: 'https://pinoli-restaurant.de/speisekarte',
			orderBy: [{ name: 'Lieferando.de' }],
			peopleAlsoSearch: [{ title: 'Trattoria da Rudow' }, { title: 'Ristorante Il Ponte' }],
		});
		expect(Object.keys(venue.details!.popularTimesHistogram!)).toHaveLength(4);
		// Sections merge one by one: the list scrape's Accessibility replaces only that section
		expect(venue.details!.amenities).toEqual({
			...venueDetailsFromItem(DETAIL_ITEM).amenities,
			Accessibility: {
				'Assistive hearing loop': false,
				'Wheelchair accessible entrance': false,
			},
		});
	});

	it('leaves details and their date untouched when an item carries none', async () => {
		const em = harness.orm.em;
		const before = await em.findOneOrFail(Venue, { placeId: LIST_ITEM.placeId! });
		const { details, detailsAt } = before;
		em.clear();

		await venueService.saveGooglePlace(
			{ placeId: LIST_ITEM.placeId, title: 'Pinoli Restaurant', totalScore: 4.8 },
			new Date('2026-11-01T06:00:00Z'),
		);
		await em.flush();
		em.clear();

		const venue = await em.findOneOrFail(Venue, { placeId: LIST_ITEM.placeId! });
		expect(venue.rating).toBe(4.8);
		expect(venue.details).toEqual(details);
		expect(venue.detailsAt).toEqual(detailsAt);
	});

	it('refreshes detail pages by place id, once each, with no reviews or images', async () => {
		const em = harness.orm.em;
		em.create(Venue, { city: city.id, placeId: 'ChIJother', name: 'Other' });
		await em.flush();
		runActor.mockResolvedValueOnce([
			DETAIL_ITEM,
			{ placeId: 'ChIJother', title: 'Other', popularTimesHistogram: {} },
		]);

		const result = await scrapeService.refreshDetails(
			[LIST_ITEM.placeId!, 'ChIJother', LIST_ITEM.placeId!],
			2,
		);

		expect(result).toEqual({ requested: 2, saved: 2, withPopularTimes: 1 });
		const [actor, input, opts] = runActor.mock.calls[0];
		expect(actor).toBe('compass/crawler-google-places');
		expect(input).toMatchObject({
			placeIds: [LIST_ITEM.placeId, 'ChIJother'],
			scrapePlaceDetailPage: true,
			scrapeOrderOnline: true,
			maxReviews: 0,
			maxImages: 0,
		});
		expect(opts).toMatchObject({ maxCostUsd: 2 });
		em.clear();
		const venue = await em.findOneOrFail(Venue, { placeId: LIST_ITEM.placeId! });
		expect(venue.details?.popularTimesHistogram?.Fr).toHaveLength(6);
		// What reviews often mention, most mentioned first
		expect(venue.details?.reviewsTags?.slice(0, 2)).toEqual([
			{ title: 'vegan meat', count: 12 },
			{ title: 'dürüm', count: 7 },
		]);
		// An item that carries no details sets none
		expect((await em.findOneOrFail(Venue, { placeId: 'ChIJother' })).details).toBeNull();
	});

	it('asks for nothing when there are no venues', async () => {
		runActor.mockClear();
		expect(await scrapeService.refreshDetails([], 2)).toEqual({
			requested: 0,
			saved: 0,
			withPopularTimes: 0,
		});
		expect(runActor).not.toHaveBeenCalled();
	});
});
