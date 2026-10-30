import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';

import { ApifyService } from 'src/modules/apify/services/apify.service.js';
import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { MenuItem } from '../entities/menu-item.entity.js';
import { Venue } from '../entities/venue.entity.js';
import { DeliveryPlatformEnum, VenueDeliveryListing } from '../entities/venue-delivery-listing.entity.js';
import { VenueDeliverySnapshot } from '../entities/venue-delivery-snapshot.entity.js';
import {
	type LieferandoItem,
	matchLieferando,
	VenueDeliveryService,
	type WoltItem,
} from '../services/venue-delivery.service.js';
import { deliveryPlatformOf, isMainCourse, itemsForDish, pricePosition } from '../util/delivery.js';

// Follows the Wolt actor's published item schema (direct URL mode: listing-only fields empty)
const WOLT_ITEM: WoltItem = {
	id: '5f1a2b',
	name: 'Döner Pro',
	url: 'https://wolt.com/en/deu/berlin/restaurant/doner-pro',
	postCode: '10999',
	rating: 4.5,
	ratingScore: 9.2,
	reviewCount: 412,
	currency: 'EUR',
	deliveryBasePriceInCents: 199,
	menuItems: [
		{ id: '1', name: 'Döner im Brot', priceInCents: 750, category: 'Döner' },
		{ id: '2', name: 'Döner Teller', priceInCents: 1150, category: 'Teller' },
		{ id: '3', name: 'Lahmacun', priceInCents: 650, category: 'Pide & Lahmacun' },
		{ id: '4', name: 'Ayran', priceInCents: 250, category: 'Getränke' },
		{ id: '5', name: 'Baklava', priceInCents: 400, category: 'Desserts' },
	],
};

// The Lieferando actor's documented restaurant row (menus off)
const lieferando = (name: string, postcode: string, rating: number): LieferandoItem => ({
	restaurantId: `lf-${name}-${postcode}`,
	name,
	rating,
	ratingCount: 120,
	deliveryFee: 1.49,
	minimumOrderValue: 12,
	currency: 'EUR',
	postcode,
	url: `https://www.lieferando.de/speisekarte/${name.toLowerCase().replace(/ /g, '-')}`,
});

describe('delivery helpers', () => {
	it('knows Wolt restaurant pages and Lieferando', () => {
		expect(deliveryPlatformOf(WOLT_ITEM.url)).toBe(DeliveryPlatformEnum.WOLT);
		expect(deliveryPlatformOf('https://wolt.com/en/deu/berlin')).toBeNull();
		expect(deliveryPlatformOf('https://www.lieferando.de/pinoli')).toBe(DeliveryPlatformEnum.LIEFERANDO);
		expect(deliveryPlatformOf('https://www.ubereats.com/de/store/x')).toBeNull();
	});

	it('compares main courses only, and dishes by whole words', () => {
		expect(isMainCourse({ name: 'Ayran', category: 'Getränke' })).toBe(false);
		expect(isMainCourse({ name: 'Extra Käse', category: 'Pizza' })).toBe(false);
		expect(isMainCourse({ name: 'Döner Teller', category: 'Teller' })).toBe(true);
		expect(itemsForDish([{ name: 'Döner im Brot' }, { name: 'Dönerteller' }, { name: 'Lahmacun' }], 'Döner')).toEqual([
			{ name: 'Döner im Brot' },
		]);
	});

	it('places the venue’s median and its dishes among the others', () => {
		const items = (prices: Record<string, number>) => Object.entries(prices).map(([name, price]) => ({ name, price }));
		const position = pricePosition(
			{ venueId: 'v', name: 'Venue', items: items({ 'Döner im Brot': 8.5, 'Döner Teller': 13, Lahmacun: 7, Ayran: 2.5 }) },
			[
				{ venueId: 'a', name: 'A', items: items({ 'Döner im Brot': 7, 'Döner Teller': 11, Pide: 9 }) },
				{ venueId: 'b', name: 'B', items: items({ 'Döner Kebab': 6.5, Falafel: 6 }) },
				{ venueId: 'c', name: 'C (no menu)', items: [] },
			],
			['Döner', 'Lahmacun'],
		);
		// Venue mains 7, 8.5, 13 → 8.5; A → 9, B → 6.25; others' median 7.625
		expect(position).toEqual({
			median: 8.5,
			othersMedian: 7.63,
			othersWithMenu: 2,
			diff: 0.115,
			dishes: [
				{ dish: 'Döner', price: 10.75, othersMedian: 7.75, othersWithDish: 2 },
				{ dish: 'Lahmacun', price: 7, othersWithDish: 0 },
			],
		});
		expect(pricePosition({ venueId: 'v', name: 'V', items: [] }, [], [])).toBeNull();
	});

	it('leads with the venue’s own kind of food against the same on the other menus', () => {
		const items = (prices: Record<string, number>) => Object.entries(prices).map(([name, price]) => ({ name, price }));
		const ramen = { key: 'ramen', label: 'Ramen', matches: (i: { name: string }) => /ramen/i.test(i.name) };
		const position = pricePosition(
			{ venueId: 'v', name: 'V', items: items({ 'Tonkotsu Ramen': 15, 'Shoyu Ramen': 14, Gyoza: 6 }) },
			[
				{ venueId: 'a', name: 'A', items: items({ 'Miso Ramen': 12, Edamame: 5 }) },
				{ venueId: 'b', name: 'B', items: items({ 'Ramen': 13, 'Spicy Ramen': 13 }) },
				{ venueId: 'c', name: 'C', items: items({ Burger: 11 }) },
			],
			[],
			ramen,
		);
		expect(position?.topic).toEqual({
			key: 'ramen',
			label: 'Ramen',
			price: 14.5,
			othersMedian: 12.5,
			othersWithTopic: 2,
			diff: 0.16,
		});
		// The venue sells none of it: no topic line, the median main course stays
		expect(pricePosition({ venueId: 'v', name: 'V', items: items({ Burger: 12 }) }, [], [], ramen)).toEqual({
			median: 12,
			othersMedian: null,
			othersWithMenu: 0,
			diff: null,
			dishes: [],
		});
	});

	it('matches a Lieferando row by name and postcode', () => {
		const rows = [lieferando('Pinoli', '12357', 4.1), lieferando('Pinoli Restaurant', '12355', 4.6)];
		expect(matchLieferando({ name: 'Pinoli Restaurant', postalCode: '12355' }, rows)?.restaurantId).toBe('lf-Pinoli Restaurant-12355');
		expect(matchLieferando({ name: 'Pinoli', postalCode: '10115' }, rows)).toBeUndefined();
	});
});

