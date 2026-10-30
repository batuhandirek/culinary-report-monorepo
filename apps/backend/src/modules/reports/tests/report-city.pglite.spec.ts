import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';

import type { City } from 'src/modules/cities/entities/city.entity.js';
import { addFeedback } from 'src/modules/feedback/tests/factories/feedback.factory.js';
import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { TopicService } from 'src/modules/topics/services/topic.service.js';
import { VenueTopicService } from 'src/modules/topics/services/venue-topic.service.js';
import { seedTopics, linkTopics } from 'src/modules/topics/tests/factories/topic.factory.js';
import { Mention } from 'src/modules/social/entities/mention.entity.js';
import { SocialPlatformEnum, SocialPost } from 'src/modules/social/entities/social-post.entity.js';
import { SearchInterestService } from 'src/modules/trends/services/search-interest.service.js';
import { TrendService } from 'src/modules/trends/services/trend.service.js';
import {
	VenueScrapeSourceEnum,
	VenueStatusChangeKindEnum,
} from 'src/modules/venues/constants/venue-status.constant.js';
import { Review } from 'src/modules/venues/entities/review.entity.js';
import { Brand } from 'src/modules/venues/entities/brand.entity.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { VenueStatusChange } from 'src/modules/venues/entities/venue-status-change.entity.js';
import { VenueStatusChangeService } from 'src/modules/venues/services/venue-status-change.service.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { Report } from '../entities/report.entity.js';
import type { ReportData } from '../interfaces/report-data.interface.js';
import { ReportCityService } from '../services/report-city.service.js';

