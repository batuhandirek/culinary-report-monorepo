import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';

import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { VenueBusyness } from 'src/modules/venues/entities/venue-busyness.entity.js';
import {
	ReservationPlatformEnum,
	VenueReservationSample,
} from 'src/modules/venues/entities/venue-reservation-sample.entity.js';
import { VenueBusynessService } from 'src/modules/venues/services/venue-busyness.service.js';
import { VenueDeliveryService } from 'src/modules/venues/services/venue-delivery.service.js';
import { VenueReservationService } from 'src/modules/venues/services/venue-reservation.service.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import type { ReportCompetitor, ReportData } from '../interfaces/report-data.interface.js';
import {
	competitorFootTrafficSentence,
	ReportSignalsService,
	signalsPromptInput,
	weekendTablesSentence,
} from '../services/report-signals.service.js';

/* Competitors' and the district's booked-out shares next to the venue's, and competitors' busyness change. */

describe('Report competitor and district demand (pglite)', () => {
	let harness: PgliteTestingModule;
	let service: ReportSignalsService;
	let home: Venue;
	let small: Venue;
	let rivals: Venue[];

	const competitor = (v: Venue): ReportCompetitor => ({
		venueId: v.id,
		name: v.name,
		social: { postCount: 0, views: 0, engagements: 0, creators: 0 },
		reviewsTracked: false,
		reviews: { count: 0, written: 0, praise: {}, complaints: {} },
	});
	const input = (venues: Venue[]): Pick<ReportData, 'posts' | 'reviews' | 'dishes' | 'competitors'> => ({
		posts: [],
		reviews: { written: 0, complaints: {} } as unknown as ReportData['reviews'],
		dishes: [],
		competitors: venues.map(competitor),
	});

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [ReportSignalsService, VenueBusynessService, VenueReservationService, VenueDeliveryService],
		});
		service = harness.moduleRef.get(ReportSignalsService);
		entityManagerManager.setEntityManager(harness.orm.em);

		const em = harness.orm.em;
		const city = testCity(em);
		const venue = (name: string, district: string) =>
			em.create(Venue, { city, placeId: `cd-${name}`, name, district });
		const sample = (v: Venue, forDate: string, slotsOpen: number, sampledAt = '2026-09-10T17:00:00Z') =>
			em.create(VenueReservationSample, {
				venue: v,
				platform: ReservationPlatformEnum.GOOGLE,
				sampledAt: new Date(sampledAt),
				forDate,
				slotsOpen,
				slotsAsked: 16,
				partySize: 2,
			});
		const both = (v: Venue, open: number) => {
			sample(v, '2026-09-11', open);
			sample(v, '2026-09-12', open);
		};

		// The venue: Friday 4 of 16 open (75 %), Saturday none (100 %)
		home = venue('Home', 'Kreuzberg');
		sample(home, '2026-09-11', 4);
		sample(home, '2026-09-12', 0);
		// Two competitors in Mitte with samples, one without (busyness only)
		rivals = [venue('Rival A', 'Mitte'), venue('Rival B', 'Mitte'), venue('Rival C', 'Mitte')];
		both(rivals[0], 8);
		sample(rivals[1], '2026-09-11', 16);
		sample(rivals[1], '2026-09-12', 12);
		// Six district venues: 100, 75, 50, 25, 0, 75 → median 62.5
		const district = [0, 4, 8, 12, 16, 4].map((open, i) => {
			const v = venue(`Kreuzberg ${i}`, 'Kreuzberg');
			both(v, open);
			return v;
		});
		// An older ask of a district venue's evening is replaced by the later one; an evening the
		// venue wasn't sampled on doesn't count
		const k1 = district[1];
		sample(k1, '2026-09-11', 16, '2026-09-04T17:00:00Z');
		sample(k1, '2026-09-18', 16);

		// Busyness: Rival C in August and September, Rival A in September only
		const busy = (v: Venue, at: string, busynessIndex: number) =>
			em.create(VenueBusyness, { venue: v, sampledAt: new Date(at), busynessIndex });
		busy(rivals[2], '2026-08-20T17:00:00Z', 40);
		busy(rivals[2], '2026-09-10T17:00:00Z', 50);
		busy(rivals[2], '2026-09-19T17:00:00Z', 44);
		busy(rivals[0], '2026-09-10T17:00:00Z', 70);

		// A venue whose district has only four sampled venues on its evenings
		small = venue('Small', 'Neukölln');
		sample(small, '2026-09-25', 8);
		for (let i = 0; i < 4; i++) sample(venue(`Neukölln ${i}`, 'Neukölln'), '2026-09-25', i * 4);
		await em.flush();
	});

	// What the report puts together for a place: its sections beside the competitors' signals
	const sections = async (v: Venue, data: ReturnType<typeof input>) => ({
		...(await service.placeSections(v, '2026-09', data)),
		competitors: await service.competitorSignals(data.competitors, '2026-09'),
	});

	afterAll(async () => {
		await harness.stop();
	});

	it('puts competitors’ booked-out shares and busyness, and the district and city medians, next to the venue’s', async () => {
		const res = await sections(home, input(rivals));

		expect(res.demand).toEqual({
			platform: 'google',
			booked: 87.5,
			evenings: [
				{ date: '2026-09-11', booked: 75 },
				{ date: '2026-09-12', booked: 100 },
			],
			// The six Kreuzberg venues on the venue's two evenings
			district: { median: 62.5, venues: 6 },
			// …and the two sampled competitors: 0, 12.5, 25, 50, 50, 75, 75, 100
			city: { median: 50, venues: 8 },
		});
		expect(res.competitors!.map(c => [c.name, c.demand, c.busyness])).toEqual([
			['Rival A', { booked: 50, evenings: 2 }, { index: 70 }],
			['Rival B', { booked: 12.5, evenings: 2 }, undefined],
			// No reservation samples: no demand, never zero
			['Rival C', undefined, { index: 47, previousIndex: 40 }],
		]);
	});

	it('leaves the district (and city) out below five venues', async () => {
		const res = await sections(small, input([]));
		expect(res.demand).toEqual({ platform: 'google', booked: 50, evenings: [{ date: '2026-09-25', booked: 50 }] });
		expect(res.competitors).toEqual([]);
	});

	it('hands the prompt the comparison only when the venue, competitors and district all have figures', async () => {
		const res = await sections(home, input(rivals));
		const prompt = signalsPromptInput(res)!;
		expect(prompt.weekendTables).toBe(
			"Friday and Saturday evenings booked out: yours 87.5 %; your competitors' Rival A 50 %, Rival B 12.5 %; " +
				"your district's 62.5 % (median of 6 venues); across the city 50 % (median of 8 venues). " +
				'The same question (a table for two, 18:00–22:00) was asked of every venue, so these compare directly.',
		);
		expect(prompt.competitorFootTraffic).toBe(
			'Google busyness index change on the month before, in points: Rival C +7. ' +
				"Each index is relative to that venue's own peak: compare the changes, never the levels.",
		);
		// Without the district, or without a sampled competitor, no comparison
		expect(weekendTablesSentence({ demand: { ...res.demand!, district: undefined }, competitors: res.competitors })).toBeUndefined();
		expect(weekendTablesSentence({ demand: res.demand, competitors: [] })).toBeUndefined();
		expect(competitorFootTrafficSentence({ busyness: undefined, competitors: input(rivals).competitors })).toBeUndefined();
	});
});
