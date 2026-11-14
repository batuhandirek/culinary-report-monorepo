import { describe, expect, it } from '@jest/globals';

import { DeliveryPlatformEnum } from '../entities/venue-delivery-listing.entity.js';
import { deliveryQueries } from '../services/venue-delivery.service.js';
import {
	deliveryPageOf,
	deliveryPlatformOf,
	lieferandoPage,
	matchDeliveryVenue,
	menuChange,
	menuKey,
	menuOf,
	uberEatsPage,
	woltPage,
} from '../util/delivery-pages.js';

import {
	GOOGLE_DELIVERY_PAGES,
	LIEFERANDO_BUN_SOCIETY,
	UBER_EATS_BUN_SOCIETY,
	WOLT_SLICE_SOCIETY,
} from './fixtures/delivery-items.js';

describe('deliveryPageOf', () => {
	it('knows a restaurant’s page on each platform, in one spelling', () => {
		expect(
			deliveryPageOf(
				'https://wolt.com/de/deu/berlin/restaurant/burgermeister-hermannplatz?srsltid=AYCX9vJX',
			),
		).toEqual({
			platform: DeliveryPlatformEnum.WOLT,
			key: 'wolt:burgermeister-hermannplatz',
			url: 'https://wolt.com/en/deu/berlin/restaurant/burgermeister-hermannplatz',
		});
		expect(deliveryPageOf('https://www.lieferando.de/speisekarte/the-bun-society')).toEqual({
			platform: DeliveryPlatformEnum.LIEFERANDO,
			key: 'lieferando:the-bun-society',
			url: 'https://www.lieferando.de/speisekarte/the-bun-society',
		});
		expect(deliveryPageOf('https://www.lieferando.de/en/menu/the-bun-society')?.key).toBe(
			'lieferando:the-bun-society',
		);
		// Google lists the German and the English page; the actor answers without "www."
		const uber = [
			'https://www.ubereats.com/de/store/the-bun-society/aSPb8zC6UmqrZMgi5HzFGw?srsltid=x',
			'https://www.ubereats.com/de-en/store/the-bun-society/aSPb8zC6UmqrZMgi5HzFGw',
			'https://ubereats.com/de/store/the-bun-society/aSPb8zC6UmqrZMgi5HzFGw',
		].map(deliveryPageOf);
		expect(new Set(uber.map(page => page?.key))).toEqual(new Set(['uber_eats:aSPb8zC6UmqrZMgi5HzFGw']));
		expect(uber[0]?.url).toBe('https://www.ubereats.com/de/store/the-bun-society/aSPb8zC6UmqrZMgi5HzFGw');
	});

	it('takes no brand, category, district, dish or press page for a restaurant', () => {
		for (const url of [
			'https://wolt.com/en/deu/berlin/brand/burgermeister',
			'https://wolt.com/de/deu/berlin/district/schoneweide/brand/burgermeister',
			'https://wolt.com/en/deu/berlin',
			'https://press.wolt.com/de-DE/266894-fan-favorite-neu-interpretiert',
			'https://www.lieferando.de/lieferdienst/ketten/burgermeister',
			'https://www.lieferando.de/lieferservice/burger/berlin-10179',
			'https://www.ubereats.com/de/brand-city/berlin-be/burgermeister',
			'https://www.ubereats.com/de/dish/berlin-be/french-fries',
			'https://www.thebunsociety.com/menu/burger',
			'not a url',
		])
			expect(deliveryPageOf(url)).toBeNull();
		expect(deliveryPlatformOf('https://wolt.com/en/deu/berlin/restaurant/doner-pro')).toBe(
			DeliveryPlatformEnum.WOLT,
		);
		expect(deliveryPlatformOf(null)).toBeNull();
	});

	it('finds the restaurant pages among Google’s results', () => {
		const pagesOf = (term: string) =>
			GOOGLE_DELIVERY_PAGES.find(page => page.searchQuery?.term === term)!
				.organicResults!.map(result => deliveryPageOf(result.url)?.key)
				.filter(Boolean);
		expect(
			pagesOf('"The Bun Society" Berlin site:lieferando.de OR site:wolt.com OR site:ubereats.com'),
		).toEqual([
			'uber_eats:aSPb8zC6UmqrZMgi5HzFGw',
			'uber_eats:aSPb8zC6UmqrZMgi5HzFGw',
			'lieferando:the-bun-society',
		]);
		expect(pagesOf('"Burgermeister" Berlin site:wolt.com')).toEqual([
			'wolt:burgermeister-schlostrae',
			'wolt:burgermeister-hermannplatz',
			'wolt:burgermeister-alexanderplatz',
		]);
	});

	it('asks one query for a one-venue brand and one a site for a chain', () => {
		const berlin = { name: 'Berlin', country: 'DE' };
		expect(deliveryQueries('The Bun Society', berlin, 1)).toEqual([
			'"The Bun Society" Berlin site:lieferando.de OR site:wolt.com OR site:ubereats.com',
		]);
		expect(deliveryQueries('Burgermeister', berlin, 3)).toEqual([
			'"Burgermeister" Berlin site:lieferando.de',
			'"Burgermeister" Berlin site:wolt.com',
			'"Burgermeister" Berlin site:ubereats.com',
		]);
		// Lieferando trades under that name in Germany and Austria only
		expect(deliveryQueries('Mikkeller', { name: 'Copenhagen', country: 'DK' }, 1)).toEqual([
			'"Mikkeller" Copenhagen site:wolt.com OR site:ubereats.com',
		]);
	});
});