describe('ReportCityService (pglite)', () => {
	let harness: PgliteTestingModule;
	let service: ReportCityService;
	let city: City;
	let me: Venue;
	let rival: Venue;
	let pizza: Venue;
	let thin: Venue;

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				ReportCityService,
				TrendService,
				VenueStatusChangeService,
				SearchInterestService,
				TopicService,
				VenueTopicService,
			],
		});
		service = harness.moduleRef.get(ReportCityService);
		entityManagerManager.setEntityManager(harness.orm.em);
		seedTopics(harness.orm.em);

		const em = harness.orm.em;
		city = testCity(em);
		const venue = (placeId: string, name: string, category: string) =>
			em.create(Venue, { city, placeId, name, category, district: 'Mitte' });
		me = venue('me', 'Ramen Ichi', 'Ramen restaurant');
		rival = venue('rival', 'Ramen Ni', 'Ramen restaurant');
		pizza = venue('pizza', 'Pizza Tre', 'Pizza restaurant');

		let n = 0;
		const mention = (v: Venue, date: string, cuisine: string, views: number) => {
			const post = em.create(SocialPost, {
				city: v.city,
				externalId: `post-${n++}`,
				platform: SocialPlatformEnum.TIKTOK,
				url: `https://tiktok.com/${n}`,
				author: `creator${n}`,
				views,
				postedAt: new Date(`${date}T12:00:00Z`),
			});
			em.create(Mention, {
				post,
				venue: v,
				brand: (v.brand ??= em.create(Brand, { name: v.name, key: v.name.toLowerCase() })),
				venueName: v.name,
				cuisine,
				visited: true,
				sentiment: 'positive',
				summary: 'Good.',
			});
		};
		// August: ramen is a tenth of the talk; September: a fifth, out of 200 mentions
		for (let i = 0; i < 10; i++) mention(rival, '2026-08-05', 'Ramen', 100);
		for (let i = 0; i < 90; i++) mention(pizza, '2026-08-06', 'Pizza', 100);
		for (let i = 0; i < 30; i++) mention(rival, '2026-09-05', 'Ramen', 1000);
		for (let i = 0; i < 10; i++) mention(me, '2026-09-06', 'Ramen', 500);
		for (let i = 0; i < 160; i++) mention(pizza, '2026-09-07', 'Pizza', 100);

		const review = (v: Venue, id: string, stars: number, ownerResponse?: string) =>
			em.create(Review, {
				venue: v,
				reviewId: id,
				stars,
				ownerResponse,
				publishedAt: new Date('2026-09-10T00:00:00Z'),
			});
		review(me, 'm1', 5, 'Thanks!');
		review(me, 'm2', 3);
		review(rival, 'r1', 5);
		// The rival already has a report this month: the fallback compares with it
		em.create(Report, {
			brand: (rival.brand ??= em.create(Brand, { name: rival.name, key: rival.name.toLowerCase() })),
			city: rival.city,
			month: '2026-09',
			data: {} as ReportData,
			highlights: { title: '', headline: '', highlights: [], actions: [] },
		});

		// A city that talked too little this month
		thin = em.create(Venue, {
			city: testCity(em, { name: 'Wien' }),
			placeId: 'thin',
			name: 'Beisl',
			category: 'Austrian restaurant',
		});
		mention(thin, '2026-09-05', 'Austrian', 100);
		await em.flush();
		// The stored topic links, as the app's writers and refresh keep them
		await linkTopics(em);
		await em.populate([me, thin], ['city']);
	});

	afterAll(async () => {
		await harness.stop();
	});

	it('places the venue in its food and against the report venues', async () => {
		const section = await service.section([me], '2026-09');
		expect(section).toMatchObject({ cityName: city.name, mentions: 200 });
		expect(section?.risingCuisines.map(r => [r.key, r.share, r.prevShare, r.delta])).toEqual([
			['ramen', 20, 10, 10],
		]);
		// Two ramen places mentioned; the rival's 30k views ahead of its 5k
		expect(section?.cuisine).toMatchObject({ key: 'ramen', venues: 2, rank: 2, share: 20 });
		// Without peers given: the month's reports (the rival) and the venue itself
		expect(section?.baseline.venues).toBe(2);
		expect(section?.baseline.views).toEqual({
			venue: 5000,
			median: 17500,
			percentile: 0,
			venues: 2,
		});
		expect(section?.baseline.replyRate).toMatchObject({ venue: 0.5, percentile: 100 });
		expect(section?.baseline.avgStars).toMatchObject({ venue: 4, median: 4.5, percentile: 0 });
	});

	it('takes the report venues it is given', async () => {
		const section = await service.section([me], '2026-09', [me.brand.id, rival.brand.id, pizza.brand.id]);
		expect(section?.baseline.venues).toBe(3);
		// 16k pizza views and 30k rival views against its 5k
		expect(section?.baseline.views).toMatchObject({ median: 16000, percentile: 0 });
		expect(section?.baseline.posts).toMatchObject({ venue: 10, median: 30, percentile: 0 });
	});

	it("counts the district's openings and closures this quarter, the venue's street first", async () => {
		const em = harness.orm.em;
		// Before the city's first city-wide list, openings are unknown
		expect(await service.neighbourhood(me, '2026-09')).toBeUndefined();

		me.street = 'Torstraße 12';
		city.venuesScrapedAt = new Date('2026-07-02T08:00:00Z');
		const change = (
			name: string,
			street: string,
			kind: VenueStatusChangeKindEnum,
			at: string,
			district = 'Mitte',
		) =>
			em.create(VenueStatusChange, {
				venue: em.create(Venue, { city, placeId: name, name, street, district }),
				kind,
				at: new Date(at),
				source: VenueScrapeSourceEnum.CITY,
			});
		change('Neu Eins', 'Torstraße 3', VenueStatusChangeKindEnum.OPENED, '2026-10-02T08:00:00Z');
		change(
			'Neu Zwei',
			'Linienstraße 40',
			VenueStatusChangeKindEnum.OPENED,
			'2026-08-15T08:00:00Z',
		);
		change(
			'Zu',
			'Torstraße 99a',
			VenueStatusChangeKindEnum.PERMANENTLY_CLOSED,
			'2026-09-20T08:00:00Z',
		);
		// Too early for the quarter, and another district
		change('Alt', 'Torstraße 5', VenueStatusChangeKindEnum.OPENED, '2026-07-02T08:00:00Z');
		change(
			'Weit',
			'Torstraße 7',
			VenueStatusChangeKindEnum.OPENED,
			'2026-09-01T08:00:00Z',
			'Neukölln',
		);
		await em.flush();

		const changes = (await service.neighbourhood(me, '2026-09'))!.changes;
		expect(changes).toMatchObject({
			from: '2026-07',
			to: '2026-09',
			district: 'Mitte',
			opened: 2,
			closed: 1,
			reopened: 0,
			street: { name: 'Torstraße', opened: 1, closed: 1, reopened: 0 },
		});
		// The scrape on 2 October closes September; the street's first
		expect(changes.venues.map(v => [v.name, v.kind, v.sameStreet])).toEqual([
			['Neu Eins', 'opened', true],
			['Zu', 'permanently_closed', true],
			['Neu Zwei', 'opened', false],
		]);
	});

	it('counts the openings a matched post announced, once per venue', async () => {
		const em = harness.orm.em;
		let n = 0;
		// Two people's posts each: one post alone is no opening (`postOpeningsSql`)
		const flag = (venue: Venue, date: string) => {
			flagOne(venue, date);
			flagOne(venue, date);
		};
		const flagOne = (venue: Venue, date: string) =>
			em.create(Mention, {
				post: em.create(SocialPost, {
					city,
					externalId: `opening-${n++}`,
					platform: SocialPlatformEnum.TIKTOK,
					url: `https://tiktok.com/opening-${n}`,
					author: `opener${n}`,
					views: 100,
					postedAt: new Date(`${date}T12:00:00Z`),
				}),
				venue,
				brand: (venue.brand ??= em.create(Brand, {
					name: venue.name,
					key: venue.name.toLowerCase(),
				})),
				venueName: venue.name,
				visited: true,
				isNewOpening: true,
				sentiment: 'positive',
				summary: 'Just opened.',
			});
		const place = (name: string, street: string, extra: Partial<Venue> = {}) =>
			em.create(Venue, {
				city,
				placeId: name,
				name,
				street,
				district: 'Mitte',
				reviewsCount: 40,
				...extra,
			});
		flag(place('Frisch', 'Torstraße 20'), '2026-08-20');
		// Too well known to be new, closed, before the quarter, another district
		flag(place('Gross', 'Torstraße 21', { reviewsCount: 300 }), '2026-09-02');
		flag(place('Geschlossen', 'Linienstraße 2', { closed: true }), '2026-09-03');
		flag(place('Frueh', 'Linienstraße 3'), '2026-06-28');
		flag(place('Drüben', 'Torstraße 22', { district: 'Neukölln' }), '2026-09-04');
		// A scrape saw it open too: listed once, as the scrape's
		const scraped = await em.findOneOrFail(Venue, { placeId: 'Neu Zwei' });
		flag(scraped, '2026-08-01');
		await em.flush();

		const changes = (await service.neighbourhood(me, '2026-09'))!.changes;
		expect(changes).toMatchObject({
			opened: 3,
			openedFromPosts: 1,
			closed: 1,
			street: { name: 'Torstraße', opened: 2, openedFromPosts: 1, closed: 1 },
		});
		expect(changes.venues.map(v => [v.name, v.kind, v.date, v.sameStreet, v.source])).toEqual([
			['Neu Eins', 'opened', '2026-10-02', true, undefined],
			['Zu', 'permanently_closed', '2026-09-20', true, undefined],
			['Frisch', 'opened', '2026-08-20', true, 'posts'],
			['Neu Zwei', 'opened', '2026-08-15', false, undefined],
		]);
	});

	// Each complaint theme of the venue's written reviews, against the median of the report venues
	it('compares the venue\'s complaint themes with the report venues\'', async () => {
		const em = harness.orm.em;
		const written = (v: Venue, id: string, complaints: { theme: string; detail: string }[] = []) =>
			addFeedback(
				em,
				em.create(Review, { venue: v, reviewId: id, stars: 3, text: 'Written', publishedAt: new Date('2026-09-12T00:00:00Z') }),
				{ complaints },
			);
		const increase = [{ theme: 'price_increase', detail: 'prices went up' }];
		const peers = [1, 2, 3, 4, 5].map(i =>
			em.create(Venue, { city, placeId: `theme-peer-${i}`, name: `Peer ${i}`, category: 'Restaurant', district: 'Mitte' }),
		);
		await em.flush();
		for (let i = 0; i < 5; i++) written(me, `theme-me-${i}`, i < 2 ? increase : []);
		for (const [p, peer] of peers.entries())
			for (let i = 0; i < 5; i++) written(peer, `theme-p${p}-${i}`, p === 0 && i === 0 ? increase : []);
		await em.flush();

		const section = await service.section([me], '2026-09', peers.map(p => p.brand.id));
		expect(section?.themes).toEqual([
			{ key: 'price_increase', label: 'Price increase', topic: 'price', reviews: 2, venueShare: 0.4, median: 0, venues: 5 },
		]);
	});

	it('leaves the section out when the city talked too little', async () => {
		expect(await service.section([thin], '2026-09')).toBeUndefined();
	});
});
