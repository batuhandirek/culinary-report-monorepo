import { afterAll, afterEach, beforeAll, describe, expect, it, jest } from '@jest/globals';

import { ApifyService } from 'src/modules/apify/services/apify.service.js';
import type { City } from 'src/modules/cities/entities/city.entity.js';
import { CitySourceKindEnum } from 'src/modules/cities/entities/city-source.entity.js';
import { CityService } from 'src/modules/cities/services/city.service.js';
import { TopicService } from 'src/modules/topics/services/topic.service.js';
import { cityFactory, testCitySource } from 'src/modules/cities/tests/factories/city.factory.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { PostSource, PostSourceKindEnum } from '../entities/post-source.entity.js';
import { SocialPlatformEnum, SocialPost } from '../entities/social-post.entity.js';
import { HashtagService } from '../services/hashtag.service.js';
import { SocialPostService } from '../services/social-post.service.js';
import { SocialScrapeService } from '../services/social-scrape.service.js';

const tagUrl = (tag: string) => `https://www.instagram.com/explore/tags/${tag}/`;

// Items in the shape `apify/instagram-scraper` returns for tag URLs (run L64v2IAwR17ltt37c)
const post = {
	inputUrl: tagUrl('berlinbrunch'),
	id: '3990457345116769680',
	type: 'Sidecar',
	productType: 'carousel_container',
	shortCode: 'Ddg89AjCI2Q',
	url: 'https://www.instagram.com/p/Ddg89AjCI2Q/',
	timestamp: '2026-09-14T09:12:00.000Z',
	caption:
		'Sunday brunch at @cafe.yohaku 🥞 the matcha pancakes are unreal #berlinbrunch #berlinfoodie',
	hashtags: ['berlinbrunch', 'berlinfoodie'],
	mentions: ['cafe.yohaku'],
	likesCount: 812,
	commentsCount: 37,
	ownerUsername: 'brunchgirl.berlin',
	ownerFullName: 'Brunch Girl',
	ownerId: '51234567',
	paidPartnership: false,
	isPinned: false,
	locationName: 'Café YOHAKU ',
	locationId: '1234',
	coauthorProducers: [
		{ id: '777', username: 'cafe.yohaku', full_name: 'Café YOHAKU', is_verified: false },
	],
};
const hiddenLikes = {
	...post,
	id: '3991000000000000001',
	type: 'Image',
	productType: 'feed',
	shortCode: 'DdhAAAAAAAA',
	url: 'https://www.instagram.com/p/DdhAAAAAAAA/',
	timestamp: '2026-09-20T18:00:00.000Z',
	caption: 'Invited by @zimtschnecke.berlin #ad',
	hashtags: ['ad'],
	mentions: ['zimtschnecke.berlin'],
	likesCount: -1,
	paidPartnership: true,
	locationName: undefined,
	locationId: undefined,
	coauthorProducers: undefined,
};
// A pinned post passes the actor's date filter
const oldPinned = {
	...post,
	id: '3800000000000000000',
	url: 'https://www.instagram.com/p/OLD/',
	timestamp: '2026-05-01T00:00:00.000Z',
	isPinned: true,
};
// A tag with nothing to show returns one (charged) error item
const emptyTag = {
	inputUrl: tagUrl('berlincafe'),
	error: 'no_items',
	errorDescription: 'Empty or private data for provided input',
};
// The reels run (resultsType "reels"): the tag's top reels, none of them in the feed
const reel = {
	inputUrl: tagUrl('brunchberlin'),
	id: '3992000000000000002',
	type: 'Video',
	productType: 'clips',
	shortCode: 'DdiREEL0000',
	url: 'https://www.instagram.com/p/DdiREEL0000/',
	timestamp: '2026-09-22T11:00:00.000Z',
	caption: 'Best cardamom bun in town',
	hashtags: [],
	mentions: [],
	likesCount: 2400,
	commentsCount: 51,
	videoPlayCount: 116556,
	igPlayCount: 116556,
	ownerUsername: 'jounisto',
	paidPartnership: false,
	isPinned: false,
	taggedUsers: [{ id: '9', username: 'zeitundraum.berlin', full_name: 'Zeit und Raum' }],
};

// The city's Instagram hashtags: one is turned off
const INSTAGRAM_HASHTAGS = ['berlinbrunch', 'brunchberlin', 'berlincafe', 'berlinbakery'];

// One item in the shape `clockworks/tiktok-scraper` returns for a hashtag
const tiktokVideo = {
	id: '7550000000000000001',
	webVideoUrl: 'https://www.tiktok.com/@wienisst/video/7550000000000000001',
	createTimeISO: '2026-09-05T18:00:00.000Z',
	searchHashtag: { name: 'wienfood' },
	text: 'Best Schnitzel in Wien #wienfood',
	authorMeta: { name: 'wienisst', fans: 1200 },
	playCount: 5400,
	hashtags: [{ name: 'wienfood' }],
};

