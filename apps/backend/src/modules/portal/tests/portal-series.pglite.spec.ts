import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';

import { CityService } from 'src/modules/cities/services/city.service.js';
import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { OutreachService } from 'src/modules/outreach/services/outreach.service.js';
import { Report } from 'src/modules/reports/entities/report.entity.js';
import type {
	ReportCompetitor,
	ReportData,
	ReportHighlights,
} from 'src/modules/reports/interfaces/report-data.interface.js';
import { ReportService } from 'src/modules/reports/services/report.service.js';
import { OwnAccountService } from 'src/modules/social/services/own-account.service.js';
import { SocialAccountService } from 'src/modules/social/services/social-account.service.js';
import { Brand, BrandReportScopeEnum } from 'src/modules/venues/entities/brand.entity.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { VenueBusyness } from 'src/modules/venues/entities/venue-busyness.entity.js';
import {
	ReservationPlatformEnum,
	VenueReservationSample,
} from 'src/modules/venues/entities/venue-reservation-sample.entity.js';
import { BrandService } from 'src/modules/venues/services/brand.service.js';
import { VenueBusynessService } from 'src/modules/venues/services/venue-busyness.service.js';
import { VenueReservationService } from 'src/modules/venues/services/venue-reservation.service.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { PortalService } from '../services/portal.service.js';
import { monthWindow } from '../util/portal-series.js';

/* The Trends tab's series: one row per month read from the stored reports, nulls where a
 * month has none, the month before a report filled from its look back, and older reports
 * that lack the newer `ReportData` fields read without failing. */

const social = (posts: number, views: number) => ({
	postCount: posts,
	tiktokCount: posts,
	instagramCount: 0,
	views,
	engagements: views / 10,
	creators: Math.max(1, posts - 1),
	promotional: 0,
	sentiment: { positive: posts, mixed: 0, neutral: 0, negative: 0 },
	praise: {},
	complaints: {},
});

const reviews = (count: number, avgStars: number) => ({
	count,
	written: count,
	avgStars,
	replyRate: 0.5,
	stars: [],
	praise: { service: 2, food: count },
	complaints: { price: 1 },
	split: {} as ReportData['reviews']['split'],
	changes: [],
	critical: [],
	list: [],
	replyDrafts: [],
});

// Competitors stored in a report name real venues by uuid; these two are never sampled
const COMPETITOR_IDS: Record<string, string> = {
	Rival: '00000000-0000-4000-8000-00000000000a',
	Untracked: '00000000-0000-4000-8000-00000000000b',
};

const competitor = (name: string, views: number): ReportCompetitor => ({
	venueId: COMPETITOR_IDS[name] ?? `id-${name}`,
	name,
	rating: 4.2,
	social: { postCount: 2, views, engagements: 0, creators: 2 },
	reviewsTracked: name !== 'Untracked',
	reviews: { count: 5, written: 4, avgStars: 4, replyRate: 0.2, praise: {}, complaints: {} },
});