describe('the platforms’ items as one page', () => {
	it('reads an Uber Eats store: its figures, and each item once under its own section', () => {
		const page = uberEatsPage(UBER_EATS_BUN_SOCIETY)!;
		expect(page).toMatchObject({
			platform: DeliveryPlatformEnum.UBER_EATS,
			key: 'uber_eats:aSPb8zC6UmqrZMgi5HzFGw',
			name: 'The Bun Society',
			street: 'Adalbertstraße 23',
			postalCode: '10997',
			cuisines: ['Burger'],
			rating: 4.3,
			// "170+"
			reviewsCount: 170,
			etaMin: 24,
			etaMax: 41,
			currency: 'EUR',
		});
		expect(page.lat).toBeCloseTo(52.5031, 3);
		// 50 listings in 7 sections, the featured section repeating 16 of the others
		expect(page.items).toHaveLength(34);
		expect(page.items.find(item => item.key === 'banging bangkok')).toMatchObject({
			name: 'Banging Bangkok 🌶️🌶️',
			category: 'Smashed Beef Burger',
			price: 10.5,
		});
		const smash = page.items.find(item => item.key === 'the classic smash')!;
		expect(smash).toMatchObject({ price: 8, likedShare: 0.91, ratingsCount: 23 });
	});

	it('gives an Uber Eats store read from nowhere no delivery time', () => {
		const page = uberEatsPage({
			...UBER_EATS_BUN_SOCIETY,
			storeAvailablityStatus: 'TOO_FAR_TO_DELIVER',
			etaMinutes: { min: 170, max: 185 },
		})!;
		expect(page.etaMin).toBeUndefined();
		expect(uberEatsPage({ ...UBER_EATS_BUN_SOCIETY, title: ' ' })).toBeNull();
	});

	it('reads a Lieferando restaurant: stars, fees, delivery time and its menu by section', () => {
		const page = lieferandoPage(LIEFERANDO_BUN_SOCIETY)!;
		expect(page).toMatchObject({
			platform: DeliveryPlatformEnum.LIEFERANDO,
			key: 'lieferando:the-bun-society',
			url: 'https://www.lieferando.de/speisekarte/the-bun-society',
			externalId: '13033013',
			name: 'The Bun Society',
			street: 'Adalbertstraße 23',
			postalCode: '10997',
			rating: 3.7,
			reviewsCount: 1,
			deliveryFee: 0.79,
			minOrder: 10,
			etaMin: 20,
			etaMax: 40,
		});
		expect(page.items).toHaveLength(50);
		expect(page.items.find(item => item.key === 'midnight sando')).toMatchObject({
			name: 'Midnight Sando',
			category: 'Fried Chicken Burger',
			price: 13,
		});
		// Nobody rated it yet: no stars, never zero
		expect(lieferandoPage({ ...LIEFERANDO_BUN_SOCIETY, rating: 0, ratingCount: 0 })!.rating).toBeUndefined();
	});

	it('reads a Wolt restaurant: the finer score halved, prices from cents', () => {
		const url = 'https://wolt.com/en/deu/berlin/restaurant/slice-society173';
		const page = woltPage(WOLT_SLICE_SOCIETY, url)!;
		expect(page).toMatchObject({
			platform: DeliveryPlatformEnum.WOLT,
			key: 'wolt:slice-society173',
			url,
			name: 'Slice Society',
			street: 'Torstraße 173',
			postalCode: '10115',
			rating: 4.3,
			reviewsCount: 200,
			deliveryFee: 0.99,
		});
		expect(page.items).toHaveLength(25);
		expect(page.items[0]).toMatchObject({ name: 'Mini Vodka Pizza', price: 16 });
		expect(woltPage(null, url)).toBeNull();
		expect(woltPage({ menuItems: [] }, url)).toBeNull();
	});

	it('keeps an item once, as its last listing has it, and drops one without a name or a price', () => {
		expect(
			menuOf([
				{ name: 'Kimchi', price: 4.5, category: 'Featured' },
				{ name: 'Free Ketchup', price: 0 },
				{ name: ' ', price: 3 },
				{ name: '🌶️🌶️', price: 3 },
				{ name: 'Kimchi ', price: 4.5, category: 'Sides' },
			]),
		).toEqual([{ key: 'kimchi', name: 'Kimchi', price: 4.5, category: 'Sides' }]);
		expect(menuKey("Bussin' Bulgogi 🌶️")).toBe('bussin bulgogi');
	});
});