describe('VenueDeliveryService (pglite)', () => {
	let harness: PgliteTestingModule;
	let service: VenueDeliveryService;
	const runActor = jest.fn<(actorId: string, input: Record<string, unknown>, opts: { maxCostUsd: number }) => Promise<unknown[]>>();

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [VenueDeliveryService, { provide: ApifyService, useValue: { runActor } }],
		});
		service = harness.moduleRef.get(VenueDeliveryService);
		entityManagerManager.setEntityManager(harness.orm.em);
	});

	afterAll(async () => {
		await harness.stop();
	});

	it('stores Wolt menus per month, Lieferando listings for the rest, and each listing\'s figures per month', async () => {
		const em = harness.orm.em;
		const city = testCity(em);
		const doner = em.create(Venue, {
			city,
			placeId: 'p-doner',
			name: 'Döner Pro',
			postalCode: '10999',
			details: { orderBy: [{ name: 'Wolt', url: WOLT_ITEM.url }, { name: 'Lieferando.de', url: 'https://www.lieferando.de/doner-pro' }] },
		});
		const pinoli = em.create(Venue, { city, placeId: 'p-pinoli', name: 'Pinoli Restaurant', postalCode: '12355' });
		const nowhere = em.create(Venue, { city, placeId: 'p-nowhere', name: 'Walk-in Only', postalCode: '10115' });
		await em.flush();
		runActor.mockImplementation(async actorId =>
			actorId === 'needy_hammock/wolt-restaurant-menu-scraper'
				? [WOLT_ITEM]
				: [lieferando('Pinoli Restaurant', '12355', 4.6), lieferando('Döner Pro', '10999', 3.9)],
		);

		const res = await service.scrape([doner, pinoli, nowhere], city, '2026-09', 3, new Date('2026-10-02T06:00:00Z'));

		expect(res).toEqual({
			venues: 3,
			wolt: { linked: 1, saved: 1, menuItems: 5, failed: 0 },
			lieferando: { searched: 2, matched: 1 },
		});
		const lieferandoCall = runActor.mock.calls.find(([id]) => id === 'studio-amba/takeaway-scraper')!;
		expect(lieferandoCall[1]).toMatchObject({ location: city.name, scrapeMenus: false });
		em.clear();
		const listings = await em.find(VenueDeliveryListing, {}, { populate: ['venue'], orderBy: { platform: 'asc' } });
		expect(listings.map(l => [l.venue.name, l.platform, l.rating, l.reviewsCount, l.deliveryFee, l.minOrder])).toEqual([
			['Döner Pro', 'wolt', 4.6, 412, 1.99, null],
			['Pinoli Restaurant', 'lieferando', 4.6, 120, 1.49, 12],
		]);

		// The same month again replaces its menu and snapshot; another month keeps both
		await service.scrape([doner], city, '2026-09', 3);
		runActor.mockImplementation(async () => [{ ...WOLT_ITEM, ratingScore: 9.4, reviewCount: 430 }]);
		await service.scrape([doner], city, '2026-10', 3);
		em.clear();
		expect(await em.count(MenuItem, { month: '2026-09' })).toBe(5);
		expect(await em.count(MenuItem, { month: '2026-10' })).toBe(5);
		expect(await em.count(VenueDeliveryListing, {})).toBe(2);

		// The listing holds the latest figures; the snapshots keep each month's
		const woltListing = await em.findOneOrFail(VenueDeliveryListing, { venue: doner.id, platform: DeliveryPlatformEnum.WOLT });
		expect([woltListing.rating, woltListing.reviewsCount]).toEqual([4.7, 430]);
		const snapshots = await em.find(
			VenueDeliverySnapshot,
			{},
			{ populate: ['listing'], orderBy: { month: 'asc', listing: { platform: 'asc' } } },
		);
		expect(snapshots.map(s => [s.month, s.listing.platform, s.rating, s.reviewsCount, s.deliveryFee, s.minOrder])).toEqual([
			['2026-09', 'wolt', 4.6, 412, 1.99, null],
			['2026-09', 'lieferando', 4.6, 120, 1.49, 12],
			['2026-10', 'wolt', 4.7, 430, 1.99, null],
		]);

		const menus = await service.menus([doner.id, pinoli.id], '2026-09');
		expect(menus.map(m => [m.listing.platform, m.month, m.items.length])).toEqual([
			['wolt', '2026-09', 5],
			['lieferando', null, 0],
		]);
	});
});
