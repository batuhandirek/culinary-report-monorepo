import { describe, expect, it } from '@jest/globals';

import { ReservationPlatformEnum } from '../entities/venue-reservation-sample.entity.js';
import {
	googleDateLabel,
	googleReserveOpenSlots,
	googleReservePartner,
	googleReserveUrl,
	isGoogleBlockPage,
	parseGoogleReservePage,
	slotLabelMinutes,
	zonedTimeToUtc,
} from '../util/google-reserve.js';
import { googleReserveMerchantId, reservationPlatformOf, reservationUrlOf } from '../util/reservations.js';

import { googleReservePageHtml, quarterHours } from './fixtures/google-reserve-pages.js';

// The link Google Maps gives a venue (session parameters trimmed)
const MAPS_LINK = 'https://www.google.com/maps/reserve/v/dine/c/uekAc9vvAE8?source=pa&opi=79508299&hl=en-US&gei=N-fQ';

describe('Google booking page links', () => {
	it('recognises the page and its merchant id, in both link shapes', () => {
		expect(googleReserveMerchantId(MAPS_LINK)).toBe('uekAc9vvAE8');
		expect(googleReserveMerchantId('https://www.google.de/maps/reserve/dine?c=uekAc9vvAE8&ld=20261023T190000')).toBe(
			'uekAc9vvAE8',
		);
		expect(googleReserveMerchantId('https://www.google.com/maps/place/Le+Canard')).toBeNull();
		expect(googleReserveMerchantId('https://evil.example/maps/reserve/v/dine/c/abc')).toBeNull();
		expect(reservationPlatformOf(MAPS_LINK)).toBe(ReservationPlatformEnum.GOOGLE);
		expect(reservationPlatformOf('https://www.google.com/maps/reserve/v/dine')).toBeNull();
	});

	it('samples the hand-set link, then Google’s link, then the website', () => {
		const thefork = 'https://www.thefork.de/restaurant/x-r1';
		expect(reservationUrlOf({ bookingUrl: thefork, details: { reserveTableUrl: MAPS_LINK } })).toBe(thefork);
		expect(reservationUrlOf({ website: 'https://www.opentable.de/r/x', details: { reserveTableUrl: MAPS_LINK } })).toBe(
			MAPS_LINK,
		);
		expect(reservationUrlOf({ website: 'https://example.com', details: {} })).toBeNull();
	});

	it('asks for the local time as its UTC instant (`ld` is read as UTC)', () => {
		// Summer time: 19:00 in Berlin is 17:00 UTC; winter time: 18:00 UTC
		expect(zonedTimeToUtc('2026-10-23', 19 * 60, 'Europe/Berlin').toISOString()).toBe('2026-10-23T17:00:00.000Z');
		expect(zonedTimeToUtc('2026-10-30', 21 * 60, 'Europe/Berlin').toISOString()).toBe('2026-10-30T20:00:00.000Z');
		expect(zonedTimeToUtc('2026-10-23', 19 * 60, 'America/New_York').toISOString()).toBe('2026-10-23T23:00:00.000Z');
		expect(googleReserveUrl('uekAc9vvAE8', '2026-10-23', 19 * 60, 'Europe/Berlin')).toBe(
			'https://www.google.com/maps/reserve/dine?c=uekAc9vvAE8&ld=20261023T170000&ps=2&hl=en',
		);
	});
});

describe('Google booking page parsing', () => {
	it('reads slot labels on a 12-hour clock, the asked one included', () => {
		expect(['8:15 PM', 'Selected: 8:00 PM', '12:00 PM', '12:30 AM', '20:45', 'Continue'].map(slotLabelMinutes)).toEqual([
			20 * 60 + 15,
			20 * 60,
			12 * 60,
			30,
			20 * 60 + 45,
			null,
		]);
		expect(googleDateLabel('2026-10-23')).toBe('Fri, Oct 23');
	});

	it('reads the date, the grids per area and the partner from the server-rendered page', () => {
		const page = parseGoogleReservePage(
			googleReservePageHtml({
				areas: [
					{ id: 'area-r', name: 'Restaurant' },
					{ id: 'area-h', name: 'Hochtisch' },
				],
				grids: [quarterHours(18, 'area-r', [0, 1]), quarterHours(18, 'area-h', [2])],
			}),
		);
		expect(page.partner).toBe('OpenTable');
		expect(page.date).toBe('Fri, Oct 23');
		expect(page.grids.map(g => g.title)).toEqual(['Restaurant', 'Hochtisch']);
		expect(page.grids[0].slots).toEqual([
			null,
			null,
			'6:30 PM',
			'6:45 PM',
			'Selected: 7:00 PM',
			'7:15 PM',
			'7:30 PM',
			'7:45 PM',
			'8:00 PM',
		]);
		expect(page.grids[1].slots[2]).toBeNull();
	});

	it('merges the two windows, a slot open in one area only counting as open', () => {
		const early = parseGoogleReservePage(
			googleReservePageHtml({
				areas: [
					{ id: 'a', name: 'Restaurant' },
					{ id: 'b', name: 'Bar' },
				],
				// 18:00–20:00: the restaurant has 18:00 and 18:15 closed, the bar has them open
				grids: [quarterHours(18, 'a', [0, 1, 2]), quarterHours(18, 'b', [2, 3])],
			}),
		);
		const late = parseGoogleReservePage(
			// 20:00–22:00: everything from 21:00 closed; 22:00 is outside the evening
			googleReservePageHtml({ grids: [quarterHours(20, 'a', [4, 5, 6, 7])] }),
		);
		// 18:00–19:45 open but 18:30 (closed in both areas) = 7; 20:00–20:45 = 4
		expect(googleReserveOpenSlots([early, late], '2026-10-23')).toBe(11);
		expect(googleReservePartner([early, late])).toBe('OpenTable');
	});

	it('lists every provider of a page several feed, alphabetically', () => {
		const page = parseGoogleReservePage(googleReservePageHtml({ partner: ['resmio', 'Lightspeed Commerce'], grids: [] }));
		expect(page.partner).toBe('Lightspeed Commerce, resmio');
	});

	it('counts a shown date without a grid as fully booked, and a date not shown as not sampled', () => {
		const closed = parseGoogleReservePage(googleReservePageHtml({ grids: [] }));
		expect(closed.grids).toEqual([]);
		expect(googleReserveOpenSlots([closed, closed], '2026-10-23')).toBe(0);
		// The page moved to another date: nothing said about the asked one
		expect(googleReserveOpenSlots([closed], '2026-10-24')).toBeNull();
		const blank = parseGoogleReservePage(googleReservePageHtml({ date: null, partner: null }));
		expect(blank).toEqual({ partner: null, date: null, grids: [] });
	});

	it('recognises Google’s captcha page', () => {
		expect(isGoogleBlockPage('https://www.google.com/sorry/index?continue=…', '')).toBe(true);
		expect(isGoogleBlockPage('', '<p>Our systems have detected unusual traffic from your computer network.</p>')).toBe(
			true,
		);
		expect(isGoogleBlockPage('', googleReservePageHtml())).toBe(false);
	});
});
