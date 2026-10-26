import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { ApifyService } from 'src/modules/apify/services/apify.service.js';
import type { City } from 'src/modules/cities/entities/city.entity.js';
import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { Brand } from 'src/modules/venues/entities/brand.entity.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { AccountBrandSourceEnum, SocialAccount } from '../entities/social-account.entity.js';
import { SocialAccountSnapshot } from '../entities/social-account-snapshot.entity.js';
import { SocialPlatformEnum, SocialPost } from '../entities/social-post.entity.js';
import {
	AccountScrapeService,
	INSTAGRAM_PROFILE_ACTOR,
	TIKTOK_PROFILE_ACTOR,
} from '../services/account-scrape.service.js';
import { HashtagService } from '../services/hashtag.service.js';
import { SocialAccountService } from '../services/social-account.service.js';
import { SocialPostService } from '../services/social-post.service.js';

import { TWIN_INSTAGRAM_ITEMS, TWIN_TIKTOK_ITEMS } from './fixtures/twin-profile-items.js';

const IG = SocialPlatformEnum.INSTAGRAM;
const TT = SocialPlatformEnum.TIKTOK;
const NOW = new Date('2026-10-26T05:45:00Z');
const DAY = 24 * 3600 * 1000;

// Real Munchies items, renamed: an Instagram profile (16,740 followers, follows 279, with a post
// in its latest) and a TikTok video whose author has 18,500 fans
const instagramItem = (handle: string) => ({
	...TWIN_INSTAGRAM_ITEMS[0],
	username: handle,
	url: `https://www.instagram.com/${handle}`,
	latestPosts: [
		{
			id: '4012962569291174220',
			shortCode: 'Dew6DH3ihFM',
			type: 'Image',
			caption: 'New in Mitte',
			url: 'https://www.instagram.com/p/Dew6DH3ihFM/',
			timestamp: '2026-10-25T18:00:00.000Z',
			likesCount: 120,
			commentsCount: 4,
			ownerUsername: handle,
		},
	],
});
const tiktokItem = (handle: string) => ({
	...TWIN_TIKTOK_ITEMS[1],
	input: handle,
	authorMeta: { ...TWIN_TIKTOK_ITEMS[1].authorMeta, name: handle, nickName: handle },
});

/*
 * The daily follower fill (`FILL_ACCOUNT_FOLLOWERS`): brand accounts with no follower count get
 * their profile scraped, only the profile, as the budget covers.
 */
