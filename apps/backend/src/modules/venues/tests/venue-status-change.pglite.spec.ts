import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';

import { ApifyService } from 'src/modules/apify/services/apify.service.js';
import { City } from 'src/modules/cities/entities/city.entity.js';
import { cityFactory } from 'src/modules/cities/tests/factories/city.factory.js';
import { Mention } from 'src/modules/social/entities/mention.entity.js';
import { SocialPlatformEnum, SocialPost } from 'src/modules/social/entities/social-post.entity.js';
import { FoodTopicService } from 'src/modules/food-topics/services/food-topic.service.js';
import { VenueFoodTopicService } from 'src/modules/food-topics/services/venue-food-topic.service.js';
import { seedFoodTopics } from 'src/modules/food-topics/tests/factories/food-topic.factory.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import {
	VenueScrapeSourceEnum,
	VenueStatusChangeKindEnum,
} from '../constants/venue-status.constant.js';
import { Venue } from '../entities/venue.entity.js';
import { VenueStatusChange } from '../entities/venue-status-change.entity.js';
import { GooglePlaceItem, VenueService } from '../services/venue.service.js';
import { VenueScrapeService } from '../services/venue-scrape.service.js';
import { VenueStatusChangeService } from '../services/venue-status-change.service.js';
import { quarterWindow, statusChangeKind, streetName } from '../util/venue-status.js';

// What `compass/crawler-google-places` returns for a place, cut to the fields we read
const place = (placeId: string, extra: Partial<GooglePlaceItem> = {}): GooglePlaceItem => ({
	placeId,
	title: `Place ${placeId}`,
	city: 'Berlin',
	neighborhood: 'Mitte',
	street: 'Torstraße 1',
	categoryName: 'Ramen restaurant',
	totalScore: 4.5,
	reviewsCount: 12,
	permanentlyClosed: false,
	temporarilyClosed: false,
	...extra,
});

describe('venue status helpers', () => {
	it('names the change between two states', () => {
		expect(statusChangeKind('open', 'open')).toBeNull();
		expect(statusChangeKind('open', 'temporarily_closed')).toBe('temporarily_closed');
		expect(statusChangeKind('temporarily_closed', 'permanently_closed')).toBe(
			'permanently_closed',
		);
		expect(statusChangeKind('permanently_closed', 'open')).toBe('reopened');
	});

	it('compares streets without house numbers', () => {
		expect(streetName('Oranienstraße 12a')).toBe('oranienstraße');
		expect(streetName('Torstraße 10-12')).toBe('torstraße');
		expect(streetName('Kottbusser Damm')).toBe('kottbusser damm');
		expect(streetName(null)).toBeUndefined();
	});

	it("counts a scrape in a month's first week for the month before", () => {
		const w = quarterWindow('2026-12');
		expect(w.from).toBe('2026-10');
		expect(w.start.toISOString()).toBe('2026-10-08T00:00:00.000Z');
		expect(w.end.toISOString()).toBe('2027-01-08T00:00:00.000Z');
	});
});

