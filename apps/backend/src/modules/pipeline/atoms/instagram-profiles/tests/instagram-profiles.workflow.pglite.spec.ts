import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';

import type { InstagramProfileItem } from 'src/modules/apify/actors/instagram-profile.actor.js';
import { ApifyService } from 'src/modules/apify/services/apify.service.js';
import { FakeApify } from 'src/modules/apify/tests/factories/fake-apify.js';
import type { City } from 'src/modules/cities/entities/city.entity.js';
import { CityService } from 'src/modules/cities/services/city.service.js';
import { cityFactory } from 'src/modules/cities/tests/factories/city.factory.js';
import { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';
import { fakeDurable } from 'src/modules/durable-workflows/tests/factories/durable.mock.js';
import { Creator } from 'src/modules/social/entities/creator.entity.js';
import { PostSource, PostSourceKindEnum } from 'src/modules/social/entities/post-source.entity.js';
import { SocialAccount } from 'src/modules/social/entities/social-account.entity.js';
import { SocialAccountSnapshot } from 'src/modules/social/entities/social-account-snapshot.entity.js';
import { SocialPlatformEnum, SocialPost } from 'src/modules/social/entities/social-post.entity.js';
import { AccountScrapeService } from 'src/modules/social/services/account-scrape.service.js';
import { HashtagService } from 'src/modules/social/services/hashtag.service.js';
import { SocialAccountService } from 'src/modules/social/services/social-account.service.js';
import { SocialPostService } from 'src/modules/social/services/social-post.service.js';
import { INSTAGRAM_PROFILE_ITEMS } from 'src/modules/social/tests/fixtures/profile-items.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { instagramProfilesInput } from '../util/instagram-profiles-input.js';
import { InstagramProfilesWorkflow } from '../workflows/instagram-profiles.workflow.js';

const IG = SocialPlatformEnum.INSTAGRAM;
const SINCE = '2026-10-17T00:00:00.000Z';
const NOW = new Date('2026-10-25T05:00:00Z');
const HANDLES = ['berlindeneyenir', 'churrolade_berlin'];

/**
 * The atom on real profile items: the input, the cap floored, the operation as the run's owner;
 * the save (accounts with their names and figures, a snapshot each, the posts since the day as
 * finds of their profile; the profile alone storing no post and stamping an asked account that
 * came back without a count; only known accounts under `known`; a collab post's owner) and the
 * result a caller reads.
 */
describe('InstagramProfilesWorkflow (pglite)', () => {
	let harness: PgliteTestingModule;
	let profiles: InstagramProfilesWorkflow;
	let city: City;
	const apify = new FakeApify<InstagramProfileItem>();
	const durable = fakeDurable(() => [profiles], 'op-1');
	const context = () => ({
		cityId: city.id,
		now: NOW.toISOString(),
		save: { accounts: 'all' as const },
	});

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				InstagramProfilesWorkflow,
				AccountScrapeService,
				SocialAccountService,
				SocialPostService,
				CityService,
				// What a tag names is covered in post-links.pglite.spec.ts
				{ provide: HashtagService, useValue: { relink: jest.fn() } },
				{ provide: ApifyService, useValue: apify },
				{ provide: DurableWorkflowsService, useValue: durable },
			],
		});
		profiles = harness.moduleRef.get(InstagramProfilesWorkflow);
		entityManagerManager.setEntityManager(harness.orm.em);
		city = await cityFactory.create();
	});

	afterAll(async () => {
		await harness.stop();
	});

	beforeEach(async () => {
		apify.reset();
		durable.started.length = 0;
		apify.answer = () => structuredClone(INSTAGRAM_PROFILE_ITEMS) as InstagramProfileItem[];
		const em = harness.orm.em;
		await em.nativeDelete(SocialPost, {});
		await em.nativeDelete(SocialAccountSnapshot, {});
		await em.nativeDelete(SocialAccount, {});
		await em.nativeDelete(Creator, {});
		em.clear();
	});

	it("the posts since a day: the handles as the input, the cap, the operation as owner; every post a find of its profile, the accounts with the profiles' names and followers, a snapshot each", async () => {
		const em = harness.orm.em;
		const result = await profiles.call({
			handles: [...HANDLES, 'berlindeneyenir'],
			read: { mode: 'posts', since: SINCE },
			maxCostUsd: 0.18,
			purpose: 'instagram profiles last week: 2',
			...context(),
		});

		expect(apify.calls).toHaveLength(1);
		const [{ actor, input, options }] = apify.calls;
		expect(actor).toBe('apify/instagram-profile-scraper');
		// Each handle once
		expect(input).toEqual({ usernames: HANDLES });
		expect(options).toEqual({
			maxCostUsd: 0.18,
			purpose: 'instagram profiles last week: 2',
			ownerWorkflowId: 'op-1',
		});
		expect(durable.started[0].options).toEqual({
			attributes: { cityId: city.id, purpose: 'instagram profiles last week: 2' },
		});
		// Two posts since the 17th (a recent pinned one counts, an old pinned one not); the refused
		// timeline brings none but its figures; one of the two is a business account
		expect(result).toEqual({
			recordId: 'run-1',
			found: 2,
			asked: 2,
			profiles: 2,
			snapshots: 2,
			businesses: 1,
			posts: 2,
			saved: 2,
		});

		em.clear();
		const posts = await em.find(
			SocialPost,
			{},
			{ populate: ['account'], orderBy: { postedAt: 'desc' } },
		);
		expect(posts.map(p => [p.externalId, p.account?.handle, p.city.id])).toEqual([
			['ig_4012962569291174220', 'berlindeneyenir', city.id],
			['ig_4012237201383600968', 'berlindeneyenir', city.id],
		]);
		expect(posts[0]).toMatchObject({
			platform: IG,
			url: 'https://www.instagram.com/p/Dew6DH3ihFM/',
		});
		// Every post is a find of its profile
		const finds = await em.find(PostSource, {}, { populate: ['post'] });
		expect(finds.map(f => [f.post.externalId, f.kind, f.value]).sort()).toEqual([
			['ig_4012237201383600968', PostSourceKindEnum.INSTAGRAM_ACCOUNT, 'berlindeneyenir'],
			['ig_4012962569291174220', PostSourceKindEnum.INSTAGRAM_ACCOUNT, 'berlindeneyenir'],
		]);
		// The accounts exist now, with the profiles' names and followers, the refused one too
		const accounts = await em.find(SocialAccount, {}, { orderBy: { handle: 'asc' } });
		expect(
			accounts.map(a => [
				a.handle,
				a.displayName,
				a.followers,
				a.isBusiness,
				a.followersAskedAt,
			]),
		).toEqual([
			['berlindeneyenir', 'Işınsu Agca | Berlin’de ne yenir?', 18915, false, null],
			['churrolade_berlin', 'Churrolade.official', 2708, true, null],
		]);
		// One snapshot a profile, though its posts carried the count again; the item always has its
		// latest posts, so the averages are over them (none to average on the refused timeline)
		const snapshots = await em.find(
			SocialAccountSnapshot,
			{},
			{ populate: ['account'], orderBy: { account: { handle: 'asc' } } },
		);
		expect(
			snapshots.map(s => [
				s.account.handle,
				s.source,
				s.year,
				s.month,
				s.day,
				s.followers,
				s.following,
				s.avgViews != null,
				s.postsLast30Days,
			]),
		).toEqual([
			['berlindeneyenir', 'profile', 2026, 10, 25, 18915, 1646, true, 3],
			['churrolade_berlin', 'profile', 2026, 10, 25, 2708, 2, false, 0],
		]);
		expect(snapshots.every(s => s.scrapedAt.getTime() === NOW.getTime())).toBe(true);
	});

	it('a post seen again stays one row; earlier posts of a longer window join it', async () => {
		const em = harness.orm.em;
		await profiles.call({
			handles: HANDLES,
			read: { mode: 'posts', since: SINCE },
			maxCostUsd: 1,
			purpose: 'week',
			...context(),
		});
		const result = await profiles.call({
			handles: HANDLES,
			read: { mode: 'posts', since: '2026-10-01T00:00:00.000Z' },
			maxCostUsd: 1,
			purpose: 'month',
			...context(),
		});
		// October's three posts, two of them seen already and written again (`saved` counts every post written)
		expect(result).toMatchObject({ posts: 3, saved: 3 });
		em.clear();
		expect(await em.count(SocialPost, {})).toBe(3);
		// Every run adds a snapshot a profile
		expect(await em.count(SocialAccountSnapshot, {})).toBe(4);
	});

	it('the profile alone: the cap floored at the actor’s lowest, no post stored, an asked account that came back without a count stamped', async () => {
		const em = harness.orm.em;
		// A brand account we know that the actor doesn't return (gone, renamed, private)
		em.create(SocialAccount, { platform: IG, handle: 'gone_handle', city });
		await em.flush();
		const result = await profiles.call({
			handles: [...HANDLES, 'gone_handle'],
			read: { mode: 'profile' },
			maxCostUsd: 0.009,
			purpose: 'instagram profiles followers: 3',
			...context(),
		});
		expect(apify.calls[0].options.maxCostUsd).toBe(0.05);
		expect(result).toMatchObject({ asked: 3, profiles: 2, snapshots: 2, posts: 0, saved: 0 });

		em.clear();
		expect(await em.count(SocialPost, {})).toBe(0);
		const accounts = await em.find(SocialAccount, {}, { orderBy: { handle: 'asc' } });
		expect(accounts.map(a => [a.handle, a.followers, a.followersAskedAt])).toEqual([
			['berlindeneyenir', 18915, null],
			['churrolade_berlin', 2708, null],
			['gone_handle', null, NOW],
		]);
	});

	it("`known`: only accounts we have take the profile's figures, a stranger with the handle gets no account", async () => {
		const em = harness.orm.em;
		const known = em.create(SocialAccount, { platform: IG, handle: 'churrolade_berlin', city });
		await em.flush();
		const result = await profiles.call({
			handles: HANDLES,
			read: { mode: 'profile' },
			maxCostUsd: 0.006,
			purpose: 'instagram profiles twins Berlin: 2',
			cityId: city.id,
			now: NOW.toISOString(),
			save: { accounts: 'known' },
		});
		expect(result).toMatchObject({
			found: 2,
			asked: 2,
			profiles: 1,
			snapshots: 1,
			businesses: 1,
		});

		em.clear();
		expect((await em.find(SocialAccount, {})).map(a => a.handle)).toEqual([
			'churrolade_berlin',
		]);
		expect(await em.findOneOrFail(SocialAccount, { id: known.id })).toMatchObject({
			displayName: 'Churrolade.official',
			followers: 2708,
			isBusiness: true,
			platformUserId: '38028814442',
		});
	});

	it("never gives a collab post's owner the profile's name and followers", async () => {
		const em = harness.orm.em;
		// A post on the venue's grid owned by a creator (a collab), as on @sonmezbaklavaofficial
		const [creator] = structuredClone(INSTAGRAM_PROFILE_ITEMS);
		const collab = {
			...creator.latestPosts[0],
			id: '4012237201383699999',
			shortCode: 'DeuVHoXcollab',
			url: 'https://www.instagram.com/p/DeuVHoXcollab/',
			ownerUsername: '_collab_kitchen_',
			ownerFullName: 'Collab Kitchen',
			ownerId: '999',
		};
		apify.answer = () => [{ ...creator, latestPosts: [collab] }] as InstagramProfileItem[];
		await profiles.call({
			handles: ['berlindeneyenir'],
			read: { mode: 'posts', since: SINCE },
			maxCostUsd: 1,
			purpose: 'instagram profiles last week: 1',
			cityId: city.id,
			now: '2026-10-26T05:00:00.000Z',
			save: { accounts: 'all' },
		});

		em.clear();
		const owner = await em.findOneOrFail(SocialAccount, { handle: '_collab_kitchen_' });
		expect([owner.displayName, owner.followers ?? null]).toEqual(['Collab Kitchen', null]);
		expect(await em.count(SocialAccountSnapshot, { account: owner })).toBe(0);
		const post = await em.findOneOrFail(SocialPost, { externalId: 'ig_4012237201383699999' });
		expect(post.authorFans ?? null).toBeNull();
	});

	it('the pure input: the handles once, whatever the read', () => {
		const call = { handles: ['a', 'b', 'a'], maxCostUsd: 1, purpose: 'x' };
		expect(instagramProfilesInput({ ...call, read: { mode: 'profile' } })).toEqual({
			usernames: ['a', 'b'],
		});
		expect(instagramProfilesInput({ ...call, read: { mode: 'posts', since: SINCE } })).toEqual({
			usernames: ['a', 'b'],
		});
	});
});