describe('AccountScrapeService.fillFollowers (pglite)', () => {
	let harness: PgliteTestingModule;
	let service: AccountScrapeService;
	let city: City;
	let other: City;
	// What the profile actors answer, by platform and handle; absent: not returned
	let profiles: Record<string, unknown>;
	let failTikTok = false;
	const runActor = jest.fn(async (actor: string, input: any, _opts: { maxCostUsd: number }) => {
		const platform = actor === INSTAGRAM_PROFILE_ACTOR ? IG : TT;
		if (platform === TT && failTikTok) throw new Error('Apify refused the run');
		const handles: string[] = platform === IG ? input.usernames : input.profiles;
		return handles.map(h => structuredClone(profiles[`${platform}:${h}`])).filter(Boolean);
	});

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				AccountScrapeService,
				SocialAccountService,
				SocialPostService,
				{ provide: HashtagService, useValue: { relink: jest.fn() } },
				{ provide: ApifyService, useValue: { runActor } },
			],
		});
		service = harness.moduleRef.get(AccountScrapeService);
		entityManagerManager.setEntityManager(harness.orm.em);
		city = testCity(harness.orm.em);
		other = testCity(harness.orm.em, { name: 'Hamburg', slug: 'hamburg' } as Partial<City>);
		await harness.orm.em.flush();
	});

	afterAll(async () => {
		await harness.stop();
	});

	beforeEach(async () => {
		profiles = {};
		failTikTok = false;
		runActor.mockClear();
		const em = harness.orm.em;
		await em.nativeDelete(SocialAccountSnapshot, {});
		await em.nativeDelete(SocialAccount, {});
		await em.nativeDelete(Venue, {});
		await em.nativeDelete(Brand, {});
		em.clear();
	});

	let n = 0;
	const brandIn = async (name: string, where: City, leadScore?: number, closed = false) => {
		const em = harness.orm.em;
		const brand = em.create(Brand, { name, key: `${name.toLowerCase()}${++n}`, leadScore });
		em.create(Venue, { city: where, brand, placeId: `fill-${n}`, name, category: 'Restaurant', closed });
		await em.flush();
		return brand;
	};
	const accountOf = async (brand: Brand | null, platform: SocialPlatformEnum, handle: string, fields: Partial<SocialAccount> = {}) => {
		const em = harness.orm.em;
		const account = em.create(SocialAccount, {
			platform,
			handle,
			city,
			...(brand && { brand, brandSource: AccountBrandSourceEnum.ADMIN }),
			...fields,
		} as SocialAccount);
		await em.flush();
		return account;
	};
	const reload = (handle: string) => harness.orm.em.findOneOrFail(SocialAccount, { handle }, { refresh: true });

	it("scrapes the profiles of the city's brand accounts with no follower count, and stores no posts", async () => {
		const em = harness.orm.em;
		const sori = await brandIn('Sori', city, 80);
		const munch = await brandIn('Munch', city, 20);
		const hamburg = await brandIn('Fischbude', other, 90);
		const shut = await brandIn('Gone', city, 99, true);
		await accountOf(sori, IG, 'soriramen');
		await accountOf(sori, TT, 'soriramen');
		await accountOf(munch, IG, 'munchiesde');
		// Counted already, another city's brand, a closed brand, a creator: not asked for
		await accountOf(munch, TT, 'munchiesde', { followers: 900 });
		await accountOf(hamburg, IG, 'fischbude');
		await accountOf(shut, IG, 'goneplace');
		await accountOf(null, IG, 'somecreator');
		profiles = {
			[`${IG}:soriramen`]: instagramItem('soriramen'),
			[`${TT}:soriramen`]: tiktokItem('soriramen'),
			[`${IG}:munchiesde`]: instagramItem('munchiesde'),
		};

		const result = await service.fillFollowers(city, 1, NOW);

		expect(result).toEqual({ missing: 3, asked: 3, filled: 3, profiles: 3 });
		const [igCall, ttCall] = runActor.mock.calls;
		expect(igCall[1]).toEqual({ usernames: ['soriramen', 'munchiesde'] });
		// The profile alone: its one latest video, whatever its date, no subtitles
		expect(ttCall[1]).toMatchObject({ profiles: ['soriramen'], resultsPerPage: 1 });
		expect(ttCall[1]).not.toHaveProperty('oldestPostDateUnified');
		expect(ttCall[1]).not.toHaveProperty('downloadSubtitlesOptions');
		// The asked profiles' cost ($0.01) split by count, each run at least $0.05
		expect(igCall[2].maxCostUsd).toBe(0.05);
		expect(ttCall[2].maxCostUsd).toBe(0.05);

		em.clear();
		expect((await reload('soriramen')).followers).toBe(16740);
		expect((await em.findOneOrFail(SocialAccount, { platform: TT, handle: 'soriramen' })).followers).toBe(18500);
		const snapshots = await em.find(SocialAccountSnapshot, {}, { populate: ['account'] });
		expect(snapshots.map(s => [s.account.platform, s.account.handle, s.source, s.followers, s.following]).sort()).toEqual(
			[
				[IG, 'munchiesde', 'profile', 16740, 279],
				[IG, 'soriramen', 'profile', 16740, 279],
				// The TikTok fixture carries no following count
				[TT, 'soriramen', 'profile', 18500, null],
			].sort(),
		);
		// One video is no average over the latest ten
		expect(snapshots.find(s => s.account.platform === TT)!.avgViews).toBeNull();
		expect(await em.count(SocialPost, {})).toBe(0);
		// Filled accounts need no stamp: they are out of the set by their count
		expect((await reload('munchiesde')).followersAskedAt).toBeNull();
	});

	it('takes the highest lead scores first, as many as the budget covers', async () => {
		const low = await brandIn('Low', city, 10);
		const high = await brandIn('High', city, 90);
		const none = await brandIn('Unscored', city);
		await accountOf(low, IG, 'lowplace');
		await accountOf(high, TT, 'highplace');
		await accountOf(none, IG, 'unscored');
		profiles = { [`${TT}:highplace`]: tiktokItem('highplace'), [`${IG}:lowplace`]: instagramItem('lowplace') };

		// $0.004 for the TikTok profile and $0.003 for one Instagram one: the unscored waits
		const result = await service.fillFollowers(city, 0.0075, NOW);

		expect(result).toEqual({ missing: 3, asked: 2, filled: 2, profiles: 2 });
		expect(runActor.mock.calls.map(c => c[1].usernames ?? c[1].profiles)).toEqual([['lowplace'], ['highplace']]);
		expect((await reload('unscored')).followersAskedAt).toBeNull();
	});

	it('asks again a month later for a profile that did not come back', async () => {
		const brand = await brandIn('Private', city, 50);
		await accountOf(brand, IG, 'privateplace');

		expect(await service.fillFollowers(city, 1, NOW)).toEqual({ missing: 1, asked: 1, filled: 0, profiles: 0 });
		expect((await reload('privateplace')).followersAskedAt).toEqual(NOW);

		// The next days skip it, free
		runActor.mockClear();
		const tomorrow = new Date(NOW.getTime() + DAY);
		expect(await service.fillFollowers(city, 1, tomorrow)).toEqual({ missing: 0, asked: 0, filled: 0, profiles: 0 });
		expect(runActor).not.toHaveBeenCalled();

		profiles = { [`${IG}:privateplace`]: instagramItem('privateplace') };
		const monthOn = new Date(NOW.getTime() + 31 * DAY);
		expect(await service.fillFollowers(city, 1, monthOn)).toEqual({ missing: 1, asked: 1, filled: 1, profiles: 1 });
		expect((await reload('privateplace')).followers).toBe(16740);
	});

	it('stamps none when a run fails, keeping the other run’s counts, then fails', async () => {
		const brand = await brandIn('Both', city, 50);
		await accountOf(brand, IG, 'bothplace');
		await accountOf(brand, TT, 'bothplace');
		profiles = { [`${IG}:bothplace`]: instagramItem('bothplace') };
		failTikTok = true;

		await expect(service.fillFollowers(city, 1, NOW)).rejects.toThrow('Apify refused the run');

		const em = harness.orm.em;
		em.clear();
		const accounts = await em.find(SocialAccount, { handle: 'bothplace' });
		expect(accounts.map(a => [a.platform, a.followers ?? null, a.followersAskedAt ?? null]).sort()).toEqual([
			[IG, 16740, null],
			[TT, null, null],
		]);
	});
});
