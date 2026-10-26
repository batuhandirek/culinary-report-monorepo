import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';

import type { City } from 'src/modules/cities/entities/city.entity.js';
import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { AccountSnapshotSourceEnum, SocialAccountSnapshot } from '../entities/social-account-snapshot.entity.js';
import { SocialPlatformEnum } from '../entities/social-post.entity.js';
import { SocialAccountService } from '../services/social-account.service.js';

const HOUR = 3600 * 1000;

describe('account snapshots from every scrape (pglite)', () => {
	let harness: PgliteTestingModule;
	let service: SocialAccountService;
	let city: City;

	beforeAll(async () => {
		harness = await createPgliteTestingModule({ providers: [SocialAccountService] });
		service = harness.moduleRef.get(SocialAccountService);
		entityManagerManager.setEntityManager(harness.orm.em);
		city = testCity(harness.orm.em);
		await harness.orm.em.flush();
	});

	afterAll(async () => {
		await harness.stop();
	});

	const snapshotsOf = (handle: string) =>
		harness.orm.em.find(SocialAccountSnapshot, { account: { handle } }, { orderBy: { scrapedAt: 'asc' } });

	it("records a post's follower count once per scrape, and again an hour later", async () => {
		const em = harness.orm.em;
		const t0 = new Date('2026-10-25T05:00:00Z');
		// One scrape returns three videos of one author: one snapshot
		for (let i = 0; i < 3; i++)
			await service.ensure(SocialPlatformEnum.TIKTOK, 'foodie.berlin', city, { followers: 1000 }, t0);
		await em.flush();
		// Seen again within the hour, after a flush: the same snapshot takes the newer count
		await service.ensure(SocialPlatformEnum.TIKTOK, 'foodie.berlin', city, { followers: 1010 }, new Date(t0.getTime() + HOUR / 3));
		await em.flush();
		// An hour later: a snapshot of its own
		await service.ensure(SocialPlatformEnum.TIKTOK, 'foodie.berlin', city, { followers: 1010 }, new Date(t0.getTime() + 2 * HOUR));
		// No count: nothing to record
		await service.ensure(SocialPlatformEnum.TIKTOK, 'foodie.berlin', city, {}, new Date(t0.getTime() + 3 * HOUR));
		await em.flush();
		em.clear();
		const snapshots = await snapshotsOf('foodie.berlin');
		// A new request's account starts afresh
		await service.ensure(SocialPlatformEnum.TIKTOK, 'foodie.berlin', city, { followers: 1011 }, new Date(t0.getTime() + 2 * HOUR + 60_000));
		await em.flush();
		em.clear();
		expect(await em.count(SocialAccountSnapshot, { account: { handle: 'foodie.berlin' } })).toBe(3);
		expect(snapshots.map(s => [s.source, s.followers, s.scrapedAt.toISOString()])).toEqual([
			['post', 1010, '2026-10-25T05:00:00.000Z'],
			['post', 1010, '2026-10-25T07:00:00.000Z'],
		]);
		expect(snapshots[0]).toMatchObject({ year: 2026, month: 10, day: 25, following: null, avgViews: null });
	});

	it('merges what one scrape saw into one snapshot, the richer source kept, unknowns left null', async () => {
		const em = harness.orm.em;
		const now = new Date('2026-10-26T05:00:00Z');
		const account = (await service.ensure(
			SocialPlatformEnum.INSTAGRAM,
			'cafefrieda',
			city,
			{ followers: 4200, following: 80, source: AccountSnapshotSourceEnum.LOOKUP },
			now,
		))!;
		service.recordSnapshot(
			account,
			{ followers: 4200, posts: 120, avgViews: 900, avgLikes: -1, postsLast30Days: 4 },
			AccountSnapshotSourceEnum.PROFILE,
			now,
		);
		// A post of it saved in the same scrape
		await service.ensure(SocialPlatformEnum.INSTAGRAM, 'cafefrieda', city, { followers: 4200 }, now);
		await em.flush();
		em.clear();
		const [snapshot, ...rest] = await snapshotsOf('cafefrieda');
		expect(rest).toEqual([]);
		expect(snapshot).toMatchObject({
			source: 'profile',
			followers: 4200,
			following: 80,
			posts: 120,
			avgViews: 900,
			// Instagram hides like counts as -1: unknown
			avgLikes: null,
			postsLast30Days: 4,
		});
	});
});
