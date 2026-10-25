import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { ApifyService } from 'src/modules/apify/services/apify.service.js';
import type { City } from 'src/modules/cities/entities/city.entity.js';
import { CitySource, CitySourceKindEnum } from 'src/modules/cities/entities/city-source.entity.js';
import { testCity, testCitySource } from 'src/modules/cities/tests/factories/city.factory.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { PostSource, PostSourceKindEnum } from '../entities/post-source.entity.js';
import { SocialAccount } from '../entities/social-account.entity.js';
import { SocialAccountSnapshot } from '../entities/social-account-snapshot.entity.js';
import { SocialPlatformEnum, SocialPost } from '../entities/social-post.entity.js';
import { AccountScrapeService } from '../services/account-scrape.service.js';
import { HashtagService } from '../services/hashtag.service.js';
import { SocialAccountService } from '../services/social-account.service.js';
import { SocialPostService } from '../services/social-post.service.js';

import { INSTAGRAM_PROFILE_ITEMS, TIKTOK_PROFILE_ITEMS } from './fixtures/profile-items.js';

const SINCE = '2026-10-17T00:00:00.000Z';
const NOW = new Date('2026-10-25T05:00:00Z');

describe('AccountScrapeService (pglite)', () => {
	let harness: PgliteTestingModule;
	let service: AccountScrapeService;
	let city: City;
	let source: CitySource;
	let failTikTok = false;
	const runActor = jest.fn(async (actor: string, _input: any, _opts: { maxCostUsd: number }): Promise<any[]> => {
		if (actor === 'apify/instagram-profile-scraper') return structuredClone(INSTAGRAM_PROFILE_ITEMS);
		if (actor === 'clockworks/tiktok-profile-scraper') {
			if (failTikTok) throw new Error('Apify refused the run');
			return [...structuredClone(TIKTOK_PROFILE_ITEMS), { error: 'Profile not found', input: 'gone_handle' }];
		}
		return [];
	});

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				AccountScrapeService,
				SocialAccountService,
				SocialPostService,
				// What a tag names is covered in post-links.pglite.spec.ts
				{ provide: HashtagService, useValue: { relink: jest.fn() } },
				{ provide: ApifyService, useValue: { runActor } },
			],
		});
		service = harness.moduleRef.get(AccountScrapeService);
		entityManagerManager.setEntityManager(harness.orm.em);
		const em = harness.orm.em;
		city = testCity(em);
		// The city watches the TikTok creator; the Instagram ones are watched for another reason
		source = testCitySource(em, city, CitySourceKindEnum.TIKTOK_ACCOUNT, 'berlingoodfood');
		await em.flush();
	});

	beforeEach(() => {
		runActor.mockClear();
	});

	afterAll(async () => {
		await harness.stop();
	});

	const targets = [
		{ platform: SocialPlatformEnum.INSTAGRAM, handle: 'berlindeneyenir' },
		{ platform: SocialPlatformEnum.INSTAGRAM, handle: 'churrolade_berlin' },
		{ platform: SocialPlatformEnum.TIKTOK, handle: 'berlingoodfood' },
		{ platform: SocialPlatformEnum.TIKTOK, handle: 'gone_handle' },
		// Asked twice: scraped once
		{ platform: SocialPlatformEnum.TIKTOK, handle: 'berlingoodfood' },
	] as const;

	it("stores the week's posts found on each profile, without a snapshot, paying TikTok only for the week", async () => {
		const em = harness.orm.em;
		const result = await service.scrape(city, [...targets], { since: SINCE, budgetUsd: 2, label: 'last week', now: NOW });

		// Two Instagram posts since the 17th (a recent pinned one counts, an old pinned one not)
		// and one TikTok video; the refused Instagram timeline and the gone handle bring none
		expect(result).toEqual({ accounts: 4, profiles: 3, snapshots: 0, found: 3, saved: 3 });
		const [igCall, ttCall] = runActor.mock.calls;
		expect(igCall[1]).toEqual({ usernames: ['berlindeneyenir', 'churrolade_berlin'] });
		expect(ttCall[1]).toMatchObject({
			profiles: ['berlingoodfood', 'gone_handle'],
			resultsPerPage: 10,
			oldestPostDateUnified: '2026-10-17',
			downloadSubtitlesOptions: 'DOWNLOAD_SUBTITLES',
		});
		// Split by paid items: 2 Instagram profiles against 2 × 10 TikTok videos
		expect(igCall[2].maxCostUsd).toBeCloseTo(2 * (2 / 22));
		expect(ttCall[2].maxCostUsd).toBeCloseTo(2 * (20 / 22));

		em.clear();
		const posts = await em.find(SocialPost, {}, { populate: ['account', 'foundBy'], orderBy: { postedAt: 'desc' } });
		expect(posts.map(p => [p.externalId, p.account?.handle, p.city.id])).toEqual([
			['7700240032950471969', 'berlingoodfood', city.id],
			['ig_4012962569291174220', 'berlindeneyenir', city.id],
			['ig_4012237201383600968', 'berlindeneyenir', city.id],
		]);
		const ig = posts.find(p => p.externalId === 'ig_4012962569291174220')!;
		expect(ig).toMatchObject({ platform: SocialPlatformEnum.INSTAGRAM, url: 'https://www.instagram.com/p/Dew6DH3ihFM/' });
		// Every post is a find of its profile; the TikTok one is the city's source
		const finds = await em.find(PostSource, {}, { populate: ['post'] });
		expect(finds.map(f => [f.post.externalId, f.kind, f.value, f.source?.id ?? null]).sort()).toEqual(
			[
				['7700240032950471969', PostSourceKindEnum.TIKTOK_ACCOUNT, 'berlingoodfood', source.id],
				['ig_4012962569291174220', PostSourceKindEnum.INSTAGRAM_ACCOUNT, 'berlindeneyenir', null],
				['ig_4012237201383600968', PostSourceKindEnum.INSTAGRAM_ACCOUNT, 'berlindeneyenir', null],
			].sort(),
		);

		// The accounts exist now, with the profiles' names and followers, the refused one too
		const accounts = await em.find(SocialAccount, {}, { orderBy: { handle: 'asc' } });
		expect(accounts.map(a => [a.platform, a.handle, a.displayName, a.followers])).toEqual([
			[SocialPlatformEnum.INSTAGRAM, 'berlindeneyenir', 'Işınsu Agca | Berlin’de ne yenir?', 18915],
			[SocialPlatformEnum.TIKTOK, 'berlingoodfood', 'berlingoodfood', 569],
			[SocialPlatformEnum.INSTAGRAM, 'churrolade_berlin', 'Churrolade.official', 2708],
		]);
		expect(await em.count(SocialAccountSnapshot, {})).toBe(0);
	});

	it('a snapshot run writes the month for every profile that came back, and takes the latest ten videos whatever their date', async () => {
		const em = harness.orm.em;
		const result = await service.scrape(city, [...targets], {
			since: '2026-10-01T00:00:00.000Z',
			budgetUsd: 4,
			snapshotMonth: '2026-10',
			label: '2026-10',
			now: NOW,
		});
		expect(result).toMatchObject({ profiles: 3, snapshots: 3 });
		expect(runActor.mock.calls[1][1]).not.toHaveProperty('oldestPostDateUnified');
		em.clear();
		const snapshots = await em.find(SocialAccountSnapshot, {}, { populate: ['account'] });
		const byHandle = new Map(snapshots.map(s => [s.account.handle, s]));
		expect(byHandle.get('berlingoodfood')).toMatchObject({ month: '2026-10', followers: 569, posts: 189 });
		// The refused timeline: followers known, no posts to average
		expect(byHandle.get('churrolade_berlin')).toMatchObject({ followers: 2708, avgViews: null, postsLast30Days: 0 });
		// Posts seen again stay one row each; October's earlier ones join them (an Instagram post
		// of the 16th, a video of the 11th)
		expect(await em.count(SocialPost, {})).toBe(5);
	});

	it("keeps the Instagram run's posts when the TikTok run fails, then fails", async () => {
		const em = harness.orm.em;
		await em.nativeDelete(SocialPost, {});
		failTikTok = true;
		await expect(
			service.scrape(city, [...targets], { since: SINCE, budgetUsd: 2, label: 'last week', now: NOW }),
		).rejects.toThrow('Apify refused the run');
		failTikTok = false;
		expect(await em.count(SocialPost, { platform: SocialPlatformEnum.INSTAGRAM })).toBe(2);
	});

	it('scrapes nothing for no targets', async () => {
		expect(await service.scrape(city, [], { since: SINCE, budgetUsd: 2, label: 'last week' })).toEqual({
			accounts: 0,
			profiles: 0,
			snapshots: 0,
			found: 0,
			saved: 0,
		});
		expect(runActor).not.toHaveBeenCalled();
	});
});
