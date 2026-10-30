import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';

import { addFeedback } from 'src/modules/feedback/tests/factories/feedback.factory.js';
import type { FeedbackTopic } from 'src/modules/venues/interfaces/feedback.interface.js';
import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { TopicService } from 'src/modules/topics/services/topic.service.js';
import { MenuTopicService } from 'src/modules/topics/services/menu-topic.service.js';
import { VenueTopicService } from 'src/modules/topics/services/venue-topic.service.js';
import { seedTopics, linkTopics } from 'src/modules/topics/tests/factories/topic.factory.js';
import { Review } from 'src/modules/venues/entities/review.entity.js';
import { MenuItem } from 'src/modules/venues/entities/menu-item.entity.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { VenueBusyness } from 'src/modules/venues/entities/venue-busyness.entity.js';
import {
	DeliveryPlatformEnum,
	VenueDeliveryListing,
} from 'src/modules/venues/entities/venue-delivery-listing.entity.js';
import { VenueDeliverySnapshot } from 'src/modules/venues/entities/venue-delivery-snapshot.entity.js';
import {
	ReservationPlatformEnum,
	VenueReservationSample,
} from 'src/modules/venues/entities/venue-reservation-sample.entity.js';
import { VenueBusynessService } from 'src/modules/venues/services/venue-busyness.service.js';
import { VenueDeliveryService } from 'src/modules/venues/services/venue-delivery.service.js';
import { VenueReservationService } from 'src/modules/venues/services/venue-reservation.service.js';
import { busynessIndex } from 'src/modules/venues/util/busyness.js';
import { DETAIL_ITEM } from 'src/modules/venues/tests/fixtures/google-place-items.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import type { ReportData } from '../interfaces/report-data.interface.js';
import { ReportSignalsService, signalsPromptInput } from '../services/report-signals.service.js';

/* The report's demand, price and correlation sections from stored samples, listings and reviews. */

type SignalsInput = Pick<ReportData, 'posts' | 'reviews' | 'dishes' | 'competitors'>;

