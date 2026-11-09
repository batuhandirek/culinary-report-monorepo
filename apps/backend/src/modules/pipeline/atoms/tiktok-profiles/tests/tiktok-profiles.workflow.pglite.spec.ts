import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';

import type { TiktokProfileItem } from 'src/modules/apify/actors/tiktok-profile.actor.js';
import { ApifyService } from 'src/modules/apify/services/apify.service.js';
import { FakeApify } from 'src/modules/apify/tests/factories/fake-apify.js';
import type { City } from 'src/modules/cities/entities/city.entity.js';
import { CitySource, CitySourceKindEnum } from 'src/modules/cities/entities/city-source.entity.js';
import { CityService } from 'src/modules/cities/services/city.service.js';
import { cityFactory, testCitySource } from 'src/modules/cities/tests/factories/city.factory.js';
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
import { TIKTOK_PROFILE_ITEMS } from 'src/modules/social/tests/fixtures/profile-items.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { tiktokProfilesInput } from '../util/tiktok-profiles-input.js';
import { TiktokProfilesWorkflow } from '../workflows/tiktok-profiles.workflow.js';

const TT = SocialPlatformEnum.TIKTOK;
const SINCE = '2026-10-17T00:00:00.000Z';
const NOW = new Date('2026-10-25T05:00:00Z');
const HANDLES = ['berlingoodfood', 'gone_handle'];

/**
 * The atom on real profile items (one a video, the profile repeated): each read's input, the cap
 * floored, the operation as the run's owner; the save (the account with the profile's name and
 * followers, a snapshot with averages only over the latest ten, the videos since the day as finds
 * of their profile linked to the city's creator source; the profile alone storing no video and
 * stamping an asked account that came back without a count; only known accounts under `known`)
 * and the result a caller reads.
 */
