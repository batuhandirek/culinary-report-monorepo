import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';

import { ApifyService } from 'src/modules/apify/services/apify.service.js';
import type { City } from 'src/modules/cities/entities/city.entity.js';
import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { Brand } from 'src/modules/venues/entities/brand.entity.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { AdminBrandAccountsController } from '../controllers/admin.brand-accounts.controller.js';
import { AccountBrandSourceEnum, SocialAccount } from '../entities/social-account.entity.js';
import { SocialAccountSnapshot } from '../entities/social-account-snapshot.entity.js';
import { SocialPlatformEnum } from '../entities/social-post.entity.js';
import { AccountScrapeService } from '../services/account-scrape.service.js';
import { HashtagService } from '../services/hashtag.service.js';
import { OwnAccountService } from '../services/own-account.service.js';
import { SocialAccountService } from '../services/social-account.service.js';
import { SocialPostService } from '../services/social-post.service.js';
import { instagramProfileFigures, type ProfilePlatform, tiktokProfileFigures } from '../util/accounts.js';

import { ownAccount } from './factories/social-account.factory.js';

// One item in the shape `apify/instagram-profile-scraper` documents
const instagramProfile = (followersCount: number, postsCount: number) => ({
	inputUrl: 'https://www.instagram.com/chenche_berlin',
	id: '528817151',
	username: 'chenche_berlin',
	fullName: 'Chén Chè Teehaus',
	followersCount,
	followsCount: 80,
	postsCount,
	isBusinessAccount: true,
	businessCategoryName: 'Restaurant',
	private: false,
	verified: false,
	latestPosts: [
		// Pinned and old: left out of the averages
		{ id: 'p0', type: 'Image', likesCount: 9000, timestamp: '2025-01-01T10:00:00.000Z', isPinned: true },
		{ id: 'p1', type: 'Video', likesCount: 300, commentsCount: 4, videoViewCount: 9000, timestamp: '2026-09-28T17:00:00.000Z' },
		{ id: 'p2', type: 'Image', likesCount: 100, commentsCount: 2, timestamp: '2026-09-20T17:00:00.000Z' },
		{ id: 'p3', type: 'Video', likesCount: -1, videoViewCount: 3000, timestamp: '2026-08-01T17:00:00.000Z' },
	],
});

// Items in the shape `clockworks/tiktok-profile-scraper` documents: one per video
const tiktokVideo = (n: number, playCount: number, createTimeISO: string, fans = 1500) => ({
	id: `75500000000000000${n}`,
	webVideoUrl: `https://www.tiktok.com/@chenche.berlin/video/75500000000000000${n}`,
	createTimeISO,
	playCount,
	diggCount: playCount / 10,
	authorMeta: { name: 'chenche.berlin', nickName: 'Chén Chè', fans, video: 42, heart: 26110 },
});

