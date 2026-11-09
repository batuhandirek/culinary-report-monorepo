import { describe, expect, it } from '@jest/globals';

import { SocialPlatformEnum } from '../entities/social-post.entity.js';
import {
	PROFILE_ONLY_USD,
	profileOnlyRuns,
	profileRuns,
	profilesTotal,
} from '../util/profile-runs.js';

const IG = SocialPlatformEnum.INSTAGRAM as const;
const TT = SocialPlatformEnum.TIKTOK as const;

/** The plans' split of one budget into the two platforms' runs */
describe('profile runs', () => {
	const targets = [
		{ platform: IG, handle: 'berlindeneyenir' },
		{ platform: IG, handle: 'churrolade_berlin' },
		{ platform: TT, handle: 'berlingoodfood' },
		{ platform: TT, handle: 'gone_handle' },
		// Asked twice: scraped once
		{ platform: TT, handle: 'berlingoodfood' },
	];

	it('splits the budget by paid items: an Instagram profile is one, a TikTok profile its latest ten; TikTok pays for the week alone without the latest ten', () => {
		const since = '2026-10-17T00:00:00.000Z';
		const runs = profileRuns(targets, { budgetUsd: 2, since, label: 'last week' });
		expect(runs.instagram).toMatchObject({
			handles: ['berlindeneyenir', 'churrolade_berlin'],
			read: { mode: 'posts', since },
			purpose: 'instagram profiles last week: 2',
		});
		expect(runs.tiktok).toMatchObject({
			handles: ['berlingoodfood', 'gone_handle'],
			read: { mode: 'since', since },
			purpose: 'tiktok profiles last week: 2',
		});
		// 2 Instagram profiles against 2 × 10 TikTok videos
		expect(runs.instagram!.maxCostUsd).toBeCloseTo(2 * (2 / 22));
		expect(runs.tiktok!.maxCostUsd).toBeCloseTo(2 * (20 / 22));
	});

	it("the monthly run takes TikTok's latest ten whatever their date; a week's run of brand accounts plans TikTok at three videos a profile", () => {
		const since = '2026-10-01T00:00:00.000Z';
		const month = profileRuns(targets, {
			budgetUsd: 4,
			since,
			latestTen: true,
			label: '2026-10',
		});
		expect(month.tiktok!.read).toEqual({ mode: 'latest', since });
		expect(month.instagram!.read).toEqual({ mode: 'posts', since });
		const week = profileRuns(targets, {
			budgetUsd: 16,
			since,
			label: 'own',
			tiktokItemsPerProfile: 3,
		});
		expect([week.instagram!.maxCostUsd, week.tiktok!.maxCostUsd]).toEqual([
			16 * (2 / 8),
			16 * (6 / 8),
		]);
	});

	it('a platform without handles gets no run; nothing for no targets', () => {
		const runs = profileRuns([{ platform: TT, handle: 'x' }], {
			budgetUsd: 3,
			since: '2026-10-01T00:00:00.000Z',
			label: 'tracking',
		});
		expect(runs).toEqual({
			instagram: null,
			tiktok: {
				handles: ['x'],
				read: { mode: 'since', since: '2026-10-01T00:00:00.000Z' },
				maxCostUsd: 3,
				purpose: 'tiktok profiles tracking: 1',
			},
		});
		expect(profileRuns([], { budgetUsd: 3, since: '', label: 'x' })).toEqual({
			instagram: null,
			tiktok: null,
		});
	});

	it('the profiles alone of rows in their order, as many as the budget covers, each run capped at what it plans to spend', () => {
		const rows = [
			{ platform: IG, handle: 'a', id: '1' },
			{ platform: TT, handle: 'b', id: '2' },
			{ platform: IG, handle: 'c', id: '3' },
			{ platform: TT, handle: 'd', id: '4' },
		];
		// $0.003 + $0.004 + $0.003 fit; the fourth doesn't
		const { picked, instagram, tiktok } = profileOnlyRuns(rows, 0.0105, 'followers');
		expect(picked.map(r => r.id)).toEqual(['1', '2', '3']);
		expect(instagram).toEqual({
			handles: ['a', 'c'],
			read: { mode: 'profile' },
			maxCostUsd: 2 * PROFILE_ONLY_USD[IG],
			purpose: 'instagram profiles followers: 2',
		});
		expect(tiktok).toEqual({
			handles: ['b'],
			read: { mode: 'profile' },
			maxCostUsd: PROFILE_ONLY_USD[TT],
			purpose: 'tiktok profiles followers: 1',
		});
		expect(profileOnlyRuns(rows, 0.001, 'x')).toEqual({
			picked: [],
			instagram: null,
			tiktok: null,
		});
	});

	it('sums the runs, a missing one as nothing', () => {
		expect(
			profilesTotal([
				{ asked: 2, profiles: 2, snapshots: 2, posts: 2, saved: 2 },
				null,
				{ asked: 2, profiles: 1, snapshots: 1, posts: 1, saved: 1 },
			]),
		).toEqual({ asked: 4, profiles: 3, snapshots: 3, posts: 3, saved: 3 });
	});
});