describe('matchDeliveryVenue', () => {
	const kreuzberg = {
		id: 'kreuzberg',
		name: 'The Bun Society',
		brandName: 'The Bun Society',
		street: 'Adalbertstraße 23',
		postalCode: '10997',
		lat: 52.50305,
		lng: 13.42078,
	};
	const page = uberEatsPage(UBER_EATS_BUN_SOCIETY)!;

	it('takes a page named like the venue that stands where it does', () => {
		expect(matchDeliveryVenue(page, [kreuzberg])?.id).toBe('kreuzberg');
		// Without coordinates on either side: the same street in the same postcode
		expect(
			matchDeliveryVenue({ ...page, lat: undefined, lng: undefined }, [kreuzberg])?.id,
		).toBe('kreuzberg');
		expect(
			matchDeliveryVenue(page, [{ ...kreuzberg, lat: null, lng: null, street: 'Adalbertstr. 23' }])?.id,
		).toBe('kreuzberg');
	});

	it('takes the nearest of a chain’s branches, and none for a branch elsewhere', () => {
		const mitte = { ...kreuzberg, id: 'mitte', street: 'Torstraße 1', postalCode: '10119', lat: 52.5288, lng: 13.4101 };
		expect(matchDeliveryVenue(page, [mitte, kreuzberg])?.id).toBe('kreuzberg');
		expect(matchDeliveryVenue(page, [mitte])).toBeUndefined();
		// Another street, no coordinates to say how far
		expect(
			matchDeliveryVenue({ ...page, lat: undefined, lng: undefined }, [mitte]),
		).toBeUndefined();
	});

	it('never takes a page by its place alone, or by its name alone when a brand has several', () => {
		expect(matchDeliveryVenue({ ...page, name: 'Slice Society' }, [kreuzberg])).toBeUndefined();
		const nowhere = { name: 'The Bun Society' };
		expect(matchDeliveryVenue(nowhere, [kreuzberg])?.id).toBe('kreuzberg');
		expect(matchDeliveryVenue(nowhere, [kreuzberg, { ...kreuzberg, id: 'other' }])).toBeUndefined();
	});
});

describe('menuChange', () => {
	const september = new Date('2026-10-02T06:00:00Z');
	const october = new Date('2026-11-02T06:00:00Z');
	const read = (items: Record<string, number>) =>
		menuOf(Object.entries(items).map(([name, price]) => ({ name, price })));

	it('adds, updates and marks removed', () => {
		const first = menuChange([], read({ 'Banging Bangkok': 10.5, 'El Toro Bravo': 11 }), september);
		expect(first.added.map(item => item.key)).toEqual(['banging bangkok', 'el toro bravo']);
		expect(first.added[0]).toMatchObject({
			price: 10.5,
			firstSeenAt: september,
			lastSeenAt: september,
			removedAt: null,
		});

		const second = menuChange(first.added, read({ 'Banging Bangkok': 11.5, 'Midnight Sando': 13 }), october);
		expect(second.added.map(item => item.key)).toEqual(['midnight sando']);
		expect(second.removed.map(item => item.key)).toEqual(['el toro bravo']);
		expect(second.seen).toHaveLength(1);
		expect(second.seen[0].fields).toMatchObject({
			price: 11.5,
			firstSeenAt: september,
			lastSeenAt: october,
		});
	});

	it('puts an item back on the menu, and leaves one already removed alone', () => {
		const gone = { key: 'el toro bravo', firstSeenAt: september, removedAt: september };
		expect(menuChange([gone], read({ Kimchi: 4.5 }), october).removed).toEqual([]);
		const back = menuChange([gone], read({ 'El Toro Bravo': 12 }), october);
		expect(back.seen[0].fields).toMatchObject({ removedAt: null, price: 12, firstSeenAt: september });
	});

	it('changes nothing on a read without a menu', () => {
		const stored = [{ key: 'kimchi', firstSeenAt: september, removedAt: null }];
		expect(menuChange(stored, [], october)).toEqual({ added: [], seen: [], removed: [] });
	});
});
