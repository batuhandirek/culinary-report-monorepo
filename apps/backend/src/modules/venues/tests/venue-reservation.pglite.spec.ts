import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';

import { ApifyService } from 'src/modules/apify/services/apify.service.js';
import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { Venue } from '../entities/venue.entity.js';
import {
	ReservationPlatformEnum,
	VenueReservationSample,
} from '../entities/venue-reservation-sample.entity.js';
import {
	OpenTableAvailabilityService,
	openTableAvailability,
	type OpenTableItem,
} from '../services/opentable-availability.service.js';
import {
	TheForkAvailabilityService,
	theForkAvailability,
	type TheForkItem,
} from '../services/thefork-availability.service.js';
import { GoogleReserveAvailabilityService } from '../services/google-reserve-availability.service.js';
import { VenueReservationService } from '../services/venue-reservation.service.js';
import {
	bookedPercent,
	comingWeekendEvenings,
	openSlotsAtTimes,
	openSlotsInIntervals,
	reservationPlatformOf,
} from '../util/reservations.js';

import { googleReservePageHtml, quarterHours } from './fixtures/google-reserve-pages.js';

// Shaped like the `clearpath/thefork-scraper` README's sample item (trimmed to what we read)
const THEFORK_ITEM: TheForkItem = {
	id: '35146',
	url: 'https://www.thefork.de/restaurant/trattoria-sample-r35146',
	name: 'Trattoria Sample',
	is_bookable: true,
	bookable_intervals: [
		{ date: '2026-10-16', isToday: false, intervals: [{ start: 720, end: 915 }, { start: 1140, end: 1290 }] },
		// Listed with no window: fully booked
		{ date: '2026-10-17', isToday: false, intervals: [] },
	],
};

const THEFORK_TARGET = {
	venueId: 'v-fork',
	name: 'Trattoria Sample',
	url: 'https://www.thefork.de/restaurant/trattoria-sample-r35146?cc=1',
	cityName: 'Berlin',
	timeZone: 'Europe/Berlin',
};

describe('reservation helpers', () => {
	it('knows the platforms by host', () => {
		expect(reservationPlatformOf('https://www.thefork.de/restaurant/x-r1')).toBe(ReservationPlatformEnum.THEFORK);
		expect(reservationPlatformOf('https://www.lafourchette.com/restaurant/x-r1')).toBe(ReservationPlatformEnum.THEFORK);
		expect(reservationPlatformOf('https://www.opentable.de/r/x-berlin')).toBe(ReservationPlatformEnum.OPENTABLE);
		// Google's own booking page, whichever partner feeds it; Quandoo has shut down
		expect(reservationPlatformOf('https://www.google.com/maps/reserve/v/dine/c/abc')).toBe(ReservationPlatformEnum.GOOGLE);
		expect(reservationPlatformOf('https://www.quandoo.de/place/x')).toBeNull();
		expect(reservationPlatformOf('not a url')).toBeNull();
	});

	it('counts open quarter hours between 18:00 and 22:00', () => {
		// 19:00 to 21:30 inclusive: 11 starts
		expect(openSlotsInIntervals([{ start: 720, end: 915 }, { start: 1140, end: 1290 }])).toBe(11);
		expect(openSlotsInIntervals([])).toBe(0);
		expect(openSlotsAtTimes(['17:45', '18:00', '18:05', '19:30', '22:00', 'x'])).toBe(2);
	});

	it('asks for the coming Friday and Saturday', () => {
		// Thursday 19:00 in Berlin
		expect(comingWeekendEvenings(new Date('2026-10-15T17:00:00Z'), 'Europe/Berlin')).toEqual([
			'2026-10-16',
			'2026-10-17',
		]);
		// On a Friday: the next day and the Friday after
		expect(comingWeekendEvenings(new Date('2026-10-16T17:00:00Z'), 'Europe/Berlin')).toEqual([
			'2026-10-17',
			'2026-10-23',
		]);
	});

	it('reads booked out as the share of closed slots', () => {
		expect(bookedPercent([{ slotsOpen: 4, slotsAsked: 16 }, { slotsOpen: 0, slotsAsked: 16 }])).toBe(87.5);
		expect(bookedPercent([])).toBeNull();
	});

	it('matches TheFork items by restaurant id and reads listed dates only', () => {
		expect(theForkAvailability([THEFORK_TARGET], [THEFORK_ITEM], ['2026-10-16', '2026-10-17', '2026-10-30'])).toEqual([
			{ venueId: 'v-fork', forDate: '2026-10-16', slotsOpen: 11, slotsAsked: 16, partySize: null },
			{ venueId: 'v-fork', forDate: '2026-10-17', slotsOpen: 0, slotsAsked: 16, partySize: null },
		]);
	});

	it('matches OpenTable rows by name and reads every slot shape', () => {
		const items: OpenTableItem[] = [
			{ message: 'Placeholder unit', code: 'PLACEHOLDER' },
			{
				rowType: 'availability',
				name: 'Grill Royal',
				slots: [
					'19:00',
					{ time: '19:30' },
					{ dateTime: '2026-10-16T20:15' },
					{ timeOffsetMinutes: 60 },
					{ time: '20:45', isAvailable: false },
					{ time: '21:00', availableDate: '2026-10-17' },
				],
			},
		];
		const target = { venueId: 'v-ot', name: 'Grill Royal', url: 'https://www.opentable.de/r/grill-royal-berlin', cityName: 'Berlin', timeZone: 'Europe/Berlin' };
		expect(openTableAvailability([target], items, '2026-10-16')).toEqual([
			{ venueId: 'v-ot', forDate: '2026-10-16', slotsOpen: 4, slotsAsked: 16, partySize: 2 },
		]);
		expect(openTableAvailability([{ ...target, name: 'Somewhere Else' }], items, '2026-10-16')).toEqual([]);
	});
});