describe('OwnAccountService (pglite)', () => {
	let harness: PgliteTestingModule;
	let service: OwnAccountService;
	let city: City;
	let venue: Venue;
	let brand: Brand;
	let instagramFollowers = 4200;
	const runActor = jest.fn(async (actor: string, _input: any, _opts: { maxCostUsd: number }): Promise<any[]> => {
		if (actor === 'apify/instagram-profile-scraper') return [instagramProfile(instagramFollowers, 120)];
		if (actor === 'clockworks/tiktok-profile-scraper')
			return [
				tiktokVideo(1, 20_000, '2026-09-25T10:00:00.000Z'),
				tiktokVideo(2, 4_000, '2026-09-10T10:00:00.000Z'),
				{ error: 'Profile not found', input: 'gone_handle' },
			];
		return [];
	});

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				OwnAccountService,
				SocialAccountService,
				AccountScrapeService,
				SocialPostService,
				HashtagService,
				AdminBrandAccountsController,
				{ provide: ApifyService, useValue: { runActor } },
			],
		});
		service = harness.moduleRef.get(OwnAccountService);
		entityManagerManager.setEntityManager(harness.orm.em);
		const em = harness.orm.em;
		city = testCity(em);
		venue = em.create(Venue, { city, placeId: 'p-chenche', name: 'Chén Chè', category: 'Vietnamese restaurant' });
		await em.flush();
		brand = await em.findOneOrFail(Brand, { id: venue.brand.id }, { populate: ['branches'] });
		ownAccount(em, brand, city, 'chenche.berlin', SocialPlatformEnum.TIKTOK);
		ownAccount(em, brand, city, 'chenche_berlin', SocialPlatformEnum.INSTAGRAM);
		await em.flush();
	});

	afterAll(async () => {
		await harness.stop();
	});

	it('takes the prospect’s handle once, an account it already has is not doubled', async () => {
		expect(
			await service.addProspectHandles([
				{ brandId: brand.id, instagram: '@chenche_berlin' },
				{ brandId: brand.id, instagram: 'chenche.teehaus' },
			]),
		).toEqual({ created: 1 });
		const account = await harness.orm.em.findOneOrFail(SocialAccount, { handle: 'chenche.teehaus' }, { populate: ['creator'] });
		expect(account).toMatchObject({ brandSource: AccountBrandSourceEnum.PROSPECT, brand: { id: brand.id } });
		// A new account gets a creator of its own
		expect(account.creator.name).toBe('chenche.teehaus');
	});

	it('an admin’s removal is final: outreach never links it back', async () => {
		const em = harness.orm.em;
		const account = await em.findOneOrFail(SocialAccount, { handle: 'chenche.teehaus' });
		const controller = harness.moduleRef.get(AdminBrandAccountsController);
		const list = await controller.removeBrandAccount(brand.id, account.id);
		// Still listed on the brand page, to undo
		expect(list.find(a => a.id === account.id)).toMatchObject({ rejections: [{ brand: { id: brand.id } }] });
		expect(list.find(a => a.id === account.id)?.brand).toBeUndefined();
		expect(await service.addProspectHandles([{ brandId: brand.id, instagram: 'chenche.teehaus' }])).toEqual({
			created: 0,
		});
	});

	// The monthly run's scrape of the brand's linked accounts (the watch list decides which)
	const scrapeMonth = async (month: string, now: Date) => {
		const accounts = await harness.orm.em.find(SocialAccount, { brand: brand.id });
		return harness.moduleRef.get(AccountScrapeService).scrape(
			city,
			accounts.map(a => ({ platform: a.platform as ProfilePlatform, handle: a.handle })),
			{ since: `${month}-01T00:00:00.000Z`, budgetUsd: 2, snapshotMonth: month, label: month, now },
		);
	};

	it('scrapes a snapshot per month per account and reports the growth', async () => {
		const em = harness.orm.em;
		const first = await scrapeMonth('2026-08', new Date('2026-09-02T06:00:00Z'));
		// The removed account is not scraped; the budget splits by paid items (1 vs 10)
		expect(first).toMatchObject({ accounts: 2, profiles: 2, snapshots: 2 });
		const [igCall, ttCall] = runActor.mock.calls;
		expect(igCall[1]).toEqual({ usernames: ['chenche_berlin'] });
		expect(igCall[2].maxCostUsd).toBeCloseTo(2 / 11);
		// A snapshot run takes the latest ten videos whatever their date: the averages are over them
		expect(ttCall[1]).toMatchObject({ profiles: ['chenche.berlin'], resultsPerPage: 10, profileSorting: 'latest' });
		expect(ttCall[1]).not.toHaveProperty('oldestPostDateUnified');
		expect(ttCall[2].maxCostUsd).toBeCloseTo(20 / 11);
		// The accounts take the profile's name and followers
		const ig = await em.findOneOrFail(SocialAccount, { handle: 'chenche_berlin' });
		expect(ig).toMatchObject({ displayName: 'Chén Chè Teehaus', followers: 4200 });

		// One month only: no growth yet
		expect((await service.forReport(brand.id, city.id, '2026-08')).map(a => a.followersChange)).toEqual([
			undefined,
			undefined,
		]);

		instagramFollowers = 4440;
		await scrapeMonth('2026-09', new Date('2026-10-02T06:00:00Z'));
		// Scraping a month again replaces its snapshot
		await scrapeMonth('2026-09', new Date('2026-10-02T07:00:00Z'));
		expect(await em.count(SocialAccountSnapshot, {})).toBe(4);

		expect(await service.forReport(brand.id, city.id, '2026-09')).toEqual([
			{
				platform: 'instagram',
				handle: 'chenche_berlin',
				url: 'https://www.instagram.com/chenche_berlin/',
				followers: 4440,
				followersChange: 240,
				posts: 120,
				postsAdded: 0,
				avgViews: 6000,
				avgLikes: 200,
				postsLast30Days: 2,
			},
			{
				platform: 'tiktok',
				handle: 'chenche.berlin',
				url: 'https://www.tiktok.com/@chenche.berlin',
				followers: 1500,
				followersChange: 0,
				posts: 42,
				postsAdded: 0,
				avgViews: 12_000,
				avgLikes: 1_200,
				postsLast30Days: 2,
			},
		]);
	});

	it('lists and adds accounts through the brand page routes', async () => {
		const controller = harness.moduleRef.get(AdminBrandAccountsController);
		const list = await controller.addBrandAccount(brand.id, {
			platform: SocialPlatformEnum.TIKTOK,
			handle: 'https://www.tiktok.com/@chenche.teehaus',
		});
		const added = list.find(a => a.handle === 'chenche.teehaus' && a.platform === 'tiktok');
		expect(added).toMatchObject({
			brandSource: 'admin',
			url: 'https://www.tiktok.com/@chenche.teehaus',
			brand: { id: brand.id },
			stats: { monthPosts: 0, posts: 0 },
		});
		expect(added?.latest).toBeUndefined();
		expect(list.find(a => a.handle === 'chenche_berlin')).toMatchObject({
			latest: { month: '2026-09', followers: 4440 },
			followersChange: 240,
		});
		// The admin's add brings a removed account back
		const relinked = await controller.addBrandAccount(brand.id, {
			platform: SocialPlatformEnum.INSTAGRAM,
			handle: 'chenche.teehaus',
		});
		expect(relinked.find(a => a.handle === 'chenche.teehaus' && a.platform === 'instagram')).toMatchObject({
			brand: { id: brand.id },
			rejections: [],
		});
		await expect(
			controller.addBrandAccount(brand.id, { platform: SocialPlatformEnum.INSTAGRAM, handle: 'not a handle' }),
		).rejects.toThrow('Not a handle');
	});

	it('reads the profile items: pinned posts out, hidden likes unknown, errors skipped', () => {
		const now = new Date('2026-10-02T06:00:00Z');
		expect(instagramProfileFigures(instagramProfile(4200, 120), now)).toEqual({
			followers: 4200,
			posts: 120,
			avgViews: 6000,
			avgLikes: 200,
			postsLast30Days: 2,
		});
		expect(instagramProfileFigures({ error: 'not_found' }, now)).toBeNull();
		expect(tiktokProfileFigures([{ error: 'Profile not found' }], now)).toBeNull();
	});

	describe('a chain', () => {
		let chain: Brand;
		let wedding: Venue;
		let hamburg: Venue;

		beforeAll(async () => {
			const em = harness.orm.em;
			chain = em.create(Brand, { name: 'Kotti Burger', key: 'kotti burger' });
			em.create(Venue, { city, brand: chain, placeId: 'p-kotti', name: 'Kotti Burger', category: 'Hamburger restaurant' });
			wedding = em.create(Venue, {
				city,
				brand: chain,
				placeId: 'p-wedding',
				name: 'Wedding Snack Bar',
				street: 'Müllerstr. 1',
				category: 'Hamburger restaurant',
			});
			const other = testCity(em, { name: 'Hamburg' });
			hamburg = em.create(Venue, {
				city: other,
				brand: chain,
				placeId: 'p-hh',
				name: 'Kotti Burger Hamburg',
				category: 'Hamburger restaurant',
			});
			const brandWide = ownAccount(em, chain, city, 'kottiburger', SocialPlatformEnum.INSTAGRAM);
			const branch = ownAccount(em, chain, city, 'weddingsnack', SocialPlatformEnum.INSTAGRAM);
			branch.branch = wedding;
			await em.flush();
			for (const account of [brandWide, branch])
				em.create(SocialAccountSnapshot, { account, month: '2026-09', followers: 100, scrapedAt: new Date() });
			await em.flush();
		});

		it("reads a branch's account only in the branch's city, named by it", async () => {
			const em = harness.orm.em;
			const controller = harness.moduleRef.get(AdminBrandAccountsController);
			// An admin adds the Hamburg branch's own account
			let list = await controller.addBrandAccount(chain.id, {
				platform: SocialPlatformEnum.INSTAGRAM,
				handle: 'kottiburger.hh',
				branchId: hamburg.id,
			});
			const hh = list.find(a => a.handle === 'kottiburger.hh')!;
			expect(hh.branch).toMatchObject({ id: hamburg.id });
			em.create(SocialAccountSnapshot, {
				account: em.getReference(SocialAccount, hh.id),
				month: '2026-09',
				followers: 50,
				scrapedAt: new Date(),
			});
			await em.flush();

			const berlin = await service.forReport(chain.id, city.id, '2026-09');
			expect(berlin.map(a => [a.handle, a.branch])).toEqual([
				['kottiburger', undefined],
				['weddingsnack', 'Wedding Snack Bar, Müllerstr. 1'],
			]);
			expect((await service.forReport(chain.id, hamburg.city.id, '2026-09')).map(a => a.handle)).toEqual([
				'kottiburger',
				'kottiburger.hh',
			]);
			expect((await service.snapshots(chain.id, hamburg.city.id, ['2026-09'])).map(s => s.handle).sort()).toEqual([
				'kottiburger',
				'kottiburger.hh',
			]);

			// Made the whole brand's, it counts everywhere
			list = await controller.updateBrandAccount(chain.id, hh.id, { branchId: null });
			expect(list.find(a => a.id === hh.id)?.branch).toBeUndefined();
			expect((await service.forReport(chain.id, city.id, '2026-09')).map(a => a.handle)).toContain('kottiburger.hh');
		});

		it("refuses another brand's place as the branch, and another brand's account on its routes", async () => {
			await expect(service.add(chain.id, SocialPlatformEnum.TIKTOK, 'kottiburger', venue.id)).rejects.toThrow(
				'not a branch',
			);
			const theirs = await harness.orm.em.findOneOrFail(SocialAccount, { handle: 'chenche_berlin' });
			await expect(
				harness.moduleRef.get(AdminBrandAccountsController).removeBrandAccount(chain.id, theirs.id),
			).rejects.toThrow();
		});
	});
});