// Items in the shape `novi/advanced-search-tiktok-api` returns (TikTok's own video object;
// runs esT7dJSU1VGEZB9fw, PXHahUnBDAkxcs1fD)
const searchVideo = {
	aweme_id: '7551000000000000001',
	desc: 'Bestes Schnitzel in Wien mit @figlmueller.wien #wienfood #schnitzel',
	create_time: Date.parse('2026-09-12T19:00:00.000Z') / 1000,
	author: {
		unique_id: 'schnitzeljaeger',
		nickname: 'Schnitzeljäger',
		follower_count: 8800,
		uid: '42',
	},
	statistics: {
		play_count: 48000,
		digg_count: 2100,
		share_count: 90,
		comment_count: 64,
		collect_count: 300,
	},
	is_ads: false,
	commerce_info: { branded_content_type: 0 },
	text_extra: [
		{ type: 0, user_id: '43', sec_uid: 'MS4w', start: 28, end: 45 },
		{ type: 1, hashtag_name: 'wienfood' },
		{ type: 1, hashtag_name: 'schnitzel' },
	],
	anchors: [
		{
			component_key: 'anchor_ucg_template',
			type: '65',
			keyword: 'TikTok-Vorlage ausprobieren',
		},
		{ component_key: 'anchor_poi', type: '45', keyword: 'Figlmüller Wollzeile', id: '4220' },
	],
	video: {
		cla_info: {
			caption_infos: [
				{
					lang: 'eng-US',
					url: 'https://cla.example/mt.vtt',
					is_original_caption: false,
					caption_format: 'webvtt',
				},
				{
					lang: 'deu-DE',
					url: 'https://cla.example/orig.vtt',
					is_original_caption: true,
					caption_format: 'webvtt',
				},
			],
		},
	},
	__search_terms: {
		keyword: 'wien restaurant',
		sort_type: 'Relevance',
		publish_time: 'THREE_MONTH',
		region: 'AT',
	},
};
// Inside the three months searched, before the month scraped
const julySearchVideo = {
	...searchVideo,
	aweme_id: '7551000000000000002',
	create_time: Date.parse('2026-07-20T12:00:00.000Z') / 1000,
	video: {},
};