describe('the portal series (pglite)', () => {
	let harness: PgliteTestingModule;
	let service: PortalService;
	let venue: Venue;
	const now = new Date('2026-10-17T12:00:00Z');

	const addReport = async (month: string, data: Partial<ReportData>) => {
		harness.orm.em.create(Report, {
			brand: venue.brand,
			city: venue.city,
			month,
			data: { month, ...data } as ReportData,
			highlights: { title: 'T', headline: 'H', highlights: [], actions: [] } as ReportHighlights,
		});
		await harness.orm.em.flush();
	};

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				BrandService,
				CityService,
				PortalService,
				ReportService,
				OutreachService,
				VenueBusynessService,
				OwnAccountService,
				SocialAccountService,
				VenueReservationService,
			],
		});
		service = harness.moduleRef.get(PortalService);
		entityManagerManager.setEntityManager(harness.orm.em);

		venue = harness.orm.em.create(Venue, {
			city: testCity(harness.orm.em),
			placeId: 'series-venue',
			name: 'Series Venue',
		});
		await harness.orm.em.flush();

		// A full, current report
		await addReport('2026-09', {
			venue: {
				id: venue.id,
				name: venue.name,
				rating: 4.6,
				reviewsCount: 210,
				ratingTrend: [
					{ month: '2026-07', date: '2026-08-02', rating: 4.4, reviewsCount: 190 },
					{ month: '2026-09', date: '2026-10-02', rating: 4.6, reviewsCount: 210 },
				],
			},
			previous: {
				month: '2026-08',
				social: { postCount: 3, views: 900, engagements: 90, creators: 2, promotional: 0 },
				reviews: { count: 4, written: 3, avgStars: 4.5, replyRate: 0.25 },
			},
			social: social(6, 12000),
			reviews: reviews(8, 4.4),
			dishes: [
				{ name: 'Döner', count: 5, positive: 4, negative: 1 },
				{ name: 'Ayran', count: 9, positive: 9, negative: 0 },
			],
			competitors: [competitor('Rival', 3000), competitor('Untracked', 100)],
		});
		// An old report from before `previous`, `ratingTrend` and `competitors` existed
		await addReport('2026-05', {
			venue: { id: venue.id, name: venue.name, rating: 4.3 } as ReportData['venue'],
			social: social(2, 500),
			reviews: reviews(3, 4.0),
			dishes: [],
		});
		// Outside a 12-month window
		await addReport('2025-06', { social: social(1, 1), reviews: reviews(1, 1), dishes: [] });
	});

	afterAll(async () => {
		await harness.stop();
	});

	it('answers twelve months, oldest first, ending with the last finished one', async () => {
		const { months } = await service.series(venue.brand.id, 12, undefined, now);
		expect(months.map(row => row.month)).toEqual(monthWindow('2026-09', 12));
		expect(months[0].month).toBe('2025-10');
	});

	it('reads a month with a report from it, and nulls a month with none', async () => {
		const { months } = await service.series(venue.brand.id, 12, undefined, now);
		const byMonth = Object.fromEntries(months.map(row => [row.month, row]));

		expect(byMonth['2026-09']).toMatchObject({
			social: { posts: 6, views: 12000, sentiment: { positive: 6 } },
			reviews: { count: 8, written: 8, avgStars: 4.4, replyRate: 0.5 },
			topics: { praise: { service: 2, food: 8 }, complaints: { price: 1 } },
			dishes: [
				{ name: 'Ayran', count: 9 },
				{ name: 'Döner', count: 5 },
			],
			rating: 4.6,
			reviewsCount: 210,
		});
		expect(byMonth['2026-09'].reportId).toEqual(expect.any(String));

		expect(byMonth['2026-06']).toEqual({
			month: '2026-06',
			reportId: null,
			social: null,
			reviews: null,
			topics: null,
			dishes: null,
			rating: null,
			reviewsCount: null,
			competitors: [],
		});
	});

	it("fills the month before a report from its look back, and the rating from its trend", async () => {
		const { months } = await service.series(venue.brand.id, 12, undefined, now);
		const byMonth = Object.fromEntries(months.map(row => [row.month, row]));

		expect(byMonth['2026-08']).toMatchObject({
			reportId: null,
			social: { posts: 3, views: 900, creators: 2 },
			reviews: { count: 4, avgStars: 4.5 },
			topics: null,
		});
		expect(byMonth['2026-08'].social?.sentiment).toBeUndefined();
		expect(byMonth['2026-07']).toMatchObject({ reportId: null, rating: 4.4, reviewsCount: 190 });
	});

	it('reads an old report without the newer fields', async () => {
		const { months } = await service.series(venue.brand.id, 12, undefined, now);
		const may = months.find(row => row.month === '2026-05')!;
		expect(may).toMatchObject({ social: { posts: 2 }, rating: 4.3, competitors: [] });
		expect(may.reviewsCount).toBeNull();
	});

	it('carries the competitors, unknown reviews left out for an untracked one', async () => {
		const { months, competitors } = await service.series(venue.brand.id, 12, undefined, now);
		expect(competitors.map(c => c.name)).toEqual(['Rival', 'Untracked']);
		const september = months.find(row => row.month === '2026-09')!;
		expect(september.competitors).toEqual([
			{
				venueId: COMPETITOR_IDS.Rival,
				name: 'Rival',
				posts: 2,
				views: 3000,
				creators: 2,
				reviewsTracked: true,
				reviews: 5,
				avgStars: 4,
				replyRate: 0.2,
				rating: 4.2,
			},
			{
				venueId: COMPETITOR_IDS.Untracked,
				name: 'Untracked',
				posts: 2,
				views: 100,
				creators: 2,
				reviewsTracked: false,
				rating: 4.2,
			},
		]);
	});

	it('joins the month’s busyness samples, leaving months without popular times bare', async () => {
		const em = harness.orm.em;
		const sample = (sampledAt: string, index: number | null, fr19: number) =>
			em.create(VenueBusyness, {
				venue,
				sampledAt: new Date(sampledAt),
				busynessIndex: index,
				histogram: index === null ? null : { Fr: [{ hour: 19, occupancyPercent: fr19 }, { hour: 20, occupancyPercent: 40 }] },
			});
		sample('2026-09-10T17:00:00Z', 60, 80);
		sample('2026-09-12T17:00:00Z', 70, 100);
		// No popular times that day: not a zero
		sample('2026-09-17T17:00:00Z', null, 0);
		sample('2026-08-20T17:00:00Z', null, 0);
		await em.flush();

		const { months } = await service.series(venue.brand.id, 12, undefined, now);
		const byMonth = Object.fromEntries(months.map(row => [row.month, row]));
		expect(byMonth['2026-09'].busyness).toEqual({ index: 65, samples: 2, peakDay: 'Fr', peakHour: 19 });
		expect(byMonth['2026-08'].busyness).toBeUndefined();
	});

	it('gives booked out per month for the described branch, each competitor and the district’s median, absent without samples', async () => {
		const em = harness.orm.em;
		const city = testCity(em);
		const make = (name: string, district: string) =>
			em.create(Venue, { city, placeId: `series-booked-${name}`, name, district });
		const booked = make('Booked', 'Kreuzberg');
		const rival = make('Booked rival', 'Mitte');
		const quiet = make('Quiet rival', 'Mitte');
		const sample = (v: Venue, forDate: string, slotsOpen: number) =>
			em.create(VenueReservationSample, {
				venue: v,
				platform: ReservationPlatformEnum.GOOGLE,
				sampledAt: new Date(`${forDate}T05:00:00Z`),
				forDate,
				slotsOpen,
				slotsAsked: 16,
				partySize: 2,
			});
		// September: the venue 75 % and 100 %; August: the rival only
		sample(booked, '2026-09-11', 4);
		sample(booked, '2026-09-12', 0);
		sample(rival, '2026-09-11', 8);
		sample(rival, '2026-08-14', 0);
		// Five Kreuzberg venues on the venue's evenings: 100, 75, 50, 25, 0 → 50; one on another evening
		for (const [i, open] of [0, 4, 8, 12, 16].entries()) sample(make(`Kreuzberg ${i}`, 'Kreuzberg'), '2026-09-11', open);
		sample(make('Kreuzberg later', 'Kreuzberg'), '2026-09-18', 16);
		// Ids are the database's: flush before the reports copy them
		await em.flush();
		const competitorOf = (v: Venue): ReportCompetitor => ({ ...competitor(v.name, 10), venueId: v.id });
		for (const month of ['2026-08', '2026-09'])
			em.create(Report, {
				brand: booked.brand,
				city,
				month,
				data: {
					month,
					social: social(1, 10),
					reviews: reviews(1, 5),
					dishes: [],
					competitors: [competitorOf(rival), competitorOf(quiet)],
				} as unknown as ReportData,
				highlights: { title: 'T', headline: 'H', highlights: [], actions: [] } as ReportHighlights,
			});
		await em.flush();

		const { months } = await service.series(booked.brand.id, 3, undefined, now);
		const byMonth = Object.fromEntries(months.map(row => [row.month, row]));
		expect(byMonth['2026-09'].booked).toBe(87.5);
		expect(byMonth['2026-09'].districtBooked).toBe(50);
		expect(byMonth['2026-09'].competitors.map(c => [c.name, c.booked])).toEqual([
			['Booked rival', 50],
			['Quiet rival', undefined],
		]);
		// August: the rival was sampled, the venue wasn't, so no district line either
		expect(byMonth['2026-08'].booked).toBeUndefined();
		expect(byMonth['2026-08'].districtBooked).toBeUndefined();
		expect(byMonth['2026-08'].competitors.map(c => c.booked)).toEqual([100, undefined]);
		expect(byMonth['2026-07'].booked).toBeUndefined();
	});

	it('ends the window with a report newer than the last finished month', async () => {
		await addReport('2026-10', { social: social(1, 10), reviews: reviews(1, 5), dishes: [] });
		const { months } = await service.series(venue.brand.id, 3, undefined, now);
		expect(months.map(row => row.month)).toEqual(['2026-08', '2026-09', '2026-10']);
	});

	it("reads one city's reports: another city's branch has its own series", async () => {
		const em = harness.orm.em;
		const hamburg = testCity(em, { name: 'Hamburg' });
		em.create(Venue, { city: hamburg, brand: venue.brand, placeId: 'series-hamburg', name: 'Series Venue Hamburg' });
		em.create(Report, {
			brand: venue.brand,
			city: hamburg,
			month: '2026-09',
			data: { month: '2026-09', social: social(40, 99000), reviews: reviews(1, 5), dishes: [] } as unknown as ReportData,
			highlights: { title: 'T', headline: 'H', highlights: [], actions: [] } as ReportHighlights,
		});
		await em.flush();

		const berlin = await service.series(venue.brand.id, 3, venue.city.id, now);
		const there = await service.series(venue.brand.id, 3, hamburg.id, now);
		const september = (s: typeof berlin) => s.months.find(row => row.month === '2026-09')!;
		expect(september(berlin).social?.posts).toBe(6);
		expect(september(there).social?.posts).toBe(40);
	});

	it('reads the reports across all cities for a brand reported that way, whatever the city asked', async () => {
		const em = harness.orm.em;
		em.create(Report, {
			brand: venue.brand,
			city: null,
			month: '2026-09',
			data: { month: '2026-09', social: social(77, 150000), reviews: reviews(2, 4), dishes: [] } as unknown as ReportData,
			highlights: { title: 'T', headline: 'H', highlights: [], actions: [] } as ReportHighlights,
		});
		const brand = await em.findOneOrFail(Brand, { id: venue.brand.id });
		brand.reportScope = BrandReportScopeEnum.ALL;
		await em.flush();

		const { months } = await service.series(venue.brand.id, 3, venue.city.id, now);
		expect(months.find(row => row.month === '2026-09')!.social?.posts).toBe(77);
		expect((await service.brand(venue.brand.id)).reportScope).toBe(BrandReportScopeEnum.ALL);

		brand.reportScope = BrandReportScopeEnum.CITY;
		await em.flush();
	});
});
