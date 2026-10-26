import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { ApifyService } from 'src/modules/apify/services/apify.service.js';
import type { City } from 'src/modules/cities/entities/city.entity.js';
import { cityFactory } from 'src/modules/cities/tests/factories/city.factory.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { POST_COUNTS_AGE_DAYS } from '../constants/post-counts.constant.js';
import { SocialPlatformEnum, SocialPost } from '../entities/social-post.entity.js';
import { SocialPostSnapshot } from '../entities/social-post-snapshot.entity.js';
import { PostCountsService } from '../services/post-counts.service.js';
import { SocialAccountService } from '../services/social-account.service.js';
import { PostFields, SocialPostService } from '../services/social-post.service.js';

import {
	instagramGoneItem,
	instagramPhotoItem,
	instagramReelItem,
	tiktokGoneItem,
	tiktokPostItem,
} from './fixtures/post-counts-items.js';

const DAY = 24 * 3600 * 1000;
const daysAgo = (days: number) => new Date(Date.now() - days * DAY);

describe('Post counts at a fixed age (pglite)', () => {
	let harness: PgliteTestingModule;
	let posts: SocialPostService;
	let counts: PostCountsService;
	const runActor = jest.fn<(actor: string, input: any, opts: any) => Promise<any[]>>();

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				SocialPostService,
				PostCountsService,
				{ provide: SocialAccountService, useValue: { ensure: async () => null } },
				{ provide: ApifyService, useValue: { runActor } },
			],
		});
		entityManagerManager.setEntityManager(harness.orm.em);
		posts = harness.moduleRef.get(SocialPostService);
		counts = harness.moduleRef.get(PostCountsService);
	});

	afterAll(async () => {
		await harness.stop();
	});

	beforeEach(() => {
		runActor.mockReset();
		harness.orm.em.clear();
	});

	const tiktok = (externalId: string, postedAt: Date, views: number): PostFields => ({
		externalId,
		platform: SocialPlatformEnum.TIKTOK,
		url: `https://www.tiktok.com/@someone/video/${externalId}`,
		postedAt,
		author: 'someone',
		authorFans: 1000,
		views,
		likes: views / 10,
		shares: 1,
		comments: 2,
		saves: 3,
	});

	const stored = (externalId: string) =>
		harness.orm.em.fork().findOneOrFail(SocialPost, { externalId }, { populate: ['snapshots'] });

	/** A stored post whose counts were last read `readDaysAfter` days after it was posted. */
	const seed = (
		city: City,
		fields: Partial<SocialPost> & Pick<SocialPost, 'externalId' | 'platform' | 'url' | 'postedAt'>,
		readDaysAfter = 1,
	) =>
		harness.orm.em.create(SocialPost, {
			city,
			views: 10,
			likes: 1,
			countsAt: new Date(fields.postedAt.getTime() + readDaysAfter * DAY),
			...fields,
		});

	it('updates the counts with every read until one at seven days, keeps that one, and snapshots every read', async () => {
		const city = await cityFactory.create();
		const em = harness.orm.em;

		await posts.upsert(tiktok('7100000000000000001', daysAgo(2), 100), city);
		await em.flush();
		let post = await stored('7100000000000000001');
		expect(post).toMatchObject({ views: 100, countsFinalAt: null });
		expect(post.countsAt).toBeInstanceOf(Date);
		expect(post.snapshots.length).toBe(1);

		// Found again two days old: still young, the counts move
		await posts.upsert(tiktok('7100000000000000001', daysAgo(2), 300), city);
		await em.flush();
		post = await stored('7100000000000000001');
		expect(post).toMatchObject({ views: 300, countsFinalAt: null });

		// The read at seven days is kept
		const atSeven = new Date(post.postedAt.getTime() + POST_COUNTS_AGE_DAYS * DAY);
		const live = await em.findOneOrFail(SocialPost, { externalId: '7100000000000000001' });
		posts.readCounts(live, { views: 900, likes: 80, shares: 4, comments: 9, saves: 6 }, atSeven);
		await em.flush();

		// A later find adds a snapshot and the author's followers, never the counts
		await posts.upsert({ ...tiktok('7100000000000000001', daysAgo(2), 5000), authorFans: 2500 }, city);
		await em.flush();
		post = await stored('7100000000000000001');
		expect(post).toMatchObject({ views: 900, likes: 80, saves: 6, authorFans: 2500 });
		expect(post.countsFinalAt).toEqual(atSeven);
		expect(post.countsAt).toEqual(atSeven);
		// Oldest first by read time: the seven-day read is dated in the future here
		expect(post.snapshots.getItems().map(s => s.views)).toEqual([100, 300, 5000, 900]);
	});

	it('keeps the counts of a post first found seven days old or older, and gives a blog article none', async () => {
		const city = await cityFactory.create();
		await posts.upsert(tiktok('7100000000000000002', daysAgo(10), 4000), city);
		await posts.upsert(
			{
				externalId: 'blog_abc',
				platform: SocialPlatformEnum.BLOG,
				url: 'https://blog.example/post',
				postedAt: daysAgo(10),
				author: 'blog.example',
			},
			city,
		);
		await harness.orm.em.flush();

		const late = await stored('7100000000000000002');
		expect(late.views).toBe(4000);
		expect(late.countsFinalAt).toEqual(late.countsAt);
		const blog = await stored('blog_abc');
		expect(blog).toMatchObject({ countsAt: null, countsFinalAt: null });
		expect(blog.snapshots.length).toBe(0);
	});

	it('reads the posts that turned seven days old, oldest first, keeping each read and closing deleted ones', async () => {
		const em = harness.orm.em;
		const city = await cityFactory.create();
		const other = await cityFactory.create();
		const tt = (id: string, days: number, extra: Partial<SocialPost> = {}, readDaysAfter = 1) =>
			seed(
				city,
				{
					externalId: id,
					platform: SocialPlatformEnum.TIKTOK,
					url: `https://www.tiktok.com/@someone/video/${id}`,
					postedAt: daysAgo(days),
					...extra,
				},
				readDaysAfter,
			);
		tt(tiktokPostItem.id, 8, { url: tiktokPostItem.webVideoUrl });
		tt('7000000000000000000', 9, { url: tiktokGoneItem.url, views: 77 });
		tt('7100000000000000003', 7.5); // the actor returns nothing for it
		tt('7100000000000000004', 3); // too young
		tt('7100000000000000005', 20); // too old to read at a comparable age
		tt('7100000000000000006', 8, { countsFinalAt: daysAgo(1) }); // a scrape read it at seven days
		seed(city, {
			externalId: `ig_${instagramPhotoItem.id}`,
			platform: SocialPlatformEnum.INSTAGRAM,
			url: instagramPhotoItem.url,
			postedAt: daysAgo(8),
		});
		seed(city, {
			externalId: 'ig_1',
			platform: SocialPlatformEnum.INSTAGRAM,
			url: instagramGoneItem.url,
			postedAt: daysAgo(10),
		});
		seed(city, { externalId: 'blog_x', platform: SocialPlatformEnum.BLOG, url: 'https://blog.example/x', postedAt: daysAgo(8) });
		seed(other, {
			externalId: '7100000000000000007',
			platform: SocialPlatformEnum.TIKTOK,
			url: 'https://www.tiktok.com/@x/video/7100000000000000007',
			postedAt: daysAgo(8),
		});
		await em.flush();
		runActor.mockImplementation(async actor =>
			actor === 'clockworks/tiktok-scraper' ? [tiktokGoneItem, tiktokPostItem] : [instagramGoneItem, instagramPhotoItem],
		);

		const result = await counts.refresh(city, 2);

		expect(result).toEqual({ due: 5, tiktok: 3, instagram: 2, read: 2, gone: 2, notReturned: 1, waiting: 0 });
		const calls = Object.fromEntries(runActor.mock.calls.map(([actor, input, opts]) => [actor, { input, cap: opts.maxCostUsd }]));
		expect(calls['clockworks/tiktok-scraper'].input).toEqual({
			postURLs: [
				tiktokGoneItem.url,
				tiktokPostItem.webVideoUrl,
				'https://www.tiktok.com/@someone/video/7100000000000000003',
			],
			shouldDownloadVideos: false,
			shouldDownloadCovers: false,
			shouldDownloadSubtitles: false,
			shouldDownloadSlideshowImages: false,
		});
		expect(calls['apify/instagram-scraper'].input).toEqual({
			directUrls: [instagramGoneItem.url, instagramPhotoItem.url],
			resultsType: 'posts',
			resultsLimit: 1,
		});
		// The budget split by planned spend: TikTok 3 × $0.0039, Instagram 2 × $0.0027
		expect(calls['clockworks/tiktok-scraper'].cap).toBeCloseTo((2 * 0.0117) / 0.0171, 5);
		expect(calls['apify/instagram-scraper'].cap).toBeCloseTo((2 * 0.0054) / 0.0171, 5);

		const read = await stored(tiktokPostItem.id);
		expect(read).toMatchObject({ views: 6055, likes: 126, shares: 91, comments: 17, saves: 66 });
		expect(read.countsFinalAt).toEqual(read.countsAt);
		expect(read.snapshots.getItems().map(s => s.views)).toEqual([6055]);
		const gone = await stored('7000000000000000000');
		expect(gone.views).toBe(77);
		expect(gone.countsFinalAt).toBeInstanceOf(Date);
		expect(gone.snapshots.length).toBe(0);
		expect((await stored('7100000000000000003')).countsFinalAt).toBeNull();
		const photo = await stored(`ig_${instagramPhotoItem.id}`);
		expect(photo).toMatchObject({ views: 0, likes: 16, comments: 3 });
		expect(photo.countsFinalAt).toBeInstanceOf(Date);
		expect((await stored('ig_1')).countsFinalAt).toBeInstanceOf(Date);
		// Nothing else is due any more but the one the actor skipped
		expect((await counts.due(city)).map(p => p.externalId)).toEqual(['7100000000000000003']);
	});

	it("leaves Instagram posts while Instagram is off, and keeps the oldest first when the budget runs short", async () => {
		const em = harness.orm.em;
		const city = await cityFactory.create({ instagramEnabled: false });
		for (const [id, days] of [
			['7200000000000000001', 8],
			['7200000000000000002', 10],
			['7200000000000000003', 9],
		] as const)
			seed(city, {
				externalId: id,
				platform: SocialPlatformEnum.TIKTOK,
				url: `https://www.tiktok.com/@someone/video/${id}`,
				postedAt: daysAgo(days),
			});
		seed(city, {
			externalId: 'ig_4',
			platform: SocialPlatformEnum.INSTAGRAM,
			url: 'https://www.instagram.com/p/OFF/',
			postedAt: daysAgo(8),
		});
		await em.flush();
		runActor.mockResolvedValue([]);

		const result = await counts.refresh(city, 2 * 0.0039);

		expect(runActor).toHaveBeenCalledTimes(1);
		const [actor, input, opts] = runActor.mock.calls[0];
		expect(actor).toBe('clockworks/tiktok-scraper');
		expect(input.postURLs).toEqual([
			'https://www.tiktok.com/@someone/video/7200000000000000002',
			'https://www.tiktok.com/@someone/video/7200000000000000003',
		]);
		// Clockworks refuses a cap under $0.50: a cap, not a spend
		expect(opts.maxCostUsd).toBe(0.5);
		expect(result).toMatchObject({ due: 3, tiktok: 2, instagram: 0, read: 0, notReturned: 2, waiting: 1 });
	});

	it("keeps one platform's reads when the other run fails, then fails", async () => {
		const em = harness.orm.em;
		const city = await cityFactory.create();
		seed(city, {
			externalId: '7300000000000000001',
			platform: SocialPlatformEnum.TIKTOK,
			url: 'https://www.tiktok.com/@someone/video/7300000000000000001',
			postedAt: daysAgo(8),
		});
		seed(city, {
			externalId: `ig_${instagramReelItem.id}`,
			platform: SocialPlatformEnum.INSTAGRAM,
			url: instagramReelItem.url,
			postedAt: daysAgo(8),
		});
		await em.flush();
		runActor.mockImplementation(async actor => {
			if (actor === 'clockworks/tiktok-scraper') throw new Error('actor failed');
			return [instagramReelItem];
		});

		await expect(counts.refresh(city, 2)).rejects.toThrow('actor failed');

		const reel = await stored(`ig_${instagramReelItem.id}`);
		expect(reel).toMatchObject({ views: 51211, likes: 1123, comments: 16 });
		expect(reel.countsFinalAt).toBeInstanceOf(Date);
		expect((await stored('7300000000000000001')).countsFinalAt).toBeNull();
	});
});
