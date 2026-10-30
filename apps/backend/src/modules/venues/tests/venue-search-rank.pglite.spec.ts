import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';

import { ApifyService } from 'src/modules/apify/services/apify.service.js';
import { City } from 'src/modules/cities/entities/city.entity.js';
import { cityFactory } from 'src/modules/cities/tests/factories/city.factory.js';
import { TopicService } from 'src/modules/topics/services/topic.service.js';
import { VenueTopicService } from 'src/modules/topics/services/venue-topic.service.js';
import {
	seedTopics,
	linkTopics,
	seedIndex,
} from 'src/modules/topics/tests/factories/topic.factory.js';
import { venueTopics } from 'src/modules/topics/util/venue-topics.js';
import { reportSearchRanks } from 'src/modules/reports/util/search-ranks.js';
import { Mention } from 'src/modules/social/entities/mention.entity.js';
import { SocialPlatformEnum, SocialPost } from 'src/modules/social/entities/social-post.entity.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { Venue } from '../entities/venue.entity.js';
import { VenueSearchRank } from '../entities/venue-search-rank.entity.js';
import { VenueStatusChange } from '../entities/venue-status-change.entity.js';
import { VenueService } from '../services/venue.service.js';
import { VenueScrapeService } from '../services/venue-scrape.service.js';
import { VenueSearchRankService } from '../services/venue-search-rank.service.js';
import { SearchPlaceItem, searchQueries } from '../util/search-ranks.js';

/**
 * A `compass/crawler-google-places` search result as its dataset holds it: every item repeats
 * the search it came from in `searchString` and its place in `rank`.
 */
