import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';

import type { City } from 'src/modules/cities/entities/city.entity.js';
import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { Brand } from 'src/modules/venues/entities/brand.entity.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { AdminAccountsController } from '../controllers/admin.accounts.controller.js';
import { AdminCreatorsController } from '../controllers/admin.creators.controller.js';
import { Creator } from '../entities/creator.entity.js';
import { Mention, MentionMatchMethodEnum } from '../entities/mention.entity.js';
import { AccountBrandSourceEnum, SocialAccount } from '../entities/social-account.entity.js';
import { SocialPlatformEnum, SocialPost } from '../entities/social-post.entity.js';
import { AccountMatchingService } from '../services/account-matching.service.js';
import { CreatorService } from '../services/creator.service.js';
import { MentionMatchingService } from '../services/mention-matching.service.js';
import { SocialAccountService } from '../services/social-account.service.js';
import { SocialPostService } from '../services/social-post.service.js';

describe('accounts, creators and own-account matching (pglite)', () => {
	let harness: PgliteTestingModule;
	let posts: SocialPostService;
	let matching: AccountMatchingService;
	let city: City;
	let sori: Venue;
	let pizzaA: Venue;
	let pizzaB: Venue;
	let paula: Venue;
	let chainA: Venue;
	let chainB: Venue;

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				SocialPostService,
				SocialAccountService,
				AccountMatchingService,
				CreatorService,
				MentionMatchingService,
				AdminAccountsController,
				AdminCreatorsController,
			],
		});
		posts = harness.moduleRef.get(SocialPostService);
		matching = harness.moduleRef.get(AccountMatchingService);
		entityManagerManager.setEntityManager(harness.orm.em);
		const em = harness.orm.em;
		city = testCity(em);
		const place = (placeId: string, name: string, extra: Partial<Venue> = {}) =>
			em.create(Venue, { city, placeId, name, category: 'Restaurant', ...extra });
		sori = place('p-sori', 'SORI Ramen Berlin', { category: 'Ramen restaurant' });
		pizzaA = place('p-pizza-a', 'Pizza Napoli', { category: 'Pizza restaurant' });
		pizzaB = place('p-pizza-b', 'Pizza Napoli', { category: 'Pizza restaurant' });
		// Its Google website is its Instagram profile
		paula = place('p-paula', 'Café Paula', { category: 'Cafe', website: 'https://www.instagram.com/cafepaula/?hl=de' });
		// A chain whose branches give different profiles: each branch's own
		const chain = em.create(Brand, { name: 'Bandol', key: 'bandol' });
		chainA = place('p-bandol-mitte', 'Bandol Mitte', { brand: chain, website: 'https://instagram.com/bandol.mitte' });
		chainB = place('p-bandol-xberg', 'Bandol Kreuzberg', { brand: chain, website: 'https://instagram.com/bandol.xberg' });
		await em.flush();
	});

	afterAll(async () => {
		await harness.stop();
	});

	let n = 0;
	/** Saves a post through `SocialPostService`, as a scrape does, naming `venue` when given. */
	const save = async (
		author: string,
		platform = SocialPlatformEnum.TIKTOK,
		venue?: Venue,
		extra: { authorName?: string; authorFans?: number; views?: number } = {},
	) => {
		const em = harness.orm.em;
		const externalId = `acc-${++n}`;
		await posts.upsert(
			{
				externalId,
				platform,
				url: `https://example.com/${n}`,
				postedAt: new Date('2026-09-12T12:00:00Z'),
				author,
				views: extra.views ?? 100,
				authorName: extra.authorName,
				authorFans: extra.authorFans,
			},
			city,
		);
		await em.flush();
		const post = await em.findOneOrFail(SocialPost, { externalId });
		if (venue) {
			em.create(Mention, {
				post,
				venueName: venue.name,
				venue,
				brand: venue.brand,
				matchMethod: MentionMatchMethodEnum.EXACT,
				visited: true,
				sentiment: 'positive',
				summary: 'Nice.',
				dishes: [],
				praise: [],
				complaints: [],
			});
			await em.flush();
		}
		return post;
	};

	const account = (handle: string, platform = SocialPlatformEnum.TIKTOK) =>
		harness.orm.em.findOneOrFail(SocialAccount, { platform, handle }, { populate: ['creator', 'brand', 'branch', 'suggestedBrand'], refresh: true });

	it('gives every author an account and a creator; one person’s two platforms are one creator', async () => {
		const em = harness.orm.em;
		await save('Polina_Iz_Berlina', SocialPlatformEnum.TIKTOK, undefined, { authorName: 'Polina', authorFans: 1200 });
		await save('polina_iz_berlina', SocialPlatformEnum.TIKTOK);
		await save('polina.iz.berlina', SocialPlatformEnum.INSTAGRAM);
		const tiktok = await account('polina_iz_berlina');
		const instagram = await account('polina.iz.berlina', SocialPlatformEnum.INSTAGRAM);
		expect(tiktok).toMatchObject({ displayName: 'Polina', followers: 1200, city: { id: city.id } });
		expect(instagram.creator.id).toBe(tiktok.creator.id);
		expect(await em.count(SocialPost, { account: tiktok })).toBe(2);
		expect(await em.count(Creator, { name: 'Polina' })).toBe(1);
	});

	it('links the obvious ones, offers the likely ones, and leaves word of mouth alone', async () => {
		await save('soriramen.berlin', SocialPlatformEnum.INSTAGRAM, sori);
		await save('foodie.bln', SocialPlatformEnum.TIKTOK, sori);
		// Two places of one name, no posts saying which
		await save('pizza.napoli.berlin', SocialPlatformEnum.TIKTOK);

		const result = await matching.match(city);
		expect(result).toMatchObject({ linked: 1, suggested: 1, websites: 3 });
		expect(await account('soriramen.berlin', SocialPlatformEnum.INSTAGRAM)).toMatchObject({
			brand: { id: sori.brand.id },
			brandSource: AccountBrandSourceEnum.HANDLE,
		});
		expect((await account('foodie.bln')).brand).toBeNull();
		const pizza = await account('pizza.napoli.berlin');
		expect(pizza.brand).toBeNull();
		expect([pizzaA.brand.id, pizzaB.brand.id]).toContain(pizza.suggestedBrand?.id);

		// A website profile is linked even before anything it posted was scraped
		expect(await account('cafepaula', SocialPlatformEnum.INSTAGRAM)).toMatchObject({
			brand: { id: paula.brand.id },
			brandSource: AccountBrandSourceEnum.WEBSITE,
		});
		// A chain's branches with profiles of their own
		expect((await account('bandol.mitte', SocialPlatformEnum.INSTAGRAM)).branch?.id).toBe(chainA.id);
		expect((await account('bandol.xberg', SocialPlatformEnum.INSTAGRAM)).branch?.id).toBe(chainB.id);

		// Running again changes nothing
		expect(await matching.match(city)).toMatchObject({ linked: 0, unlinked: 0, websites: 0 });
	});

	it('the posts settle two places of one name', async () => {
		await save('pizza.napoli.berlin', SocialPlatformEnum.TIKTOK, pizzaB);
		await matching.match(city);
		expect(await account('pizza.napoli.berlin')).toMatchObject({ brand: { id: pizzaB.brand.id }, suggestedBrand: null });
	});

	it('own posts no longer rank a brand', async () => {
		const em = harness.orm.em;
		// SORI: one post by its own account, one by a creator; Café Paula: two by creators
		await save('eats.berlin', SocialPlatformEnum.TIKTOK, paula);
		await save('tom.isst', SocialPlatformEnum.TIKTOK, paula);
		await em.flush();
		const top = await harness.moduleRef.get(MentionMatchingService).topBrandIds('2026-09', 2, city.id);
		expect(top[0]).toBe(paula.brand.id);
	});

	it("an admin's word is final: a rejection is never matched again, a link never undone", async () => {
		const controller = harness.moduleRef.get(AdminAccountsController);
		const soriAccount = await account('soriramen.berlin', SocialPlatformEnum.INSTAGRAM);
		const rejected = await controller.decideAccount(soriAccount.id, { action: 'reject' });
		expect(rejected).toMatchObject({ rejectedBrandIds: [sori.brand.id], brandSource: 'admin' });
		expect(rejected.brand).toBeUndefined();
		await matching.match(city);
		expect((await account('soriramen.berlin', SocialPlatformEnum.INSTAGRAM)).brand).toBeNull();

		// Linked by hand to a brand its name says nothing about: the matcher leaves it
		const foodie = await account('foodie.bln');
		const linked = await controller.decideAccount(foodie.id, { action: 'link', brandId: paula.brand.id });
		expect(linked).toMatchObject({ brand: { id: paula.brand.id, name: 'Café Paula' }, brandSource: 'admin' });
		await matching.match(city);
		expect((await account('foodie.bln')).brand?.id).toBe(paula.brand.id);

		// Linking again lifts the rejection
		await controller.decideAccount(soriAccount.id, { action: 'link', brandId: sori.brand.id });
		expect((await account('soriramen.berlin', SocialPlatformEnum.INSTAGRAM)).rejectedBrandIds).toEqual([]);
	});

	it('confirms a suggestion, and refuses a branch of another brand', async () => {
		const controller = harness.moduleRef.get(AdminAccountsController);
		await save('sori.ramen.official', SocialPlatformEnum.TIKTOK);
		const em = harness.orm.em;
		const acc = await account('sori.ramen.official');
		acc.suggestedBrand = em.getReference(Brand, sori.brand.id);
		acc.suggestedScore = 0.8;
		await em.flush();
		expect(await controller.decideAccount(acc.id, { action: 'confirm' })).toMatchObject({
			brand: { id: sori.brand.id },
			brandSource: 'admin',
		});
		expect((await account('sori.ramen.official')).suggestedBrand).toBeNull();
		await expect(controller.decideAccount(acc.id, { action: 'branch', branchId: chainA.id })).rejects.toThrow(
			'not a branch',
		);
	});

	it('lists venues’ own accounts and the open suggestions, counted per status', async () => {
		const controller = harness.moduleRef.get(AdminAccountsController);
		const linked = await controller.listAccounts({ page: 1, size: 50, cityId: city.id, status: 'linked', month: '2026-09' });
		expect(linked.counts.linked).toBe(linked.totalItems);
		expect(linked.items.map(a => a.handle)).toEqual(expect.arrayContaining(['soriramen.berlin', 'cafepaula', 'bandol.mitte']));
		const sori = linked.items.find(a => a.handle === 'soriramen.berlin')!;
		expect(sori.stats).toMatchObject({ monthPosts: 1, monthViews: 100, posts: 1 });
		expect(sori.creator.name).toBe('soriramen.berlin');
		const searched = await controller.listAccounts({ page: 1, size: 50, q: 'bandol', status: 'linked' });
		expect(searched.items.map(a => a.handle).sort()).toEqual(['bandol.mitte', 'bandol.xberg']);
	});

	describe('creators', () => {
		it('lists who posted in the month over all their accounts, venues’ own left out', async () => {
			const controller = harness.moduleRef.get(AdminCreatorsController);
			const res = await controller.listCreators({ page: 1, size: 50, cityId: city.id, month: '2026-09' });
			const polina = res.items.find(c => c.name === 'Polina')!;
			expect(polina.accounts.map(a => a.platform).sort()).toEqual(['instagram', 'tiktok']);
			expect(polina.month).toMatchObject({ posts: 3, views: 300 });
			expect(res.items.some(c => c.name === 'soriramen.berlin')).toBe(false);
			const all = await controller.listCreators({ page: 1, size: 50, cityId: city.id, month: '2026-09', includeOwn: true });
			expect(all.items.find(c => c.name === 'soriramen.berlin')).toMatchObject({ own: true });
			expect((await controller.listCreators({ page: 1, size: 50, month: '2026-08' })).items).toEqual([]);
		});

		it('shows a creator’s accounts, months and the brands they named', async () => {
			const controller = harness.moduleRef.get(AdminCreatorsController);
			const eats = await account('eats.berlin');
			const detail = await controller.getCreator(eats.creator.id, { month: '2026-09' });
			expect(detail.accounts.map(a => a.handle)).toEqual(['eats.berlin']);
			expect(detail.months.at(-1)).toEqual({ month: '2026-09', posts: 1, views: 100 });
			expect(detail.months).toHaveLength(6);
			expect(detail.brands).toEqual([expect.objectContaining({ id: paula.brand.id, posts: 1, own: false })]);
		});

		it('merges accounts into one creator and splits one out again', async () => {
			const controller = harness.moduleRef.get(AdminCreatorsController);
			const accounts = harness.moduleRef.get(AdminAccountsController);
			const eats = await account('eats.berlin');
			const tom = await account('tom.isst');
			const tomsCreator = tom.creator.id;
			const merged = await controller.mergeCreatorAccounts(eats.creator.id, { accountIds: [tom.id] });
			expect(merged.accounts.map(a => a.handle).sort()).toEqual(['eats.berlin', 'tom.isst']);
			// Tom's own creator went with it
			expect(await harness.orm.em.count(Creator, { id: tomsCreator })).toBe(0);
			const { creatorId } = await accounts.splitAccount(tom.id);
			expect((await account('tom.isst')).creator.id).toBe(creatorId);
			await expect(accounts.splitAccount(tom.id)).rejects.toThrow('only one');
			const renamed = await controller.updateCreator(eats.creator.id, { name: 'Eats Berlin' });
			expect(renamed.name).toBe('Eats Berlin');
		});
	});
});