describe('VenueReservationService (pglite)', () => {
	let harness: PgliteTestingModule;
	let service: VenueReservationService;
	let google: GoogleReserveAvailabilityService;
	// Google's page by merchant id: Friday 23 Oct and Saturday 24 Oct, two windows each
	const googleLoad = jest.fn<(url: string) => Promise<string>>();
	const googlePage = (url: string): string => {
		const params = new URL(url).searchParams;
		const ld = params.get('ld')!;
		const date = ld.startsWith('20261016') ? 'Fri, Oct 16' : 'Sat, Oct 17';
		// 17:00Z is 19:00 in Berlin: the early window, 18:00–20:00
		const fromHour = ld.endsWith('T170000') ? 18 : 20;
		if (params.get('c') === 'abc')
			// Friday: three early quarter hours closed; Saturday: shown with no table at all
			return date === 'Fri, Oct 16'
				? googleReservePageHtml({ date, partner: 'resmio', grids: [quarterHours(fromHour, 'r', fromHour === 18 ? [0, 1, 2] : [])] })
				: googleReservePageHtml({ date, partner: 'resmio', grids: [] });
		return googleReservePageHtml({ date, partner: 'OpenTable', grids: [quarterHours(fromHour, 'r')] });
	};
	const runActor = jest.fn<(actorId: string, input: Record<string, unknown>, opts: { maxCostUsd: number }) => Promise<unknown[]>>();

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				VenueReservationService,
				TheForkAvailabilityService,
				OpenTableAvailabilityService,
				GoogleReserveAvailabilityService,
				{ provide: ApifyService, useValue: { runActor } },
			],
		});
		service = harness.moduleRef.get(VenueReservationService);
		google = harness.moduleRef.get(GoogleReserveAvailabilityService);
		google.pacing = { concurrency: 2, minPauseMs: 0, maxPauseMs: 0 };
		google.load = googleLoad;
		googleLoad.mockImplementation(async url => googlePage(url));
		entityManagerManager.setEntityManager(harness.orm.em);
	});

	afterAll(async () => {
		await harness.stop();
	});

	it('samples Google, TheFork and OpenTable venues for the weekend, skipping venues without a known platform', async () => {
		const em = harness.orm.em;
		const city = testCity(em);
		const fork = em.create(Venue, {
			city,
			placeId: 'p-fork',
			name: 'Trattoria Sample',
			details: { reserveTableUrl: THEFORK_TARGET.url },
		});
		const ot = em.create(Venue, { city, placeId: 'p-ot', name: 'Grill Royal', website: 'https://www.opentable.de/r/grill-royal-berlin' });
		const viaGoogle = em.create(Venue, {
			city,
			placeId: 'p-google',
			name: 'Booked via Google',
			details: { reserveTableUrl: 'https://www.google.com/maps/reserve/v/dine/c/abc' },
		});
		const none = em.create(Venue, { city, placeId: 'p-none', name: 'Walk-in only' });
		await em.flush();
		runActor.mockImplementation(async (actorId, input) =>
			actorId === 'clearpath/thefork-scraper'
				? [THEFORK_ITEM]
				: [{ rowType: 'availability', name: 'Grill Royal', slots: input.date === '2026-10-16' ? ['18:00', '18:30'] : [] }],
		);

		const res = await service.sample([fork, ot, viaGoogle, none], city, 1, { now: new Date('2026-10-15T17:00:00Z') });

		expect(res).toEqual({
			venues: 4,
			noPlatform: 1,
			capped: 0,
			samples: 6,
			byPlatform: { thefork: 2, opentable: 2, google: 2 },
		});
		// Google: two loads per date (19:00 and 21:00 Berlin as UTC), for two, no Apify run
		expect(googleLoad.mock.calls.map(([url]) => url).sort()).toEqual([
			'https://www.google.com/maps/reserve/dine?c=abc&ld=20261016T170000&ps=2&hl=en',
			'https://www.google.com/maps/reserve/dine?c=abc&ld=20261016T190000&ps=2&hl=en',
			'https://www.google.com/maps/reserve/dine?c=abc&ld=20261017T170000&ps=2&hl=en',
			'https://www.google.com/maps/reserve/dine?c=abc&ld=20261017T190000&ps=2&hl=en',
		]);
		// OpenTable: one run per date, for two, with the domain of the link; the budget split
		// between the paid platforms, then across runs
		const otCalls = runActor.mock.calls.filter(([actorId]) => actorId === 'canadesk/opentable');
		expect(otCalls.map(([, input]) => [input.date, input.people, input.country, input.queries])).toEqual([
			['2026-10-16', 2, 'de', ['Grill Royal, Berlin']],
			['2026-10-17', 2, 'de', ['Grill Royal, Berlin']],
		]);
		expect(otCalls[0][2].maxCostUsd).toBe(0.25);
		em.clear();
		const rows = await em.find(VenueReservationSample, {}, { populate: ['venue'], orderBy: { id: 'asc' } });
		expect(rows.map(r => [r.venue.name, r.platform, r.forDate, r.slotsOpen, r.partySize])).toEqual([
			['Trattoria Sample', 'thefork', '2026-10-16', 11, null],
			['Trattoria Sample', 'thefork', '2026-10-17', 0, null],
			['Grill Royal', 'opentable', '2026-10-16', 2, 2],
			['Grill Royal', 'opentable', '2026-10-17', 0, 2],
			['Booked via Google', 'google', '2026-10-16', 13, 2],
			['Booked via Google', 'google', '2026-10-17', 0, 2],
		]);
		expect((await service.between(fork.id, '2026-10-01', '2026-11-01')).length).toBe(2);
		const venues = await em.find(Venue, { id: { $in: [viaGoogle.id, fork.id] } }, { orderBy: { name: 'asc' } });
		expect(venues.map(v => [v.name, v.reservationPartner ?? null])).toEqual([
			['Booked via Google', 'resmio'],
			['Trattoria Sample', null],
		]);
	});
	it('samples a hand-set TheFork link although Google links its own booking page', async () => {
		const em = harness.orm.em;
		const city = testCity(em);
		const venue = em.create(Venue, {
			city,
			placeId: 'p-hand-set',
			name: 'Trattoria Sample',
			website: 'https://www.opentable.de/r/somewhere-else',
			details: { reserveTableUrl: 'https://www.google.com/maps/reserve/v/dine/c/xyz' },
		});
		await em.flush();
		// Before: Google's link (ahead of the website's OpenTable page); after: the hand-set link wins
		expect([...service.targets([venue], city).keys()]).toEqual([ReservationPlatformEnum.GOOGLE]);
		await service.setBookingUrl(venue.id, `  ${THEFORK_TARGET.url} `);
		venue.website = null;
		await em.flush();

		runActor.mockReset();
		runActor.mockResolvedValue([THEFORK_ITEM]);
		const res = await service.sample([venue], city, 1, { now: new Date('2026-10-15T17:00:00Z') });

		expect(res).toEqual({ venues: 1, noPlatform: 0, capped: 0, samples: 2, byPlatform: { thefork: 2 } });
		expect(runActor.mock.calls.map(([actorId, input]) => [actorId, input.startUrls])).toEqual([
			['clearpath/thefork-scraper', [THEFORK_TARGET.url]],
		]);
		expect((await em.findOneOrFail(Venue, { id: venue.id })).bookingUrl).toBe(THEFORK_TARGET.url);
	});

	it('accepts only TheFork, OpenTable or Google booking pages as the booking link, and clears it', async () => {
		const em = harness.orm.em;
		const venue = em.create(Venue, { city: testCity(em), placeId: 'p-link', name: 'Link Test' });
		await em.flush();
		// Pasted from Maps when the scrape missed the venue's reservation link
		expect((await service.setBookingUrl(venue.id, 'https://www.google.com/maps/reserve/v/dine/c/abc?source=pa')).bookingUrl).toBe(
			'https://www.google.com/maps/reserve/v/dine/c/abc?source=pa',
		);
		await expect(service.setBookingUrl(venue.id, 'https://www.google.com/maps/place/Link+Test')).rejects.toThrow(
			/TheFork, OpenTable or Google/,
		);
		await expect(service.setBookingUrl(venue.id, 'https://www.resmio.com/x')).rejects.toThrow(/TheFork, OpenTable or Google/);
		await expect(service.setBookingUrl(venue.id, 'javascript://www.thefork.de/x')).rejects.toThrow();
		expect((await service.setBookingUrl(venue.id, 'https://www.opentable.de/r/link-test-berlin')).bookingUrl).toBe(
			'https://www.opentable.de/r/link-test-berlin',
		);
		expect((await service.setBookingUrl(venue.id, '  ')).bookingUrl).toBeNull();
		await service.setBookingUrl(venue.id, 'https://www.thefork.de/restaurant/link-test-r9');
		expect((await service.setBookingUrl(venue.id, null)).bookingUrl).toBeNull();
	});

	it('samples the first venues with a link up to the cap and names the capped count', async () => {
		const em = harness.orm.em;
		const city = testCity(em);
		const venues = ['m1', 'm2', 'm3'].map(id =>
			em.create(Venue, {
				city,
				placeId: `p-cap-${id}`,
				name: `Capped ${id}`,
				details: { reserveTableUrl: `https://www.google.com/maps/reserve/v/dine/c/${id}?gei=x` },
			}),
		);
		const walkIn = em.create(Venue, { city, placeId: 'p-cap-none', name: 'Capped walk-in' });
		await em.flush();
		googleLoad.mockClear();
		runActor.mockClear();

		const res = await service.sample([walkIn, ...venues], city, 1, {
			now: new Date('2026-10-15T17:00:00Z'),
			maxVenues: 2,
		});

		expect(res).toEqual({ venues: 4, noPlatform: 1, capped: 1, samples: 4, byPlatform: { google: 4 } });
		expect(new Set(googleLoad.mock.calls.map(([url]) => new URL(url).searchParams.get('c')))).toEqual(new Set(['m1', 'm2']));
		// Google's page is free: no Apify run
		expect(runActor).not.toHaveBeenCalled();
		em.clear();
		expect((await em.findOneOrFail(Venue, { id: venues[0].id })).reservationPartner).toBe('OpenTable');
	});

	it('stops at Google’s captcha, keeps the samples already taken and fails the run', async () => {
		const em = harness.orm.em;
		const city = testCity(em);
		const venues = ['s1', 's2', 's3'].map(id =>
			em.create(Venue, {
				city,
				placeId: `p-stop-${id}`,
				name: `Stopped ${id}`,
				bookingUrl: `https://www.google.com/maps/reserve/v/dine/c/${id}`,
			}),
		);
		await em.flush();
		google.pacing = { concurrency: 1, minPauseMs: 0, maxPauseMs: 0 };
		googleLoad.mockReset();
		let loads = 0;
		googleLoad.mockImplementation(async url => {
			// The first venue's two dates load; then Google answers with its captcha
			if (++loads > 4) throw new Error('Google answered with its captcha (unusual traffic)');
			return googlePage(url);
		});

		await expect(service.sample(venues, city, 1, { now: new Date('2026-10-15T17:00:00Z') })).rejects.toThrow(
			/google: Stopped s2: Google answered with its captcha/,
		);

		// One load at most past the captcha: the pool stops picking up venues
		expect(loads).toBe(5);
		em.clear();
		const rows = await em.find(VenueReservationSample, { venue: { $in: venues.map(v => v.id) } }, { populate: ['venue'] });
		expect(rows.map(r => [r.venue.name, r.forDate]).sort()).toEqual([
			['Stopped s1', '2026-10-16'],
			['Stopped s1', '2026-10-17'],
		]);
		google.pacing = { concurrency: 2, minPauseMs: 0, maxPauseMs: 0 };
		googleLoad.mockImplementation(async url => googlePage(url));
	});
});