describe('ReportSignalsService (pglite)', () => {
	let harness: PgliteTestingModule;
	let service: ReportSignalsService;
	let venue: Venue;
	let quiet: Venue;
	let rival: Venue;

	const posts = [
		{ postedAt: '2026-09-08T17:00:00.000Z', views: 50_000, promotional: false },
		{ postedAt: '2026-09-10T17:00:00.000Z', views: 30_000, promotional: true },
		{ postedAt: '2026-09-22T17:00:00.000Z', views: 2_000, promotional: false },
	] as ReportData['posts'];
	const input = (): SignalsInput => ({
		posts,
		reviews: { written: 10, complaints: { price: 3 } } as unknown as ReportData['reviews'],
		dishes: [{ name: 'Döner', count: 6, positive: 5, negative: 1 }],
		competitors: [
			{
				venueId: rival.id,
				name: 'Rival',
				social: { postCount: 1, views: 1, engagements: 0, creators: 1 },
				reviewsTracked: true,
				reviews: { count: 10, written: 10, praise: {}, complaints: { price: 1 } },
			},
		],
	});

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				ReportSignalsService,
				VenueBusynessService,
				VenueReservationService,
				VenueDeliveryService,
				MenuTopicService,
				TopicService,
				VenueTopicService,
			],
		});
		service = harness.moduleRef.get(ReportSignalsService);
		entityManagerManager.setEntityManager(harness.orm.em);

		const em = harness.orm.em;
		// Only ramen (and Japanese): the döner venues keep no food topic
		seedTopics(em, ['ramen']);
		const city = testCity(em);
		venue = em.create(Venue, { city, placeId: 'sig-venue', name: 'Döner Pro', district: 'Kreuzberg' });
		quiet = em.create(Venue, { city, placeId: 'sig-quiet', name: 'Quiet', district: 'Kreuzberg' });
		rival = em.create(Venue, { city, placeId: 'sig-rival', name: 'Rival', district: 'Kreuzberg' });

		// Two September samples with popular times (Thu 10th, Sat 19th), one without, one in August
		const hist = DETAIL_ITEM.popularTimesHistogram!;
		const sample = (v: Venue, at: string, histogram: typeof hist | null, livePercent?: number) =>
			em.create(VenueBusyness, {
				venue: v,
				sampledAt: new Date(at),
				histogram,
				busynessIndex: busynessIndex(histogram),
				livePercent,
			});
		sample(venue, '2026-09-10T17:00:00Z', hist, 80);
		sample(venue, '2026-09-19T17:00:00Z', { ...hist, Sa: hist.Sa!.map(h => ({ ...h, occupancyPercent: Math.round(h.occupancyPercent / 2) })) });
		sample(venue, '2026-09-24T17:00:00Z', null);
		sample(venue, '2026-08-20T17:00:00Z', hist);
		sample(quiet, '2026-09-10T17:00:00Z', null);

		// Friday 11th 4 of 16 slots open, Saturday 12th none
		for (const [forDate, slotsOpen] of [['2026-09-11', 4], ['2026-09-12', 0]] as const)
			em.create(VenueReservationSample, {
				venue,
				platform: ReservationPlatformEnum.THEFORK,
				sampledAt: new Date('2026-09-10T17:00:00Z'),
				forDate,
				slotsOpen,
				slotsAsked: 16,
			});

		const listing = (v: Venue, rating: number, prices: Record<string, number>) => {
			const l = em.create(VenueDeliveryListing, {
				venue: v,
				platform: DeliveryPlatformEnum.WOLT,
				url: `https://wolt.com/en/deu/berlin/restaurant/${v.placeId}`,
				rating,
				reviewsCount: 100,
				deliveryFee: 1.99,
				currency: 'EUR',
				fetchedAt: new Date('2026-10-02'),
			});
			for (const [name, price] of Object.entries(prices)) em.create(MenuItem, { listing: l, month: '2026-09', name, price });
		};
		listing(venue, 4.6, { 'Döner im Brot': 8.5, 'Döner Teller': 13, Lahmacun: 7, Ayran: 2.5 });
		listing(rival, 4.2, { 'Döner im Brot': 7, 'Döner Teller': 11, Pide: 9 });

		// 13 reviews a month over the summer, then a September with a jump after the viral week
		let n = 0;
		const reviews = (count: number, day: string, complaints: FeedbackTopic[] = []) => {
			for (let i = 0; i < count; i++)
				addFeedback(
					em,
					em.create(Review, {
						venue,
						reviewId: `r${++n}`,
						publishedAt: new Date(`${day}T12:${String(i).padStart(2, '0')}:00Z`),
						stars: complaints.length ? 2 : 5,
						text: 'Text',
					}),
					{ complaints: complaints.map(topic => ({ topic, detail: 'x' })) },
				);
		};
		for (const day of ['2026-06-10', '2026-07-10', '2026-08-10']) reviews(13, day);
		reviews(2, '2026-09-02');
		reviews(2, '2026-09-09');
		reviews(8, '2026-09-16');
		reviews(2, '2026-09-23');
		reviews(2, '2026-09-29');
		reviews(1, '2026-10-02');
		await em.flush();
		// The stored topic links, as the app's writers and refresh keep them
		await linkTopics(em);
	});

	afterAll(async () => {
		await harness.stop();
	});

	it('builds busyness by week next to the views, the open tables and the month before', async () => {
		const res = await service.placeSections(venue, '2026-09', input());
		const b = res.busyness!;
		expect(b.samples).toBe(2);
		expect(b.livePercent).toBe(80);
		expect(b.peak).toEqual({ day: 'Fr', hour: 20, percent: 95 });
		expect(b.weeks.map(w => [w.week, w.index, w.posts, w.views, w.booked])).toEqual([
			['2026-08-31', undefined, 0, 0, undefined],
			['2026-09-07', 76.1, 2, 80_000, 87.5],
			['2026-09-14', 65.1, 0, 0, undefined],
			['2026-09-21', undefined, 1, 2_000, undefined],
			['2026-09-28', undefined, 0, 0, undefined],
		]);
		expect(res.busyness!.weeks.length).toBe(5);
		expect(b.previous).toMatchObject({ month: '2026-08', index: 76.1, samples: 1 });
		expect(res.demand).toEqual({
			platform: 'thefork',
			booked: 87.5,
			evenings: [
				{ date: '2026-09-11', booked: 75 },
				{ date: '2026-09-12', booked: 100 },
			],
		});
	});

	it('places the menu against the competitor’s and reads price complaints against theirs', async () => {
		const { prices } = await service.placeSections(venue, '2026-09', input());
		expect(prices!.listings).toEqual([
			expect.objectContaining({ platform: 'wolt', rating: 4.6, deliveryFee: 1.99, currency: 'EUR' }),
		]);
		expect(prices!.competitorListings).toEqual([expect.objectContaining({ name: 'Rival', rating: 4.2 })]);
		expect(prices!.menu).toMatchObject({
			median: 8.5,
			othersMedian: 9,
			othersWithMenu: 1,
			othersAre: 'competitors',
			diff: -0.056,
			dishes: [{ dish: 'Döner', price: 10.75, othersMedian: 9, othersWithDish: 1 }],
		});
		expect(prices!.priceComplaints).toEqual({ share: 0.3, written: 10, othersMedian: 0.1, others: 1 });
		expect(prices!.sentence).toBe(
			'Your median main course on Wolt is €8.50, 6 % below your competitors (€9.00); your Döner costs €10.75 against €9.00; price is criticised in 30 % of your written reviews, 10 % at your competitors\' median.',
		);
	});

	it('reads the delivery figures of the report month and the change since the month before', async () => {
		const em = harness.orm.em;
		const own = await em.findOneOrFail(VenueDeliveryListing, { venue });
		const rivals = await em.findOneOrFail(VenueDeliveryListing, { venue: rival });
		const snapshot = (listing: VenueDeliveryListing, month: string, rating: number, reviewsCount: number) =>
			em.create(VenueDeliverySnapshot, { listing, month, rating, reviewsCount, deliveryFee: 1.99, fetchedAt: new Date() });
		snapshot(own, '2026-07', 4.2, 60);
		snapshot(own, '2026-08', 4.4, 80);
		snapshot(own, '2026-09', 4.55, 100);
		// The listing row moved on since (October's scrape); September's report keeps September's
		snapshot(own, '2026-10', 4.9, 130);
		// The rival skipped August: no change to show
		snapshot(rivals, '2026-07', 4.0, 40);
		snapshot(rivals, '2026-09', 4.2, 50);
		await em.flush();

		try {
			const { prices } = await service.placeSections(venue, '2026-09', input());
			expect(prices!.listings).toEqual([
				expect.objectContaining({
					platform: 'wolt',
					rating: 4.6,
					reviewsCount: 100,
					previous: { month: '2026-08', rating: 4.4, reviewsCount: 80 },
				}),
			]);
			expect(prices!.competitorListings).toEqual([
				expect.objectContaining({ name: 'Rival', rating: 4.2, reviewsCount: 50 }),
			]);
			expect(prices!.competitorListings[0].previous).toBeUndefined();
			expect(prices!.sentence).toContain(
				'your Wolt rating is 4.6 from 100 ratings, 4.4 from 80 ratings in August 2026;',
			);

			// August: the rival wasn't scraped, so it reads July's figures, with no change
			const august = (await service.placeSections(venue, '2026-08', input())).prices!;
			expect(august.listings[0]).toMatchObject({ rating: 4.4, reviewsCount: 80, previous: { month: '2026-07' } });
			expect(august.competitorListings[0]).toMatchObject({ rating: 4, reviewsCount: 40 });
			expect(august.competitorListings[0].previous).toBeUndefined();
		} finally {
			await em.nativeDelete(VenueDeliverySnapshot, {});
		}
	});

	it('leads the menu with its own kind of food against the same on the competitors’ menus', async () => {
		const em = harness.orm.em;
		const city = testCity(em);
		const place = (placeId: string, category: string, items: Record<string, number>) => {
			const v = em.create(Venue, { city, placeId, name: placeId, category, district: 'Mitte' });
			const l = em.create(VenueDeliveryListing, {
				venue: v,
				platform: DeliveryPlatformEnum.WOLT,
				url: `https://wolt.com/en/deu/berlin/restaurant/${placeId}`,
				currency: 'EUR',
				fetchedAt: new Date('2026-10-02'),
			});
			for (const [name, price] of Object.entries(items)) em.create(MenuItem, { listing: l, month: '2026-09', name, price });
			return v;
		};
		const ichi = place('ramen-ichi', 'Ramen restaurant', { 'Tonkotsu Ramen': 15, 'Shoyu Ramen': 14, 'Chicken Katsu Curry': 12 });
		const ni = place('ramen-ni', 'Ramen restaurant', { 'Miso Ramen': 13, 'Chicken Katsu Curry': 11 });
		const san = place('ramen-san', 'Japanese restaurant', { 'Spicy Ramen': 12.8, 'Sushi Platter': 18 });
		const pizzeria = place('pizzeria', 'Pizza restaurant', { Margherita: 9, Diavola: 11 });
		await em.flush();
		await linkTopics(em);
		const against = (...venues: Venue[]): SignalsInput => ({
			...input(),
			dishes: [],
			competitors: venues.map(v => ({
				venueId: v.id,
				name: v.name,
				social: { postCount: 0, views: 0, engagements: 0, creators: 0 },
				reviewsTracked: false,
				reviews: { count: 0, written: 0, praise: {}, complaints: {} },
			})),
		});

		const { prices } = await service.placeSections(ichi, '2026-09', against(ni, san));
		// Its ramen €14.50 against the median of theirs (€13.00, €12.80)
		expect(prices!.menu!.topic).toEqual({
			key: 'ramen',
			label: 'Ramen',
			price: 14.5,
			othersMedian: 12.9,
			othersWithTopic: 2,
			diff: 0.124,
		});
		expect(prices!.menu).toMatchObject({ median: 14, othersMedian: 13.7, othersAre: 'competitors' });
		expect(prices!.sentence).toMatch(
			/^Ramen on your Wolt menu costs €14\.50, against €12\.90 at your competitors \(12 % above, 2 menus\); your median main course on Wolt is €14\.00, /,
		);

		// No other menu has ramen: its price stays, without a comparison, and the sentence leaves it out
		const alone = (await service.placeSections(ichi, '2026-09', against(pizzeria))).prices!;
		expect(alone.menu!.topic).toEqual({ key: 'ramen', label: 'Ramen', price: 14.5, othersWithTopic: 0 });
		expect(alone.sentence).toMatch(/^Your median main course on Wolt is €14\.00/);
	});

	it('computes the correlations over the stored reviews and hands the prompt sentences', async () => {
		const correlations = await service.correlations([venue], '2026-09', venue.city.timezone, input());
		const res = { ...(await service.placeSections(venue, '2026-09', input())), correlations: correlations! };
		expect(res.correlations!.buzzToReviews).toMatchObject({ peakWeek: '2026-09-07', followingReviews: 8, ratio: 2.7 });
		expect(res.correlations!.paidVsOrganic).toMatchObject({ paid: { posts: 1 }, organic: { posts: 2 } });
		// No complaints stored: that relation stays out
		expect(res.correlations!.complaintTimes).toBeUndefined();
		const prompt = signalsPromptInput(res)!;
		expect(Object.keys(prompt).sort()).toEqual(['buzzToReviews', 'footTraffic', 'openTables', 'paidVsOrganic', 'prices']);
		expect(prompt.footTraffic).toContain('busyness index');
	});

	it('leaves every section out for a venue without popular times, samples, listings or reviews', async () => {
		const res = await service.placeSections(quiet, '2026-09', { ...input(), posts: [], competitors: [] });
		expect(res).toEqual({});
		expect(await service.correlations([quiet], '2026-09', quiet.city.timezone, { posts: [] })).toBeNull();
		expect(signalsPromptInput(res)).toBeUndefined();
	});
});