const result = (
	searchString: string,
	rank: number,
	placeId = `${searchString}-${rank}`,
	title = `Place ${rank}`,
	extra: Partial<SearchPlaceItem> = {},
): SearchPlaceItem => ({
	searchString,
	rank,
	placeId,
	title,
	categoryName: 'Ramen restaurant',
	city: 'Berlin',
	neighborhood: 'Mitte',
	street: `Torstraße ${rank}`,
	totalScore: 4.2,
	reviewsCount: 100 + rank,
	permanentlyClosed: false,
	temporarilyClosed: false,
	url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(searchString)}&query_place_id=${placeId}`,
	...extra,
});

describe('searchQueries', () => {
	const index = seedIndex();
	const tagsOf = (category: string, categories: string[] = [], cuisines: string[] = []) =>
		venueTopics(
			{
				category,
				categories,
				mentionTopics: cuisines.map(cuisine => ({ keys: index.resolve(cuisine), n: 2 })),
				manual: [],
			},
			index,
		);

	it("crosses the venue's food topics and their parents with the district, generic ones left out", () => {
		expect(
			searchQueries(
				'Mitte',
				tagsOf('Ramen restaurant', [
					'Ramen restaurant',
					'Takeout restaurant',
					'Japanese restaurant',
					'Noodle shop',
				]),
				index,
			),
		).toEqual(['ramen Mitte', 'japanese Mitte', 'noodles Mitte']);
		// Döner's parent is Turkish; fast food is no search
		expect(
			searchQueries(
				'Neukölln',
				tagsOf('Doner kebab restaurant', ['Fast food restaurant']),
				index,
			),
		).toEqual(['kebab Neukölln', 'turkish Neukölln']);
		// Posts decide when Google says "Restaurant"
		expect(searchQueries('Mitte', tagsOf('Restaurant', [], ['Pho', 'Pho']), index)).toEqual([
			'pho Mitte',
			'vietnamese Mitte',
		]);
		expect(searchQueries(null, tagsOf('Ramen restaurant'), index)).toEqual([]);
	});
});

describe('reportSearchRanks', () => {
	it("lists the month's searches best first, with the earlier months", () => {
		const top = [{ placeId: 'me', name: 'Ramen Ichi' }];
		const ranks = reportSearchRanks(
			[
				{ month: '2026-09', query: 'japanese Mitte', rank: null, results: 20, top: [] },
				{ month: '2026-09', query: 'ramen Mitte', rank: 7, results: 20, top },
				{ month: '2026-08', query: 'ramen Mitte', rank: 9, results: 20, top },
				{ month: '2026-07', query: 'ramen Mitte', rank: null, results: 20, top },
				{ month: '2026-10', query: 'ramen Mitte', rank: 3, results: 20, top },
			],
			'2026-09',
			'me',
		);
		expect(ranks?.map(r => [r.query, r.rank])).toEqual([
			['ramen Mitte', 7],
			['japanese Mitte', undefined],
		]);
		expect(ranks?.[0].history).toEqual([
			{ month: '2026-07', rank: undefined },
			{ month: '2026-08', rank: 9 },
		]);
		expect(ranks?.[0].top[0]).toMatchObject({ name: 'Ramen Ichi', isVenue: true });
		expect(reportSearchRanks([], '2026-09', 'me')).toBeUndefined();
	});
});

describe('VenueSearchRankService (pglite)', () => {
	let harness: PgliteTestingModule;
	let service: VenueSearchRankService;
	let city: City;
	let me: Venue;
	let pizza: Venue;
	let rival: Venue;
	const runActor = jest.fn<(...args: unknown[]) => Promise<SearchPlaceItem[]>>();

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				VenueSearchRankService,
				VenueScrapeService,
				VenueService,
				TopicService,
				VenueTopicService,
				{ provide: ApifyService, useValue: { runActor } },
			],
		});
		service = harness.moduleRef.get(VenueSearchRankService);
		entityManagerManager.setEntityManager(harness.orm.em);

		const em = harness.orm.em;
		seedTopics(em);
		city = await cityFactory.create();
		me = em.create(Venue, {
			city,
			placeId: 'me',
			name: 'Ramen Ichi',
			category: 'Ramen restaurant',
			categories: ['Ramen restaurant', 'Japanese restaurant'],
			district: 'Mitte',
		});
		pizza = em.create(Venue, {
			city,
			placeId: 'pizza',
			name: 'Pizza Tre',
			category: 'Pizza restaurant',
			district: 'Neukölln',
		});
		rival = em.create(Venue, {
			city,
			placeId: 'rival',
			name: 'Ramen Ni',
			category: 'Ramen restaurant',
		});
		const post = em.create(SocialPost, {
			city,
			externalId: 'post-1',
			platform: SocialPlatformEnum.TIKTOK,
			url: 'https://tiktok.com/1',
			views: 100,
			postedAt: new Date('2026-09-05T12:00:00Z'),
		});
		em.create(Mention, {
			post,
			venue: me,
			venueName: me.name,
			cuisine: 'Ramen',
			visited: true,
			sentiment: 'positive',
			summary: 'Good.',
		});
		await em.flush();
		await linkTopics(em);
	});

	afterAll(async () => {
		await harness.stop();
	});

	it('stores the rank and top ten per query, and null when the venue is not in the top twenty', async () => {
		const ramen = 'ramen Mitte Berlin';
		const japanese = 'japanese Mitte Berlin';
		runActor.mockResolvedValueOnce([
			// Out of order, as a dataset can be: `rank` is what counts
			...Array.from({ length: 20 }, (_, i) => i + 1)
				.reverse()
				.map(rank =>
					rank === 7 ? result(ramen, rank, 'me', 'Ramen Ichi')
					: rank === 2 ? result(ramen, rank, 'rival', 'Ramen Ni')
					: result(ramen, rank),
				),
			...Array.from({ length: 20 }, (_, i) =>
				i === 18 ?
					// Places Google lists that aren't for us: a shop, and one across the border
					result(japanese, i + 1, 'shop', 'Asia Markt', { categoryName: 'Grocery store' })
				: i === 19 ?
					result(japanese, i + 1, 'potsdam', 'Ramen Potsdam', { city: 'Potsdam' })
				:	result(japanese, i + 1),
			),
			// "pizza Neukölln" and "italian Neukölln" came back empty (the budget ran out): no row
		]);

		const summary = await service.track(city, '2026-09', [me, pizza, rival], 3);
		expect(summary).toEqual({ venues: 2, queries: 4, ranked: 1, notInTop: 1 });
		const [actor, input, options] = runActor.mock.calls[0] as [
			string,
			Record<string, unknown>,
			Record<string, unknown>,
		];
		expect(actor).toBe('compass/crawler-google-places');
		expect(input).toMatchObject({
			searchStringsArray: [
				ramen,
				japanese,
				'pizza Neukölln Berlin',
				'italian Neukölln Berlin',
			],
			maxCrawledPlacesPerSearch: 20,
		});
		expect(input.locationQuery).toBeUndefined();
		expect(options).toMatchObject({ maxCostUsd: 3 });

		const em = harness.orm.em;
		em.clear();
		const rows = await em.find(
			VenueSearchRank,
			{ venue: me.id },
			{ orderBy: { query: 'asc' } },
		);
		expect(rows.map(r => [r.query, r.rank ?? null, r.results, r.top.length])).toEqual([
			['japanese Mitte', null, 20, 10],
			['ramen Mitte', 7, 20, 10],
		]);
		const ramenRow = rows[1];
		expect(ramenRow.top.map(e => e.placeId).slice(0, 3)).toEqual([
			'ramen Mitte Berlin-1',
			'rival',
			'ramen Mitte Berlin-3',
		]);
		expect(ramenRow.top[1]).toEqual({
			placeId: 'rival',
			name: 'Ramen Ni',
			rating: 4.2,
			reviewsCount: 102,
			venueId: rival.id,
		});
		expect(await em.count(VenueSearchRank, { venue: pizza.id })).toBe(0);
	});

	it('saves the places the searches found as venues of the city, never as openings', async () => {
		const em = harness.orm.em.fork();
		// 18 + 18 new food places in Berlin, plus the three known ones updated
		const found = await em.find(Venue, { city: city.id, placeId: { $like: '% Berlin-%' } });
		expect(found).toHaveLength(36);
		expect(found.find(v => v.placeId === 'ramen Mitte Berlin-1')).toMatchObject({
			name: 'Place 1',
			district: 'Mitte',
			reviewsCount: 101,
		});
		// Its top-ten entry links the venue now
		const row = await em.findOneOrFail(VenueSearchRank, { venue: me.id, query: 'ramen Mitte' });
		expect(row.top[0].venueId).toBe(found.find(v => v.placeId === 'ramen Mitte Berlin-1')!.id);
		expect(await em.count(Venue, { placeId: { $in: ['shop', 'potsdam'] } })).toBe(0);
		// The known rival got Google's figures, nothing else of it changed
		expect(await em.findOneOrFail(Venue, { id: rival.id })).toMatchObject({
			name: 'Ramen Ni',
			reviewsCount: 102,
		});
		expect(await em.count(VenueStatusChange, {})).toBe(0);
	});

	it("replaces the month's rows on a rerun", async () => {
		runActor.mockResolvedValueOnce([result('ramen Mitte Berlin', 1, 'me', 'Ramen Ichi')]);
		await service.track(city, '2026-09', [me], 1);
		harness.orm.em.clear();
		const rows = await service.forVenue(me.id);
		expect(rows.map(r => [r.query, r.rank, r.results])).toEqual([['ramen Mitte', 1, 1]]);
	});
});