describe('TiktokProfilesWorkflow (pglite)', () => {
	let harness: PgliteTestingModule;
	let profiles: TiktokProfilesWorkflow;
	let city: City;
	let source: CitySource;
	const apify = new FakeApify<TiktokProfileItem>();
	const durable = fakeDurable(() => [profiles], 'op-1');
	const context = () => ({
		cityId: city.id,
		now: NOW.toISOString(),
		save: { accounts: 'all' as const },
	});

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				TiktokProfilesWorkflow,
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
		profiles = harness.moduleRef.get(TiktokProfilesWorkflow);
		entityManagerManager.setEntityManager(harness.orm.em);
		city = await cityFactory.create();
		// The city watches the creator
		source = testCitySource(
			harness.orm.em,
			city,
			CitySourceKindEnum.TIKTOK_ACCOUNT,
			'berlingoodfood',
		);
		await harness.orm.em.flush();
	});

	afterAll(async () => {
		await harness.stop();
	});

	beforeEach(async () => {
		apify.reset();
		durable.started.length = 0;
		// The creator's two videos (the 24th and the 11th), and a profile that doesn't exist
		apify.answer = () =>
			[
				...structuredClone(TIKTOK_PROFILE_ITEMS),
				{ error: 'Profile not found', input: 'gone_handle' },
			] as TiktokProfileItem[];
		const em = harness.orm.em;
		await em.nativeDelete(SocialPost, {});
		await em.nativeDelete(SocialAccountSnapshot, {});
		await em.nativeDelete(SocialAccount, {});
		await em.nativeDelete(Creator, {});
		em.clear();
	});

	it("the videos since a day: paid for from that day on, with subtitles; the cap, the owner; the week's video a find of its profile linked to the city's source, a snapshot without averages", async () => {
		const em = harness.orm.em;
		const result = await profiles.call({
			handles: [...HANDLES, 'berlingoodfood'],
			read: { mode: 'since', since: SINCE },
			maxCostUsd: 1.8,
			purpose: 'tiktok profiles last week: 2',
			...context(),
		});

		expect(apify.calls).toHaveLength(1);
		const [{ actor, input, options }] = apify.calls;
		expect(actor).toBe('clockworks/tiktok-profile-scraper');
		expect(input).toEqual({
			profiles: HANDLES,
			resultsPerPage: 10,
			profileSorting: 'latest',
			excludePinnedPosts: true,
			oldestPostDateUnified: '2026-10-17',
			downloadSubtitlesOptions: 'DOWNLOAD_SUBTITLES',
			shouldDownloadVideos: false,
			shouldDownloadCovers: false,
			shouldDownloadSlideshowImages: false,
			shouldDownloadAvatars: false,
		});
		expect(options).toEqual({
			maxCostUsd: 1.8,
			purpose: 'tiktok profiles last week: 2',
			ownerWorkflowId: 'op-1',
		});
		expect(durable.started[0].options).toEqual({
			attributes: { cityId: city.id, purpose: 'tiktok profiles last week: 2' },
		});
		// Three items: two videos of one profile (one before the day) and the gone handle's error
		expect(result).toEqual({
			recordId: 'run-1',
			found: 3,
			asked: 2,
			profiles: 1,
			snapshots: 1,
			posts: 1,
			saved: 1,
		});

		em.clear();
		const posts = await em.find(SocialPost, {}, { populate: ['account'] });
		expect(posts.map(p => [p.externalId, p.account?.handle, p.city.id])).toEqual([
			['7700240032950471969', 'berlingoodfood', city.id],
		]);
		const finds = await em.find(PostSource, {}, { populate: ['post'] });
		expect(finds.map(f => [f.post.externalId, f.kind, f.value, f.source?.id ?? null])).toEqual([
			['7700240032950471969', PostSourceKindEnum.TIKTOK_ACCOUNT, 'berlingoodfood', source.id],
		]);
		const accounts = await em.find(SocialAccount, {});
		expect(
			accounts.map(a => [a.handle, a.displayName, a.followers, a.followersAskedAt]),
		).toEqual([['berlingoodfood', 'berlingoodfood', 569, null]]);
		// A week of videos gives no averages
		const [snapshot] = await em.find(SocialAccountSnapshot, {});
		expect([snapshot.source, snapshot.followers, snapshot.posts, snapshot.avgViews]).toEqual([
			'profile',
			569,
			189,
			null,
		]);
		expect(snapshot.scrapedAt.getTime()).toBe(NOW.getTime());
	});

	it('the latest ten: no date filter, the averages over them; a video seen again stays one row, an earlier one of the month joins', async () => {
		const em = harness.orm.em;
		await profiles.call({
			handles: HANDLES,
			read: { mode: 'since', since: SINCE },
			maxCostUsd: 1,
			purpose: 'week',
			...context(),
		});
		const result = await profiles.call({
			handles: HANDLES,
			read: { mode: 'latest', since: '2026-10-01T00:00:00.000Z' },
			maxCostUsd: 1,
			purpose: '2026-10',
			...context(),
		});
		expect(apify.calls[1].input).not.toHaveProperty('oldestPostDateUnified');
		// Both videos written, the week's one again (`saved` counts every post written)
		expect(result).toMatchObject({ profiles: 1, posts: 2, saved: 2 });

		em.clear();
		expect(await em.count(SocialPost, {})).toBe(2);
		const snapshots = await em.find(SocialAccountSnapshot, {});
		expect(snapshots.map(s => [s.followers, s.posts, s.avgViews != null]).sort()).toEqual([
			[569, 189, false],
			[569, 189, true],
		]);
	});

	it('the profile alone: one video, no subtitles, no date filter, the cap floored at the actor’s lowest, no video stored, an asked account that came back without a count stamped', async () => {
		const em = harness.orm.em;
		em.create(SocialAccount, { platform: TT, handle: 'gone_handle', city });
		await em.flush();
		const result = await profiles.call({
			handles: HANDLES,
			read: { mode: 'profile' },
			maxCostUsd: 0.008,
			purpose: 'tiktok profiles followers: 2',
			...context(),
		});
		expect(apify.calls[0].input).toMatchObject({ profiles: HANDLES, resultsPerPage: 1 });
		expect(apify.calls[0].input).not.toHaveProperty('oldestPostDateUnified');
		expect(apify.calls[0].input).not.toHaveProperty('downloadSubtitlesOptions');
		expect(apify.calls[0].options.maxCostUsd).toBe(0.05);
		expect(result).toMatchObject({ asked: 2, profiles: 1, snapshots: 1, posts: 0, saved: 0 });

		em.clear();
		expect(await em.count(SocialPost, {})).toBe(0);
		const accounts = await em.find(SocialAccount, {}, { orderBy: { handle: 'asc' } });
		expect(accounts.map(a => [a.handle, a.followers, a.followersAskedAt])).toEqual([
			['berlingoodfood', 569, null],
			['gone_handle', null, NOW],
		]);
	});

	it("`known`: a stranger's profile saves nothing, a known account takes the profile's figures", async () => {
		const em = harness.orm.em;
		expect(
			await profiles.call({
				handles: ['berlingoodfood'],
				read: { mode: 'profile' },
				maxCostUsd: 0.004,
				purpose: 'tiktok profiles twins Berlin: 1',
				cityId: city.id,
				now: NOW.toISOString(),
				save: { accounts: 'known' },
			}),
		).toMatchObject({ found: 3, asked: 1, profiles: 0, snapshots: 0 });
		em.clear();
		expect(await em.count(SocialAccount, {})).toBe(0);

		em.create(SocialAccount, { platform: TT, handle: 'berlingoodfood', city });
		await em.flush();
		expect(
			await profiles.call({
				handles: ['berlingoodfood'],
				read: { mode: 'profile' },
				maxCostUsd: 0.004,
				purpose: 'tiktok profiles twins Berlin: 1 again',
				cityId: city.id,
				now: NOW.toISOString(),
				save: { accounts: 'known' },
			}),
		).toMatchObject({ profiles: 1, snapshots: 1 });
		em.clear();
		expect(await em.findOneOrFail(SocialAccount, { handle: 'berlingoodfood' })).toMatchObject({
			followers: 569,
			platformUserId: '7434148150459499552',
		});
	});

	it('the pure input: the three reads', () => {
		const call = { handles: ['x', 'y', 'x'], maxCostUsd: 1, purpose: 'x' };
		expect(
			tiktokProfilesInput({
				...call,
				read: { mode: 'since', since: '2026-10-17T05:00:00.000Z' },
			}),
		).toMatchObject({
			profiles: ['x', 'y'],
			resultsPerPage: 10,
			oldestPostDateUnified: '2026-10-17',
			downloadSubtitlesOptions: 'DOWNLOAD_SUBTITLES',
		});
		const latest = tiktokProfilesInput({ ...call, read: { mode: 'latest', since: SINCE } });
		expect(latest).toMatchObject({
			resultsPerPage: 10,
			downloadSubtitlesOptions: 'DOWNLOAD_SUBTITLES',
		});
		expect(latest).not.toHaveProperty('oldestPostDateUnified');
		const alone = tiktokProfilesInput({ ...call, read: { mode: 'profile' } });
		expect(alone).toMatchObject({ resultsPerPage: 1, excludePinnedPosts: true });
		expect(alone).not.toHaveProperty('oldestPostDateUnified');
		expect(alone).not.toHaveProperty('downloadSubtitlesOptions');
	});
});