describe('VenueStatusChange (pglite)', () => {
	let harness: PgliteTestingModule;
	let venueService: VenueService;
	let scrapeService: VenueScrapeService;
	let statusService: VenueStatusChangeService;
	let city: City;
	const runActor = jest.fn<(...args: unknown[]) => Promise<GooglePlaceItem[]>>();

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				VenueService,
				VenueScrapeService,
				VenueStatusChangeService,
				FoodTopicService,
				VenueFoodTopicService,
				{ provide: ApifyService, useValue: { runActor } },
			],
		});
		venueService = harness.moduleRef.get(VenueService);
		scrapeService = harness.moduleRef.get(VenueScrapeService);
		statusService = harness.moduleRef.get(VenueStatusChangeService);
		entityManagerManager.setEntityManager(harness.orm.em);
		seedFoodTopics(harness.orm.em);
		city = await cityFactory.create();
	});

	afterAll(async () => {
		await harness.stop();
	});

	const changes = async (placeId: string) => {
		const em = harness.orm.em;
		em.clear();
		return (
			await em.find(VenueStatusChange, { venue: { placeId } }, { orderBy: { id: 'asc' } })
		).map(c => [c.kind, c.source]);
	};

	it("takes the city's first list as the baseline, and records openings from the next one", async () => {
		const em = harness.orm.em;
		runActor.mockResolvedValueOnce([place('old-1'), place('old-2')]);
		await scrapeService.scrapeCity({
			city,
			terms: ['restaurant'],
			maxPerTerm: 10,
			budgetUsd: 1,
		});
		expect(await changes('old-1')).toEqual([]);
		expect((await em.findOneOrFail(Venue, { placeId: 'old-1' })).city.id).toBe(city.id);

		const scraped = await em.findOneOrFail(City, { id: city.id });
		expect(scraped.venuesScrapedAt).toBeInstanceOf(Date);

		runActor.mockResolvedValueOnce([
			place('old-1'),
			place('new-1', { neighborhood: 'Neukölln' }),
			// An old place the last capped scrape missed: its reviews give it away
			place('missed-1', { reviewsCount: 900 }),
		]);
		await scrapeService.scrapeCity({
			city: scraped,
			terms: ['restaurant'],
			maxPerTerm: 10,
			budgetUsd: 1,
		});
		expect(await changes('new-1')).toEqual([
			[VenueStatusChangeKindEnum.OPENED, VenueScrapeSourceEnum.CITY],
		]);
		expect(await changes('missed-1')).toEqual([]);
		expect(await changes('old-1')).toEqual([]);
	});

	it('never counts a place a name lookup found as an opening', async () => {
		await venueService.saveGooglePlace(place('looked-up'), new Date(), city, {
			source: VenueScrapeSourceEnum.LOOKUP,
		});
		await harness.orm.em.flush();
		expect(await changes('looked-up')).toEqual([]);
	});

	it('records a flip to permanently closed once, and a reopening', async () => {
		const em = harness.orm.em;
		const details = { source: VenueScrapeSourceEnum.DETAILS };
		await venueService.saveGooglePlace(
			place('old-2', { permanentlyClosed: true }),
			new Date(),
			undefined,
			details,
		);
		await em.flush();
		await venueService.saveGooglePlace(
			place('old-2', { permanentlyClosed: true }),
			new Date(),
			undefined,
			details,
		);
		await em.flush();
		expect(await changes('old-2')).toEqual([
			[VenueStatusChangeKindEnum.PERMANENTLY_CLOSED, VenueScrapeSourceEnum.DETAILS],
		]);

		await venueService.saveGooglePlace(
			place('old-1', { temporarilyClosed: true }),
			new Date(),
			undefined,
			details,
		);
		await em.flush();
		// A list item that does not say leaves the temporary closure as it was
		await venueService.saveGooglePlace(
			place('old-1', { temporarilyClosed: undefined }),
			new Date(),
			undefined,
			details,
		);
		await em.flush();
		await venueService.saveGooglePlace(place('old-1'), new Date(), undefined, details);
		await em.flush();
		expect((await changes('old-1')).map(([kind]) => kind)).toEqual([
			VenueStatusChangeKindEnum.TEMPORARILY_CLOSED,
			VenueStatusChangeKindEnum.REOPENED,
		]);
	});

	it("sums the city's quarter by district and food, and lists new venues", async () => {
		const month = new Date().toISOString().slice(0, 7);
		const summary = await statusService.quarter(city.id, month);
		expect(summary.totals).toEqual({
			opened: 1,
			temporarilyClosed: 1,
			permanentlyClosed: 1,
			reopened: 1,
		});
		expect(summary.byDistrict.map(g => [g.key, g.opened, g.permanentlyClosed])).toEqual([
			['Mitte', 0, 1],
			['Neukölln', 1, 0],
		]);
		expect(summary.byCategory).toEqual([
			{ key: 'Ramen', opened: 1, temporarilyClosed: 1, permanentlyClosed: 1, reopened: 1 },
		]);

		const newVenue = await harness.orm.em.findOneOrFail(Venue, { placeId: 'new-1' });
		expect(await statusService.newVenueIds(city.id)).toEqual([newVenue.id]);
		const other = await cityFactory.create({ name: 'Wien' });
		expect(await statusService.newVenueIds(other.id)).toEqual([]);
	});

	it('counts a venue a post said had just opened, without writing a status change', async () => {
		const em = harness.orm.em;
		const postCity = await cityFactory.create({ name: 'Hamburg' });
		const venue = (placeId: string, reviewsCount: number, closed = false) =>
			em.create(Venue, {
				city: postCity,
				placeId,
				name: `Place ${placeId}`,
				district: 'Altona',
				category: 'Cafe',
				reviewsCount,
				closed,
			});
		const fresh = venue('flag-fresh', 40);
		const stale = venue('flag-stale', 40);
		const big = venue('flag-big', 900);
		const gone = venue('flag-gone', 40, true);
		const unflagged = venue('flag-none', 40);
		await em.flush();
		const lastMonth = new Date(Date.now() - 30 * 24 * 3600 * 1000);
		const sevenMonthsAgo = new Date();
		sevenMonthsAgo.setUTCMonth(sevenMonthsAgo.getUTCMonth() - 7);
		let n = 0;
		const post = (v: Venue, postedAt: Date, isNewOpening: boolean) => {
			const p = em.create(SocialPost, {
				city: v.city,
				externalId: `flag-${++n}`,
				platform: SocialPlatformEnum.TIKTOK,
				url: `https://tiktok.com/flag/${n}`,
				author: 'eater',
				views: 100,
				postedAt,
			});
			em.create(Mention, {
				post: p,
				venueName: v.name,
				venue: v,
				visited: true,
				isNewOpening,
				sentiment: 'positive',
				summary: 'Just opened.',
				dishes: [],
				praise: [],
				complaints: [],
			});
		};
		post(fresh, lastMonth, true);
		// A later post saying so again: the first one dates the opening
		post(fresh, new Date(), true);
		post(stale, sevenMonthsAgo, true);
		post(big, lastMonth, true);
		post(gone, lastMonth, true);
		post(unflagged, lastMonth, false);
		// A venue a city scrape already saw open is listed once, as the scrape's
		const scraped = await em.findOneOrFail(Venue, { placeId: 'new-1' });
		post(scraped, lastMonth, true);
		await em.flush();

		expect(await statusService.newVenueIds(postCity.id)).toEqual([fresh.id]);
		expect(await statusService.newVenueIds(city.id)).toEqual([scraped.id]);
		expect(await statusService.newVenueIds()).toEqual(
			expect.arrayContaining([fresh.id, scraped.id]),
		);

		const month = new Date().toISOString().slice(0, 7);
		const summary = await statusService.quarter(postCity.id, month);
		expect(summary.totals.opened).toBe(1);
		expect(summary.changes).toEqual([
			expect.objectContaining({
				venueId: fresh.id,
				kind: VenueStatusChangeKindEnum.OPENED,
				source: 'posts',
				district: 'Altona',
				at: lastMonth,
			}),
		]);
		expect(summary.byDistrict).toEqual([
			{ key: 'Altona', opened: 1, temporarilyClosed: 0, permanentlyClosed: 0, reopened: 0 },
		]);
		const first = await statusService.quarter(city.id, month);
		expect(first.totals.opened).toBe(1);
		expect(first.changes.find(c => c.venueId === scraped.id)?.source).toBe(
			VenueScrapeSourceEnum.CITY,
		);
		// No row is written from a post
		expect(await em.count(VenueStatusChange, { venue: fresh })).toBe(0);
	});
});
