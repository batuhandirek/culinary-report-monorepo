import { afterAll, afterEach, beforeAll, describe, expect, it } from '@jest/globals';

import type { InstagramScraperItem } from 'src/modules/apify/actors/instagram-scraper.actor.js';
import { ApifyService } from 'src/modules/apify/services/apify.service.js';
import { FakeApify } from 'src/modules/apify/tests/factories/fake-apify.js';
import type { City } from 'src/modules/cities/entities/city.entity.js';
import { CitySourceKindEnum } from 'src/modules/cities/entities/city-source.entity.js';
import { CityService } from 'src/modules/cities/services/city.service.js';
import { cityFactory, testCitySource } from 'src/modules/cities/tests/factories/city.factory.js';
import { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';
import { fakeDurable } from 'src/modules/durable-workflows/tests/factories/durable.mock.js';
import { PostSource, PostSourceKindEnum } from 'src/modules/social/entities/post-source.entity.js';
import { SocialPlatformEnum, SocialPost } from 'src/modules/social/entities/social-post.entity.js';
import { HashtagService } from 'src/modules/social/services/hashtag.service.js';
import { SocialPostService } from 'src/modules/social/services/social-post.service.js';
import { SocialScrapeService } from 'src/modules/social/services/social-scrape.service.js';
import {
	emptyTag,
	hiddenLikes,
	INSTAGRAM_HASHTAGS,
	oldPinned,
	post,
	reel,
	tagUrl,
} from 'src/modules/social/tests/fixtures/instagram-hashtag-items.js';
import { TopicService } from 'src/modules/topics/services/topic.service.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { InstagramHashtagsWorkflow } from '../workflows/instagram-hashtags.workflow.js';

/**
 * The atom on items as the actor returns them: the plan's runs (one a kind, the limit sized to
 * the share), each run's input, cap and owner, the runs one after the other, what the save keeps
 * (the month's posts with their hashtag finds, a known post refreshed, pinned and old left out)
 * and a failed run failing the call only once the other ran.
 */
describe('InstagramHashtagsWorkflow (pglite)', () => {
	let harness: PgliteTestingModule;
	let hashtags: InstagramHashtagsWorkflow;
	let scrape: SocialScrapeService;
	let berlin: City;
	const apify = new FakeApify<InstagramScraperItem>();
	const durable = fakeDurable(() => [hashtags], 'op-1');

	/** The posts feed's items, or the reels run's, as the fake actor answers them */
	const answerFeeds = () => {
		apify.answer = input =>
			input.resultsType === 'reels' ?
				[reel]
				// The same post under a second hashtag
			:	[
					post,
					hiddenLikes,
					oldPinned,
					emptyTag,
					{ ...post, inputUrl: tagUrl('brunchberlin') },
				];
	};

	// What found a post (with the city source it is) and its caption's tags, as stored
	const linksOf = async (postId: string) => {
		const stored = await harness.orm.em
			.fork()
			.findOneOrFail(
				SocialPost,
				{ id: postId },
				{ populate: ['foundBy', 'foundBy.source', 'hashtagLinks.hashtag'] },
			);
		return {
			finds: stored.foundBy
				.getItems()
				.map(f => `${f.kind} ${f.value}${f.source ? ` (${f.source.value})` : ''}`),
			tags: stored.hashtagLinks.getItems().map(link => link.hashtag.tag),
		};
	};

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				InstagramHashtagsWorkflow,
				SocialScrapeService,
				SocialPostService,
				CityService,
				HashtagService,
				TopicService,
				{ provide: ApifyService, useValue: apify },
				{ provide: DurableWorkflowsService, useValue: durable },
			],
		});
		hashtags = harness.moduleRef.get(InstagramHashtagsWorkflow);
		scrape = harness.moduleRef.get(SocialScrapeService);
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
		answerFeeds();
	});

	afterAll(async () => {
		await harness.stop();
	});

	afterEach(() => {
		apify.reset();
		durable.started.length = 0;
		answerFeeds();
	});

	it("the month's plan: posts on three quarters, reels on a quarter, each limit sized to its share; the runs one after the other, each tagged and owned; the month's posts saved with their hashtag", async () => {
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

		const plan = await scrape.planCityInstagram(berlin, {
			since: '2026-09-01T00:00:00.000Z',
			perSource: 300,
			budgetUsd: 8,
		});
		expect(plan.skipped).toBeUndefined();
		const results = await hashtags.callEach(plan.calls, berlin.id);

		// Sources added in one flush share their createdAt, so their order is not fixed
		const urls = ['berlinbrunch', 'berlincafe', 'brunchberlin'].map(tagUrl);
		expect(
			apify.calls.map(c => ({
				actor: c.actor,
				input: { ...c.input, directUrls: [...(c.input.directUrls as string[])].sort() },
				options: c.options,
			})),
		).toEqual([
			{
				actor: 'apify/instagram-scraper',
				input: {
					directUrls: urls,
					resultsType: 'posts',
					resultsLimit: 300,
					onlyPostsNewerThan: '2026-09-01',
				},
				options: {
					maxCostUsd: 6,
					purpose: 'instagram posts Berlin: 3 hashtags',
					ownerWorkflowId: 'op-1',
				},
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
				options: {
					maxCostUsd: 2,
					purpose: 'instagram reels Berlin: 3 hashtags',
					ownerWorkflowId: 'op-1',
				},
			},
		]);
		expect(durable.started.map(s => s.options)).toEqual([
			{ attributes: { cityId: berlin.id, purpose: 'instagram posts Berlin: 3 hashtags' } },
			{ attributes: { cityId: berlin.id, purpose: 'instagram reels Berlin: 3 hashtags' } },
		]);
		expect(results).toEqual([
			{ recordId: 'run-1', found: 5, saved: 2 },
			{ recordId: 'run-2', found: 1, saved: 1 },
		]);

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
		expect(await linksOf(second.id)).toEqual({
			finds: ['instagram_hashtag berlinbrunch (berlinbrunch)'],
			tags: ['ad'],
		});
		expect(await linksOf(third.id)).toEqual({
			finds: ['instagram_hashtag brunchberlin (brunchberlin)'],
			tags: [],
		});
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

	it('a failed run fails the call only once the other ran, its posts kept; a small budget sizes the limits', async () => {
		const em = harness.orm.em;
		await em.nativeDelete(SocialPost, {});
		apify.answer = input => {
			if (input.resultsType === 'reels') throw new Error('actor failed');
			return [hiddenLikes];
		};
		const plan = await scrape.planCityInstagram(berlin, {
			since: '2026-09-01T00:00:00.000Z',
			perSource: 300,
			budgetUsd: 1,
		});
		// $0.75 and $0.25 over three hashtags at $0.0027 a result
		expect(plan.calls.map(c => [c.kind, c.perHashtag, c.maxCostUsd])).toEqual([
			['posts', 92, 0.75],
			['reels', 30, 0.25],
		]);
		await expect(hashtags.callEach(plan.calls, berlin.id)).rejects.toThrow(
			'1 of 2 hashtag runs failed (instagram reels Berlin: 3 hashtags: actor failed)',
		);
		expect(apify.calls).toHaveLength(2);
		em.clear();
		expect(await em.count(SocialPost, {})).toBe(1);
	});

	it('the daily run plans the posts feed alone on the whole budget; a share too small for one result a tag plans nothing', async () => {
		const daily = await scrape.planCityInstagram(berlin, {
			since: '2026-09-18T04:00:00.000Z',
			perSource: 100,
			budgetUsd: 2,
			kinds: ['posts'],
		});
		// $2 over three hashtags at $0.0027 a result is 246, above the 100 asked for
		expect(daily.calls).toEqual([
			{
				hashtags: expect.arrayContaining(['berlinbrunch', 'brunchberlin', 'berlincafe']),
				kind: 'posts',
				since: '2026-09-18T04:00:00.000Z',
				perHashtag: 100,
				maxCostUsd: 2,
				purpose: 'instagram posts Berlin: 3 hashtags',
			},
		]);
		expect(
			(
				await scrape.planCityInstagram(berlin, {
					since: '2026-09-18T04:00:00.000Z',
					perSource: 100,
					budgetUsd: 0.005,
				})
			).calls,
		).toEqual([]);
	});

	it('nothing where Instagram is off for the city, or where it has no hashtag', async () => {
		const em = harness.orm.em;
		const wien = cityFactory.build({ name: 'Wien', instagramEnabled: false });
		const graz = cityFactory.build({ name: 'Graz' });
		await em.flush();
		expect(
			await scrape.planCityInstagram(wien, {
				since: '2026-09-01T00:00:00.000Z',
				perSource: 300,
				budgetUsd: 8,
			}),
		).toEqual({ calls: [], skipped: 'Instagram is off for the city' });
		expect(
			await scrape.planCityInstagram(graz, {
				since: '2026-09-01T00:00:00.000Z',
				perSource: 300,
				budgetUsd: 8,
			}),
		).toEqual({ calls: [] });
		expect(await hashtags.callEach([], wien.id)).toEqual([]);
		expect(apify.calls).toHaveLength(0);
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
});
