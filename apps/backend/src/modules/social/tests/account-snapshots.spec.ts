import { describe, expect, it } from '@jest/globals';

import {
	closingMonth,
	closingRange,
	followersChange,
	latestFigures,
	monthFigures,
	snapshotDateParts,
} from '../util/account-snapshots.js';

const at = (iso: string) => new Date(iso);

describe('account snapshots', () => {
	it("stores a snapshot's UTC date parts", () => {
		expect(snapshotDateParts(at('2026-10-31T23:30:00Z'))).toEqual({ year: 2026, month: 10, day: 31 });
	});

	it("closes the month before in a month's first week", () => {
		expect(closingMonth(at('2026-10-02T06:00:00Z'))).toBe('2026-09');
		expect(closingMonth(at('2026-10-07T23:59:00Z'))).toBe('2026-09');
		expect(closingMonth(at('2026-10-08T00:00:00Z'))).toBe('2026-10');
		expect(closingMonth(at('2026-10-31T12:00:00Z'))).toBe('2026-10');
		expect(closingRange(['2026-09', '2026-08'])).toEqual({
			from: at('2026-08-08T00:00:00Z'),
			to: at('2026-10-08T00:00:00Z'),
		});
	});

	it('takes each field from the latest snapshot closing the month that has it', () => {
		const figures = monthFigures(
			[
				// The monthly run on the 2nd, with averages
				{ accountId: 'a', scrapedAt: at('2026-10-02T06:00:00Z'), followers: 900, avgViews: 5000 },
				// A post seen later that week: newer followers, no averages
				{ accountId: 'a', scrapedAt: at('2026-10-05T06:00:00Z'), followers: 910 },
				// September's own days
				{ accountId: 'a', scrapedAt: at('2026-09-20T06:00:00Z'), followers: 850, avgViews: 4000 },
				// October's, closing no asked month
				{ accountId: 'a', scrapedAt: at('2026-10-20T06:00:00Z'), followers: 990 },
				{ accountId: 'b', scrapedAt: at('2026-08-15T06:00:00Z'), followers: 10 },
			],
			['2026-09'],
		);
		expect(figures).toEqual([
			expect.objectContaining({
				accountId: 'a',
				month: '2026-09',
				followers: 910,
				avgViews: 5000,
				scrapedAt: at('2026-10-05T06:00:00Z'),
			}),
		]);
		expect(latestFigures([])).toMatchObject({ followers: null, avgViews: null });
	});

	it('compares followers with the newest count 30 days or more older', () => {
		const snapshots = [
			{ accountId: 'a', scrapedAt: at('2026-10-25T06:00:00Z'), followers: 1200 },
			{ accountId: 'a', scrapedAt: at('2026-10-20T06:00:00Z'), followers: 1150 },
			{ accountId: 'a', scrapedAt: at('2026-09-25T06:00:00Z'), followers: 1000 },
			{ accountId: 'a', scrapedAt: at('2026-08-01T06:00:00Z'), followers: 700 },
		];
		expect(followersChange(snapshots)).toBe(200);
		expect(followersChange(snapshots.slice(0, 2))).toBeUndefined();
		expect(followersChange([])).toBeUndefined();
	});
});
