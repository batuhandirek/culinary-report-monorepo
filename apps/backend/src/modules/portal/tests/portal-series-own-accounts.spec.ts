import { describe, expect, it } from '@jest/globals';

import { addOwnAccounts, buildSeries, monthWindow } from '../util/portal-series.js';

describe('addOwnAccounts', () => {
	it('lists each month’s own accounts, sorted, and leaves months without a snapshot alone', () => {
		const series = buildSeries([], monthWindow('2026-09', 3));
		addOwnAccounts(series, [
			{ month: '2026-09', platform: 'tiktok', handle: 'frieda', followers: 1500, posts: 42, avgViews: 12000 },
			{ month: '2026-09', platform: 'instagram', handle: 'cafefrieda', followers: 4440, posts: null, avgViews: null },
			{ month: '2026-08', platform: 'instagram', handle: 'cafefrieda', followers: 4200 },
			// Outside the window
			{ month: '2026-05', platform: 'instagram', handle: 'cafefrieda', followers: 3000 },
		]);
		expect(series.months.map(m => [m.month, m.ownAccounts])).toEqual([
			['2026-07', undefined],
			['2026-08', [{ platform: 'instagram', handle: 'cafefrieda', followers: 4200 }]],
			[
				'2026-09',
				[
					{ platform: 'instagram', handle: 'cafefrieda', followers: 4440 },
					{ platform: 'tiktok', handle: 'frieda', followers: 1500, posts: 42, avgViews: 12000 },
				],
			],
		]);
	});
});
