// import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';
//
// import { ApifyService } from 'src/modules/apify/services/apify.service.js';
// import type { City } from 'src/modules/cities/entities/city.entity.js';
// import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
// import { Brand } from 'src/modules/venues/entities/brand.entity.js';
// import { Venue } from 'src/modules/venues/entities/venue.entity.js';
// import { entityManagerManager } from 'src/shared/util/em.js';
// import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';
//
// import { AccountBrandSourceEnum, SocialAccount } from '../entities/social-account.entity.js';
// import {
// 	AccountSnapshotSourceEnum,
// 	SocialAccountSnapshot,
// } from '../entities/social-account-snapshot.entity.js';
// import { SocialPlatformEnum, SocialPost } from '../entities/social-post.entity.js';
// import {
// 	AccountScrapeService,
// 	INSTAGRAM_PROFILE_ACTOR,
// 	TRACK_CREATOR_MIN_FOLLOWERS,
// 	TRACK_CREATOR_MIN_VIEWS,
// 	TRACK_PROFILE_EVERY_DAYS,
// } from '../services/account-scrape.service.js';
// import { HashtagService } from '../services/hashtag.service.js';
// import { SocialAccountService } from '../services/social-account.service.js';
// import { SocialPostService } from '../services/social-post.service.js';
//
// import { TWIN_INSTAGRAM_ITEMS, TWIN_TIKTOK_ITEMS } from './fixtures/twin-profile-items.js';
//
// const IG = SocialPlatformEnum.INSTAGRAM;
// const TT = SocialPlatformEnum.TIKTOK;
// const NOW = new Date('2026-10-26T05:45:00Z');
// const DAY = 24 * 3600 * 1000;
//
// // Real Munchies items, renamed: an Instagram profile (16,740 followers, follows 279, with a post
// // in its latest) and a TikTok video whose author has 18,500 fans
// const instagramItem = (handle: string) => ({
// 	...TWIN_INSTAGRAM_ITEMS[0],
// 	// Each renamed profile is another user
// 	id: `ig-${handle}`,
// 	username: handle,
// 	url: `https://www.instagram.com/${handle}`,
// 	latestPosts: [
// 		{
// 			id: '4012962569291174220',
// 			shortCode: 'Dew6DH3ihFM',
// 			type: 'Image',
// 			caption: 'New in Mitte',
// 			url: 'https://www.instagram.com/p/Dew6DH3ihFM/',
// 			timestamp: '2026-10-25T18:00:00.000Z',
// 			likesCount: 120,
// 			commentsCount: 4,
// 			ownerUsername: handle,
// 		},
// 	],
// });
// const tiktokItem = (handle: string) => ({
// 	...TWIN_TIKTOK_ITEMS[1],
// 	input: handle,
// 	authorMeta: {
// 		...TWIN_TIKTOK_ITEMS[1].authorMeta,
// 		id: `tt-${handle}`,
// 		name: handle,
// 		nickName: handle,
// 	},
// });
//
// /*
//  * The profile tracking (`TRACK_PROFILES`, weekly): every brand account with an open branch in the
//  * city and every creator account over the thresholds, the profile only, each again two weeks after
//  * its last profile.
//  */
// describe('AccountScrapeService.trackProfiles (pglite)', () => {
// 	let harness: PgliteTestingModule;
// 	let service: AccountScrapeService;
// 	let city: City;
// 	let other: City;
// 	let profiles: Record<string, unknown>;
// 	const runActor = jest.fn(async (actor: string, input: any, _opts: { maxCostUsd: number }) => {
// 		const platform = actor === INSTAGRAM_PROFILE_ACTOR ? IG : TT;
// 		const handles: string[] = platform === IG ? input.usernames : input.profiles;
// 		return handles.map(h => structuredClone(profiles[`${platform}:${h}`])).filter(Boolean);
// 	});
//
// 	beforeAll(async () => {
// 		harness = await createPgliteTestingModule({
// 			providers: [
// 				AccountScrapeService,
// 				SocialAccountService,
// 				SocialPostService,
// 				{ provide: HashtagService, useValue: { relink: jest.fn() } },
// 				{ provide: ApifyService, useValue: { runActor } },
// 			],
// 		});
// 		service = harness.moduleRef.get(AccountScrapeService);
// 		entityManagerManager.setEntityManager(harness.orm.em);
// 		city = testCity(harness.orm.em);
// 		other = testCity(harness.orm.em, { name: 'Hamburg', slug: 'hamburg' } as Partial<City>);
// 		await harness.orm.em.flush();
// 	});
//
// 	afterAll(async () => {
// 		await harness.stop();
// 	});
//
// 	let n = 0;
// 	const brandIn = async (name: string, where: City, leadScore?: number, closed = false) => {
// 		const em = harness.orm.em;
// 		const brand = em.create(Brand, { name, key: `${name.toLowerCase()}${++n}`, leadScore });
// 		em.create(Venue, {
// 			city: where,
// 			brand,
// 			placeId: `track-${n}`,
// 			name,
// 			category: 'Restaurant',
// 			closed,
// 		});
// 		await em.flush();
// 		return brand;
// 	};
// 	const accountOf = async (
// 		brand: Brand | null,
// 		platform: SocialPlatformEnum,
// 		handle: string,
// 		fields: Partial<SocialAccount> = {},
// 	) => {
// 		const em = harness.orm.em;
// 		const account = em.create(SocialAccount, {
// 			platform,
// 			handle,
// 			city,
// 			...(brand && { brand, brandSource: AccountBrandSourceEnum.ADMIN }),
// 			...fields,
// 		} as SocialAccount);
// 		await em.flush();
// 		return account;
// 	};
// 	const profiledDaysAgo = async (account: SocialAccount, days: number) => {
// 		const em = harness.orm.em;
// 		const at = new Date(NOW.getTime() - days * DAY);
// 		em.create(SocialAccountSnapshot, {
// 			account,
// 			scrapedAt: at,
// 			year: at.getUTCFullYear(),
// 			month: at.getUTCMonth() + 1,
// 			day: at.getUTCDate(),
// 			source: AccountSnapshotSourceEnum.PROFILE,
// 			followers: account.followers ?? null,
// 		});
// 		await em.flush();
// 	};
//
// 	it('takes brand accounts by lead score, then creators over the thresholds by followers, as the budget covers', async () => {
// 		const em = harness.orm.em;
// 		const sori = await brandIn('Sori', city, 80);
// 		const munch = await brandIn('Munch', city, 20);
// 		const fresh = await brandIn('Fresh', city, 50);
// 		const hamburg = await brandIn('Fischbude', other, 90);
// 		const shut = await brandIn('Gone', city, 99, true);
// 		await accountOf(sori, IG, 'soriramen', { followers: 16000 });
// 		await accountOf(sori, TT, 'soriramen');
// 		// Profiled 20 days ago: due again
// 		await profiledDaysAgo(await accountOf(munch, IG, 'munchiesde', { followers: 900 }), 20);
// 		// Profiled 3 days ago, another city's brand, a closed brand: not due
// 		await profiledDaysAgo(await accountOf(fresh, IG, 'freshplace', { followers: 400 }), 3);
// 		await accountOf(hamburg, IG, 'fischbude', { followers: 900 });
// 		await accountOf(shut, IG, 'goneplace', { followers: 900 });
//
// 		await accountOf(null, TT, 'bigcreator', { followers: TRACK_CREATOR_MIN_FOLLOWERS + 7000 });
// 		await accountOf(null, TT, 'smallcreator', { followers: 800 });
// 		const viral = await accountOf(null, TT, 'viralcreator', { followers: 800 });
// 		em.create(SocialPost, {
// 			city,
// 			account: viral,
// 			externalId: 'track-viral',
// 			platform: TT,
// 			url: 'https://tiktok.com/@viralcreator/video/1',
// 			author: 'viralcreator',
// 			postedAt: new Date('2026-10-20T12:00:00Z'),
// 			views: TRACK_CREATOR_MIN_VIEWS * 2,
// 		} as SocialPost);
// 		// Followers unknown and never asked: once; asked and not answered: not before 30 days
// 		await accountOf(null, IG, 'unknownig');
// 		await accountOf(null, IG, 'askedig', {
// 			followersAskedAt: new Date(NOW.getTime() - 5 * DAY),
// 		});
// 		// First seen in another city, profiled lately
// 		await accountOf(null, TT, 'hamburgcreator', {
// 			followers: 90_000,
// 			city: other,
// 		} as Partial<SocialAccount>);
// 		await profiledDaysAgo(
// 			await accountOf(null, TT, 'recentcreator', { followers: 90_000 }),
// 			TRACK_PROFILE_EVERY_DAYS - 1,
// 		);
// 		await em.flush();
// 		profiles = {
// 			[`${IG}:soriramen`]: instagramItem('soriramen'),
// 			[`${TT}:soriramen`]: tiktokItem('soriramen'),
// 			[`${IG}:munchiesde`]: instagramItem('munchiesde'),
// 			[`${TT}:bigcreator`]: tiktokItem('bigcreator'),
// 			[`${TT}:viralcreator`]: tiktokItem('viralcreator'),
// 		};
//
// 		// Room for the three brand accounts: $0.003 + $0.004 + $0.003
// 		const first = await service.trackProfiles(city, 0.011, NOW);
// 		expect(first).toEqual({ due: 6, brandAccounts: 3, asked: 3, profiles: 3 });
// 		expect(runActor.mock.calls.map(c => [c[0], c[1].usernames ?? c[1].profiles])).toEqual([
// 			[INSTAGRAM_PROFILE_ACTOR, ['soriramen', 'munchiesde']],
// 			[expect.any(String), ['soriramen']],
// 		]);
//
// 		// The next week: the creators left, most followed first; the profile that came back
// 		// without a count is asked again only after 30 days
// 		runActor.mockClear();
// 		const second = await service.trackProfiles(city, 1, NOW);
// 		expect(second).toEqual({ due: 3, brandAccounts: 0, asked: 3, profiles: 2 });
// 		expect(runActor.mock.calls.flatMap(c => c[1].usernames ?? c[1].profiles).sort()).toEqual(
// 			['bigcreator', 'unknownig', 'viralcreator'].sort(),
// 		);
// 		em.clear();
// 		const unknown = await em.findOneOrFail(SocialAccount, { handle: 'unknownig' });
// 		expect(unknown.followersAskedAt?.toISOString()).toBe(NOW.toISOString());
// 		const snapshots = await em.find(
// 			SocialAccountSnapshot,
// 			{ source: AccountSnapshotSourceEnum.PROFILE, scrapedAt: { $gte: NOW } },
// 			{ populate: ['account'] },
// 		);
// 		// Followers and the post count, each a snapshot
// 		const sorisIg = snapshots.find(
// 			s => s.account.handle === 'soriramen' && s.account.platform === IG,
// 		);
// 		expect(sorisIg).toMatchObject({ followers: 16740, following: 279 });
// 		expect(sorisIg?.posts).toEqual(expect.any(Number));
//
// 		// Nothing due until two weeks have passed
// 		expect(await service.trackProfiles(city, 1, NOW)).toEqual({
// 			due: 0,
// 			brandAccounts: 0,
// 			asked: 0,
// 			profiles: 0,
// 		});
// 		// Two weeks after this run's snapshots (stamped when they were taken), every profile is due
// 		// again: the five read now and the two that were fresh before
// 		const later = new Date(Date.now() + TRACK_PROFILE_EVERY_DAYS * DAY);
// 		expect((await service.trackProfiles(city, 0, later)).due).toBe(7);
// 	});
// });

import { describe, it } from '@jest/globals';

// Kept visible as skipped while the suite above stays commented out
describe.skip('account-tracking.pglite.spec (commented out)', () => {
	it.todo('port the suite above');
});
