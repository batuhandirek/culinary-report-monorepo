import { afterAll, afterEach, beforeAll, describe, expect, it, jest } from '@jest/globals';

import type { TiktokSearchItem } from 'src/modules/apify/actors/tiktok-search.actor.js';
import { ApifyService } from 'src/modules/apify/services/apify.service.js';
import { FakeApify } from 'src/modules/apify/tests/factories/fake-apify.js';
import { CitySourceKindEnum } from 'src/modules/cities/entities/city-source.entity.js';
import { CityService } from 'src/modules/cities/services/city.service.js';
import { cityFactory, testCitySource } from 'src/modules/cities/tests/factories/city.factory.js';
import { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';
import { fakeDurable } from 'src/modules/durable-workflows/tests/factories/durable.mock.js';
import { PostSourceKindEnum } from 'src/modules/social/entities/post-source.entity.js';
import { SocialPlatformEnum, SocialPost } from 'src/modules/social/entities/social-post.entity.js';
import { HashtagService } from 'src/modules/social/services/hashtag.service.js';
import { SocialPostService } from 'src/modules/social/services/social-post.service.js';
import { SocialScrapeService } from 'src/modules/social/services/social-scrape.service.js';
import {
	hashtagWordVideo,
	julySearchVideo,
	searchVideo,
} from 'src/modules/social/tests/fixtures/tiktok-search-items.js';
import { TopicService } from 'src/modules/topics/services/topic.service.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { findsBy, tiktokSearchInput } from '../util/tiktok-search-input.js';
import { TiktokSearchWorkflow } from '../workflows/tiktok-search.workflow.js';

/**
 * The atom on items as the actor returns them: the city plan (every search and hashtag word in
 * one run, in the city's region), the venue plan (the brands' names, the cap floored at the
 * actor's $4), the input, cap and owner, and what the save keeps (a video once with every find,
 * a hashtag word's find keeping the hashtag's kind, a venue search's find its venue, the original
 * subtitles, videos before the day left out).
 */
describe('TiktokSearchWorkflow (pglite)', () => {
	let harness: PgliteTestingModule;
	let search: TiktokSearchWorkflow;
	let scrape: SocialScrapeService;
	const apify = new FakeApify<TiktokSearchItem>();
	const durable = fakeDurable(() => [search], 'op-1');

	// What found a post (with the city source it is) and its caption's tags, as stored
	const linksOf = async (postId: string) => {
		const stored = await harness.orm.em
			.fork()
			.findOneOrFail(
				SocialPost,
				{ id: postId },
				{
					populate: [
						'foundBy',
						'foundBy.source',
						'foundBy.venue',
						'hashtagLinks.hashtag',
					],
				},
			);
		return {
			finds: stored.foundBy
				.getItems()
				.map(
					f =>
						`${f.kind} ${f.value}${f.source ? ` (${f.source.value})` : ''}${f.venue ? ` [${f.venue.name}]` : ''}`,
				),
			tags: stored.hashtagLinks.getItems().map(link => link.hashtag.tag),
		};
	};

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				TiktokSearchWorkflow,
				SocialScrapeService,
				SocialPostService,
				CityService,
				HashtagService,
				TopicService,
				{ provide: ApifyService, useValue: apify },
				{ provide: DurableWorkflowsService, useValue: durable },
			],
		});
		search = harness.moduleRef.get(TiktokSearchWorkflow);
		scrape = harness.moduleRef.get(SocialScrapeService);
		entityManagerManager.setEntityManager(harness.orm.em);
	});

	afterAll(async () => {
		await harness.stop();
	});

	afterEach(() => {
		apify.reset();
		durable.started.length = 0;
	});

	it("a city's own sources searched in its region in one run: the input, the cap, the owner; the hashtag word's find keeps the hashtag's kind, the original subtitles are kept, July's video is left out", async () => {
		const em = harness.orm.em;
		const fetchSpy = jest
			.spyOn(globalThis, 'fetch')
			.mockImplementation(
				async () =>
					new Response(
						'WEBVTT\n\n00:00:00.000 --> 00:00:02.500\nBestes Schnitzel bei Figlmüller\n',
					),
			);
		const wien = cityFactory.build({
			name: 'Wien',
			tiktokRegion: 'AT',
			instagramEnabled: false,
		});
		testCitySource(em, wien, CitySourceKindEnum.TIKTOK_HASHTAG, 'wienfood');
		testCitySource(em, wien, CitySourceKindEnum.TIKTOK_HASHTAG, 'wiendead', false);
		testCitySource(em, wien, CitySourceKindEnum.TIKTOK_SEARCH, 'wien restaurant');
		testCitySource(em, wien, CitySourceKindEnum.TIKTOK_SEARCH, 'wien schnitzel');
		await em.flush();
		apify.answer = input =>
			(input.keywords as string[]).includes('wien restaurant') ?
				[searchVideo, julySearchVideo, searchVideo, hashtagWordVideo]
			:	[];

		const plan = await scrape.planCityTikTok(wien, {
			since: '2026-09-01T00:00:00.000Z',
			perSource: 100,
			budgetUsd: 10,
			window: 'THREE_MONTH',
		});
		expect(plan).toMatchObject({
			finds: { kind: 'city', hashtagWords: ['wienfood'] },
			purpose: 'tiktok search Wien: 2 queries, 1 hashtags',
		});
		const result = await search.call({ ...plan!, cityId: wien.id });
		expect(result).toEqual({ recordId: 'run-1', found: 4, saved: 2 });

		expect(apify.calls).toHaveLength(1);
		const [{ actor, input, options }] = apify.calls;
		expect(actor).toBe('novi/advanced-search-tiktok-api');
		// Every query and enabled hashtag word in one search run, in the city's region: no hashtag feed
		expect({ ...input, keywords: [...(input.keywords as string[])].sort() }).toEqual({
			keywords: ['wien restaurant', 'wien schnitzel', 'wienfood'],
			limit: 100,
			region: 'AT',
			publishTime: 'THREE_MONTH',
			sortType: 0,
			includeSearchTerms: true,
		});
		expect(options).toEqual({
			maxCostUsd: 10,
			purpose: plan!.purpose,
			ownerWorkflowId: 'op-1',
		});
		expect(durable.started[0].options).toEqual({
			attributes: { cityId: wien.id, purpose: plan!.purpose },
		});

		em.clear();
		const hashtagVideo = await em.findOneOrFail(SocialPost, {
			externalId: hashtagWordVideo.aweme_id,
		});
		expect(hashtagVideo).toMatchObject({ city: { id: wien.id } });
		expect((await linksOf(hashtagVideo.id)).finds).toEqual([
			'tiktok_hashtag wienfood (wienfood)',
		]);
		// The original-language subtitles, not the machine translation
		expect(fetchSpy).toHaveBeenCalledTimes(1);
		expect(String(fetchSpy.mock.calls[0][0])).toBe('https://cla.example/orig.vtt');
		const searched = await em.findOneOrFail(SocialPost, { externalId: searchVideo.aweme_id });
		expect(searched).toMatchObject({
			platform: SocialPlatformEnum.TIKTOK,
			url: 'https://www.tiktok.com/@schnitzeljaeger/video/7551000000000000001',
			postedAt: new Date('2026-09-12T19:00:00.000Z'),
			author: 'schnitzeljaeger',
			authorFans: 8800,
			views: 48000,
			likes: 2100,
			shares: 90,
			comments: 64,
			saves: 300,
			isAd: false,
			locationName: 'Figlmüller Wollzeile',
			taggedHandles: ['figlmueller.wien'],
			subtitles: 'Bestes Schnitzel bei Figlmüller',
			subtitlesLanguage: 'deu-DE',
			city: { id: wien.id },
		});
		expect(await linksOf(searched.id)).toEqual({
			finds: ['tiktok_search wien restaurant (wien restaurant)'],
			tags: ['wienfood', 'schnitzel'],
		});
		// Found by the search, but from before the month
		expect(await em.count(SocialPost, { externalId: julySearchVideo.aweme_id })).toBe(0);
		fetchSpy.mockRestore();
	});

	it("the venues' names in one run on half the budget, floored at the actor's $4; each find the venue's", async () => {
		const em = harness.orm.em;
		const graz = cityFactory.build({ name: 'Graz', tiktokRegion: 'AT' });
		const venues = [
			em.create(Venue, {
				city: graz,
				placeId: 'p-aiola',
				name: 'Aiola Upstairs',
				category: 'Restaurant',
			}),
			em.create(Venue, {
				city: graz,
				placeId: 'p-glock',
				name: 'Glöckl Bräu | Graz',
				category: 'Brewpub',
			}),
		];
		await em.flush();
		apify.answer = () => [
			{
				...searchVideo,
				aweme_id: '7551000000000000009',
				video: {},
				__search_terms: { ...searchVideo.__search_terms, keyword: 'Aiola Upstairs Graz' },
			},
		];

		const plan = scrape.planVenueSearch(graz, venues, {
			since: '2026-09-01T00:00:00.000Z',
			perSource: 30,
			budgetUsd: 8 / 2,
			window: 'THREE_MONTH',
		});
		expect(plan).toEqual({
			queries: ['Aiola Upstairs Graz', 'Glöckl Bräu Graz'],
			window: 'THREE_MONTH',
			perQuery: 30,
			since: '2026-09-01T00:00:00.000Z',
			finds: {
				kind: 'venue',
				venueIds: { 'Aiola Upstairs Graz': venues[0].id, 'Glöckl Bräu Graz': venues[1].id },
			},
			maxCostUsd: 4,
			purpose: 'tiktok venue search Graz: 2 venues',
		});
		// A cap under the actor's floor is lifted to it
		const result = await search.call({ ...plan!, cityId: graz.id, maxCostUsd: 1 });
		expect(apify.calls[0].input).toMatchObject({
			keywords: ['Aiola Upstairs Graz', 'Glöckl Bräu Graz'],
			limit: 30,
			region: 'AT',
		});
		expect(apify.calls[0].options.maxCostUsd).toBe(4);
		expect(result).toEqual({ recordId: 'run-1', found: 1, saved: 1 });

		em.clear();
		const found = await em.findOneOrFail(SocialPost, { externalId: '7551000000000000009' });
		expect((await linksOf(found.id)).finds).toEqual([
			'venue_search Aiola Upstairs Graz [Aiola Upstairs]',
		]);
		// No venue, no plan
		expect(
			scrape.planVenueSearch(graz, [], {
				since: '',
				perSource: 30,
				budgetUsd: 4,
				window: 'WEEK',
			}),
		).toBeNull();
	});

	it('the pure builders: the input with the floors, the finds by rule', () => {
		const call = {
			queries: ['Wien Food', 'wien food', 'wien restaurant'],
			window: 'WEEK' as const,
			perQuery: 10,
			since: '2026-09-01T00:00:00.000Z',
			finds: { kind: 'city' as const, hashtagWords: ['wienfood'] },
			maxCostUsd: 1,
			purpose: 'x',
		};
		expect(tiktokSearchInput(call, 'AT')).toEqual({
			keywords: ['Wien Food', 'wien restaurant'],
			limit: 30,
			region: 'AT',
			publishTime: 'WEEK',
			sortType: 0,
			includeSearchTerms: true,
		});
		const found = [
			{ kind: PostSourceKindEnum.TIKTOK_SEARCH, value: 'wienfood' },
			{ kind: PostSourceKindEnum.TIKTOK_SEARCH, value: 'wien restaurant' },
		];
		expect(findsBy(call.finds, found)).toEqual([
			{ kind: PostSourceKindEnum.TIKTOK_HASHTAG, value: 'wienfood' },
			{ kind: PostSourceKindEnum.TIKTOK_SEARCH, value: 'wien restaurant' },
		]);
		expect(findsBy({ kind: 'venue', venueIds: { wienfood: 'v1' } }, found)).toEqual([
			{ kind: PostSourceKindEnum.VENUE_SEARCH, value: 'wienfood', venueId: 'v1' },
			{ kind: PostSourceKindEnum.VENUE_SEARCH, value: 'wien restaurant', venueId: undefined },
		]);
	});
});