describe('SocialScrapeService city scrapes (pglite)', () => {
	let harness: PgliteTestingModule;
	let service: SocialScrapeService;
	let berlin: City;
	const runActor = jest.fn(
		async (actor: string, input: any, _opts: { maxCostUsd: number }): Promise<any[]> => {
			if (actor === 'clockworks/tiktok-scraper') return [tiktokVideo];
			if (actor === 'novi/advanced-search-tiktok-api')
				return input.keywords.includes('wien restaurant') ?
						[searchVideo, julySearchVideo, searchVideo]
					:	[];
			if (actor === 'apify/instagram-scraper') {
				if (input.resultsType === 'reels') return [reel];
				// The same post under a second hashtag
				return [
					post,
					hiddenLikes,
					oldPinned,
					emptyTag,
					{ ...post, inputUrl: tagUrl('brunchberlin') },
				];
			}
			return [];
		},
	);

	// What found a post (with the city source it is) and its caption's tags, as stored
	const linksOf = async (postId: string) => {
		const stored = await harness.orm.em
			.fork()
			.findOneOrFail(SocialPost, { id: postId }, { populate: ['foundBy', 'foundBy.source', 'hashtagLinks.hashtag'] });
		return {
			finds: stored.foundBy.getItems().map(f => `${f.kind} ${f.value}${f.source ? ` (${f.source.value})` : ''}`),
			tags: stored.hashtagLinks.getItems().map(link => link.hashtag.tag),
		};
	};

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				SocialScrapeService,
				SocialPostService,
				CityService,
				HashtagService,
				TopicService,
				{ provide: ApifyService, useValue: { runActor } },
			],
		});
		service = harness.moduleRef.get(SocialScrapeService);
		entityManagerManager.setEntityManager(harness.orm.em);
		const em = harness.orm.em;
		berlin = cityFactory.build();
		for (const tag of INSTAGRAM_HASHTAGS)
			testCitySource(
				em,
				berlin,
				CitySourceKindEnum.INSTAGRAM_HASHTAG,
				tag,
				tag !== 'berlinbakery',
			);
		// A TikTok hashtag: not for the Instagram scrape
		testCitySource(em, berlin, CitySourceKindEnum.TIKTOK_HASHTAG, 'berlinfood');
		await em.flush();
	});

	afterAll(async () => {
		await harness.stop();
	});

	afterEach(() => {
		runActor.mockClear();
	});

	it('scrapes posts and reels of every hashtag in two runs and saves the month’s posts with their hashtag', async () => {
		const em = harness.orm.em;
		// The same post, already saved by the per-venue location actor
		const known = em.create(SocialPost, {
			city: berlin.id,
			externalId: 'ig_3990457345116769680',
			platform: SocialPlatformEnum.INSTAGRAM,
			url: post.url,
			postedAt: new Date(post.timestamp),
			likes: 700,
		});
		em.create(PostSource, {
			post: known,
			kind: PostSourceKindEnum.VENUE_PLACE,
			value: 'Café YOHAKU',
			foundAt: new Date('2026-09-15T00:00:00Z'),
		});
		await em.flush();

		const result = await service.scrapeCityInstagram({
			city: berlin,
			since: '2026-09-01T00:00:00.000Z',
			perSource: 300,
			budgetUsd: 8,
		});

		// One posts run and one reels run over the enabled hashtags, each inside its share
		// Sources added in one flush share their createdAt, so their order is not fixed
		const calls = runActor.mock.calls.map(([actor, input, opts]) => ({
			actor,
			input: { ...input, directUrls: [...input.directUrls].sort() },
			max: opts.maxCostUsd,
		}));
		const urls = ['berlinbrunch', 'berlincafe', 'brunchberlin'].map(tagUrl);
		expect(calls).toEqual([
			{
				actor: 'apify/instagram-scraper',
				input: {
					directUrls: urls,
					resultsType: 'posts',
					resultsLimit: 300,
					onlyPostsNewerThan: '2026-09-01',
				},
				max: 6,
			},
			// $2 over three hashtags at $0.0027 a result
			{
				actor: 'apify/instagram-scraper',
				input: {
					directUrls: urls,
					resultsType: 'reels',
					resultsLimit: 246,
					onlyPostsNewerThan: '2026-09-01',
				},
				max: 2,
			},
		]);
		expect(result).toEqual({ found: 6, saved: 3 });

		em.clear();
		const posts = await em.find(
			SocialPost,
			{ platform: SocialPlatformEnum.INSTAGRAM },
			{ orderBy: { postedAt: 'asc' } },
		);
		expect(posts.map(p => p.externalId)).toEqual([
			'ig_3990457345116769680',
			'ig_3991000000000000001',
			'ig_3992000000000000002',
		]);
		const [first, second, third] = posts;
		// Counts refreshed; the place page that found it first and both tags that found it again
		expect(first).toMatchObject({ likes: 812, comments: 37 });
		expect(await linksOf(first.id)).toEqual({
			finds: [
				'venue_place Café YOHAKU',
				'instagram_hashtag berlinbrunch (berlinbrunch)',
				'instagram_hashtag brunchberlin (brunchberlin)',
			],
			tags: [],
		});
		expect(await linksOf(second.id)).toEqual({ finds: ['instagram_hashtag berlinbrunch (berlinbrunch)'], tags: ['ad'] });
		expect(await linksOf(third.id)).toEqual({ finds: ['instagram_hashtag brunchberlin (brunchberlin)'], tags: [] });
		expect(second).toMatchObject({
			author: 'brunchgirl.berlin',
			authorFans: null,
			likes: 0,
			views: 0,
			isAd: true,
			locationName: null,
			taggedHandles: ['zimtschnecke.berlin'],
		});
		expect(third).toMatchObject({
			views: 116556,
			likes: 2400,
			taggedHandles: ['zeitundraum.berlin'],
		});
	});

	it('keeps one run’s posts when the other fails, and sizes the limit to a small budget', async () => {
		runActor.mockImplementationOnce(async () => [hiddenLikes]);
		runActor.mockImplementationOnce(async () => {
			throw new Error('actor failed');
		});

		const result = await service.scrapeCityInstagram({
			city: berlin,
			since: '2026-09-01T00:00:00.000Z',
			perSource: 300,
			budgetUsd: 1,
		});

		expect(result).toEqual({ found: 1, saved: 1 });
		// $0.75 and $0.25 over three hashtags at $0.0027 a result
		expect(runActor.mock.calls.map(([, input]) => input.resultsLimit)).toEqual([92, 30]);
	});

	it('runs the posts feed alone on the whole budget for the daily scrape', async () => {
		await service.scrapeCityInstagram({
			city: berlin,
			since: '2026-09-18T04:00:00.000Z',
			perSource: 100,
			budgetUsd: 2,
			kinds: ['posts'],
		});

		expect(runActor).toHaveBeenCalledTimes(1);
		const [, input, opts] = runActor.mock.calls[0];
		// $2 over three hashtags at $0.0027 a result is 246, above the 100 asked for
		expect(input).toMatchObject({
			resultsType: 'posts',
			resultsLimit: 100,
			onlyPostsNewerThan: '2026-09-18',
		});
		expect(opts.maxCostUsd).toBe(2);
	});

	it('maps a post: the tag from inputUrl, caption hashtags, mentions and co-authors once', () => {
		const posts = harness.moduleRef.get(SocialPostService);
		expect(posts.fromInstagramHashtag(post)).toMatchObject({
			externalId: 'ig_3990457345116769680',
			platform: SocialPlatformEnum.INSTAGRAM,
			postedAt: new Date('2026-09-14T09:12:00.000Z'),
			views: 0,
			isAd: false,
			locationName: 'Café YOHAKU',
			finds: [{ kind: PostSourceKindEnum.INSTAGRAM_HASHTAG, value: 'berlinbrunch' }],
			hashtags: ['berlinbrunch', 'berlinfoodie'],
			taggedHandles: ['cafe.yohaku'],
		});
		expect(posts.fromInstagramHashtag(emptyTag)).toBeNull();
		expect(
			posts.fromInstagramHashtag({
				...post,
				inputUrl: 'https://www.instagram.com/humansofny/',
			}),
		).toBeNull();
	});

	it("scrapes a second city's own TikTok sources in its region, and skips Instagram where it is off", async () => {
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

		const result = await service.scrapeCityTikTok({
			city: wien,
			since: '2026-09-01T00:00:00.000Z',
			perSource: 100,
			budgetUsd: 10,
		});
		expect(result).toEqual({ found: 4, saved: 2 });
		const calls = runActor.mock.calls.map(([actor, input, opts]) => ({
			actor,
			input: input.keywords ? { ...input, keywords: [...input.keywords].sort() } : input,
			max: opts.maxCostUsd,
		}));
		expect(calls).toEqual([
			{
				actor: 'clockworks/tiktok-scraper',
				input: expect.objectContaining({ hashtags: ['wienfood'] }),
				max: 6,
			},
			// Every query in one run, in the city's region
			{
				actor: 'novi/advanced-search-tiktok-api',
				input: {
					keywords: ['wien restaurant', 'wien schnitzel'],
					limit: 100,
					region: 'AT',
					publishTime: 'THREE_MONTH',
					sortType: 0,
					includeSearchTerms: true,
				},
				max: 4,
			},
		]);

		em.clear();
		const hashtagVideo = await em.findOneOrFail(SocialPost, { externalId: tiktokVideo.id });
		expect(hashtagVideo).toMatchObject({ city: { id: wien.id } });
		expect((await linksOf(hashtagVideo.id)).finds).toEqual(['tiktok_hashtag wienfood (wienfood)']);
		// The original-language subtitles, not the machine translation
		expect(fetchSpy).toHaveBeenCalledTimes(1);
		expect(String(fetchSpy.mock.calls[0][0])).toBe('https://cla.example/orig.vtt');
		expect(
			await em.findOneOrFail(SocialPost, { externalId: searchVideo.aweme_id }),
		).toMatchObject({
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
		const searched = await em.findOneOrFail(SocialPost, { externalId: searchVideo.aweme_id });
		expect(await linksOf(searched.id)).toEqual({
			finds: ['tiktok_search wien restaurant (wien restaurant)'],
			tags: ['wienfood', 'schnitzel'],
		});
		// Found by the search, but from before the month
		expect(await em.count(SocialPost, { externalId: julySearchVideo.aweme_id })).toBe(0);
		fetchSpy.mockRestore();

		runActor.mockClear();
		expect(
			await service.scrapeCityInstagram({
				city: wien,
				since: '2026-09-01T00:00:00.000Z',
				perSource: 300,
				budgetUsd: 8,
			}),
		).toMatchObject({ found: 0, saved: 0 });
		expect(runActor).not.toHaveBeenCalled();
	});

	it('searches all venue names in one TikTok run on half the budget', async () => {
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

		await service.scrapeVenueSocial({
			city: graz,
			venues,
			since: '2026-09-01T00:00:00.000Z',
			perVenue: 30,
			budgetUsd: 8,
		});

		const [search, places] = runActor.mock.calls;
		expect(search[0]).toBe('novi/advanced-search-tiktok-api');
		expect(search[1]).toMatchObject({
			keywords: ['Aiola Upstairs Graz', 'Glöckl Bräu Graz'],
			limit: 30,
			region: 'AT',
		});
		expect(search[2].maxCostUsd).toBe(4);
		expect(places[0]).toBe('scraping_solutions/instagram-location-posts-local-creator-finder');
		expect(places[2].maxCostUsd).toBe(4);
	});
});
