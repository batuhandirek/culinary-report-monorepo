import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';

import type { City } from 'src/modules/cities/entities/city.entity.js';
import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { Brand } from 'src/modules/venues/entities/brand.entity.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { AdminCreatorsController } from '../controllers/admin.creators.controller.js';
import { AccountRejectedBrand } from '../entities/account-rejected-brand.entity.js';
import { Creator } from '../entities/creator.entity.js';
import { AccountBrandSourceEnum, SocialAccount } from '../entities/social-account.entity.js';
import { SocialAccountHandleChange } from '../entities/social-account-handle-change.entity.js';
import { SocialAccountSnapshot } from '../entities/social-account-snapshot.entity.js';
import { SocialPlatformEnum, SocialPost } from '../entities/social-post.entity.js';
import { CreatorService } from '../services/creator.service.js';
import { HashtagService } from '../services/hashtag.service.js';
import { SocialAccountService } from '../services/social-account.service.js';
import { SocialPostService } from '../services/social-post.service.js';

const IG = SocialPlatformEnum.INSTAGRAM;

describe('accounts by the platform user id, and their handle changes (pglite)', () => {
	let harness: PgliteTestingModule;
	let posts: SocialPostService;
	let accounts: SocialAccountService;
	let city: City;

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				SocialAccountService,
				SocialPostService,
				CreatorService,
				AdminCreatorsController,
				{ provide: HashtagService, useValue: { relink: jest.fn() } },
			],
		});
		posts = harness.moduleRef.get(SocialPostService);
		accounts = harness.moduleRef.get(SocialAccountService);
		entityManagerManager.setEntityManager(harness.orm.em);
		city = testCity(harness.orm.em);
		await harness.orm.em.flush();
	});

	afterAll(async () => {
		await harness.stop();
	});

	let n = 0;
	/** A post by `author` (with its user id when given), saved and flushed as a scrape does. */
	const save = async (
		author: string,
		authorId?: string,
		extra: { authorFans?: number; at?: Date } = {},
	) => {
		const em = harness.orm.em;
		await posts.upsert(
			{
				externalId: `ig_hc_${++n}`,
				platform: IG,
				url: `https://www.instagram.com/p/hc${n}/`,
				postedAt: new Date('2026-10-12T12:00:00Z'),
				author,
				authorId,
				authorFans: extra.authorFans,
			},
			city,
			extra.at,
		);
		await em.flush();
		em.clear();
	};
	const account = (where: object) =>
		harness.orm.em.findOne(SocialAccount, { platform: IG, ...where });
	const changesOf = async (a: SocialAccount) =>
		(
			await harness.orm.em.find(
				SocialAccountHandleChange,
				{ account: a.id },
				{ populate: ['takenBy'], orderBy: { seenAt: 'asc', createdAt: 'asc' } },
			)
		).map(c => [c.fromHandle ?? null, c.toHandle ?? null, c.takenBy?.handle ?? null]);

	it('stores the id an item carries, on a new account and on one known by its handle', async () => {
		await save('known_by_handle');
		expect((await account({ handle: 'known_by_handle' }))?.platformUserId ?? null).toBeNull();
		await save('known_by_handle', '101');
		await save('new_with_id', '102');
		expect((await account({ handle: 'known_by_handle' }))?.platformUserId).toBe('101');
		expect((await account({ handle: 'new_with_id' }))?.platformUserId).toBe('102');
	});

	it('renames an account seen under a new handle, its posts, brand and creator kept', async () => {
		const em = harness.orm.em;
		await save('old_name', '201', { authorFans: 500 });
		const before = (await account({ platformUserId: '201' }))!;
		const brand = em.create(Brand, { name: 'Old Name', key: 'old name' });
		before.brand = brand;
		before.brandSource = AccountBrandSourceEnum.ADMIN;
		await em.flush();
		em.clear();

		await save('new_name', '201');
		const after = (await account({ platformUserId: '201' }))!;
		expect(after.id).toBe(before.id);
		expect([after.handle, after.brand?.id, after.creator.id]).toEqual([
			'new_name',
			brand.id,
			before.creator.id,
		]);
		expect(await account({ handle: 'old_name' })).toBeNull();
		expect(await em.count(SocialPost, { account: after.id })).toBe(2);
		expect(await changesOf(after)).toEqual([['old_name', 'new_name', null]]);
		// Seen again under the same handle: nothing more
		await save('new_name', '201');
		expect(await changesOf(after)).toHaveLength(1);
	});

	it('merges an account known by the new handle alone into the renamed one', async () => {
		const em = harness.orm.em;
		await save('first_handle', '301', { authorFans: 900 });
		// A caption named the new handle before we saw the id under it
		await save('second_handle', undefined, { authorFans: 950 });
		const byHandle = (await account({ handle: 'second_handle' }))!;
		const brand = em.create(Brand, { name: 'Second', key: 'second' });
		byHandle.brand = brand;
		byHandle.brandSource = AccountBrandSourceEnum.SITE;
		em.create(AccountRejectedBrand, {
			account: byHandle,
			brand: em.create(Brand, { name: 'Nope', key: 'nope' }),
		});
		await em.flush();
		const goneCreator = byHandle.creator.id;
		em.clear();

		await save('second_handle', '301');
		const merged = (await account({ platformUserId: '301' }))!;
		expect(merged.handle).toBe('second_handle');
		expect(
			await em.count(SocialAccount, {
				platform: IG,
				handle: { $in: ['first_handle', 'second_handle'] },
			}),
		).toBe(1);
		// Its posts, snapshots, rejections and the brand link are the merged account's now
		expect(await em.count(SocialPost, { account: merged.id })).toBe(3);
		expect(await em.count(SocialAccountSnapshot, { account: merged.id })).toBe(2);
		expect(await em.count(AccountRejectedBrand, { account: merged.id })).toBe(1);
		expect([merged.brand?.id, merged.brandSource]).toEqual([
			brand.id,
			AccountBrandSourceEnum.SITE,
		]);
		expect(await em.count(Creator, { id: goneCreator })).toBe(0);
		expect(await changesOf(merged)).toEqual([['first_handle', 'second_handle', null]]);
	});

	it('gives a taken handle to its new owner, and renames the old one once its id is seen again', async () => {
		const em = harness.orm.em;
		await save('swapped', '401');
		const old = (await account({ platformUserId: '401' }))!;

		// Someone else's id under the handle: they get an account, the old one waits unnamed
		await save('swapped', '402');
		const lost = (await em.findOneOrFail(SocialAccount, { id: old.id }))!;
		const owner = (await account({ handle: 'swapped' }))!;
		expect(owner.platformUserId).toBe('402');
		expect(owner.id).not.toBe(old.id);
		expect(lost.handle).toBe('swapped~401');
		expect(lost.handleLostAt).toBeInstanceOf(Date);
		expect(await em.count(SocialPost, { account: old.id })).toBe(1);
		expect(await changesOf(lost)).toEqual([['swapped', null, 'swapped']]);

		// The old owner turns up under its new handle
		await save('swapped_again', '401');
		const found = (await em.findOneOrFail(SocialAccount, { id: old.id }))!;
		expect([found.handle, found.handleLostAt ?? null]).toEqual(['swapped_again', null]);
		expect(await changesOf(found)).toEqual([
			['swapped', null, 'swapped'],
			[null, 'swapped_again', null],
		]);
	});

	it('moves a handle to its new owner when the old one renamed to it first in the same scrape', async () => {
		const em = harness.orm.em;
		await save('alpha', '501');
		await save('beta', '502');
		em.clear();
		// One scrape: 502 took "alpha", 501 moved on to "gamma"; nothing flushed in between
		await accounts.ensure(IG, 'alpha', city, { platformUserId: '502' });
		await accounts.ensure(IG, 'gamma', city, { platformUserId: '501' });
		await em.flush();
		em.clear();
		expect((await account({ platformUserId: '502' }))?.handle).toBe('alpha');
		expect((await account({ platformUserId: '501' }))?.handle).toBe('gamma');
		expect(await changesOf((await account({ platformUserId: '502' }))!)).toEqual([
			['beta', 'alpha', null],
		]);
		expect(await changesOf((await account({ platformUserId: '501' }))!)).toEqual([
			['alpha', null, 'alpha'],
			[null, 'gamma', null],
		]);
	});

	it('finds an id given earlier in the same scrape, before the flush', async () => {
		const em = harness.orm.em;
		await save('seen_first');
		await save('seen_second');
		em.clear();
		// One scrape: the id comes with one handle, then with the other (the person renamed)
		await accounts.ensure(IG, 'seen_first', city, { platformUserId: '701' });
		await accounts.ensure(IG, 'seen_second', city, { platformUserId: '701' });
		await em.flush();
		em.clear();
		const one = await em.find(SocialAccount, {
			platform: IG,
			handle: { $in: ['seen_first', 'seen_second'] },
		});
		expect(one.map(a => [a.handle, a.platformUserId])).toEqual([['seen_second', '701']]);
		expect(await em.count(SocialPost, { account: one[0].id })).toBe(2);
		expect(await changesOf(one[0])).toEqual([['seen_first', 'seen_second', null]]);
	});

	it("shows a creator's accounts and handle history on the creator page", async () => {
		const em = harness.orm.em;
		const controller = harness.moduleRef.get(AdminCreatorsController);
		await save('page_old', '801');
		await save('page_new', '801');
		await save('page_new', '802');
		em.clear();
		const old = (await account({ platformUserId: '801' }))!;
		const taker = (await account({ platformUserId: '802' }))!;

		// The renamed person: their account under the handle it last had, flagged as taken
		const page = await controller.getCreator(old.creator.id, { month: '2026-10' });
		expect(page.accounts.map(a => [a.handle, a.platformUserId, !!a.handleLostAt])).toEqual([
			['page_new', '801', true],
		]);
		expect(
			page.handleChanges.map(c => [
				c.account.handle,
				c.fromHandle ?? null,
				c.toHandle ?? null,
				c.takenBy?.handle ?? null,
			]),
		).toEqual([
			['page_new', 'page_new', null, 'page_new'],
			['page_new', 'page_old', 'page_new', null],
		]);
		// The one who took the handle sees where it came from
		const takerPage = await controller.getCreator(taker.creator.id, { month: '2026-10' });
		expect(takerPage.handleChanges.map(c => [c.account.creator.id, c.takenBy?.id])).toEqual([
			[old.creator.id, taker.id],
		]);
	});

	it('keeps an account whose handle was taken out of scrapes by handle', async () => {
		const em = harness.orm.em;
		await save('left_behind', '601');
		await save('left_behind', '602');
		// The placeholder is no handle any scrape item names
		expect(await accounts.ensure(IG, 'left_behind~601', city)).toBeNull();
		em.clear();
	});
});
