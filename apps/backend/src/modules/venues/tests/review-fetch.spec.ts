import { describe, expect, it } from '@jest/globals';

import { backfillRunCap, fetchStart, markFetched } from '../util/review-fetch.js';

const stretch = (from: string | null, at: string | null) => ({
	reviewsFetchedFrom: from ? new Date(`${from}T00:00:00Z`) : null,
	reviewsFetchedAt: at ? new Date(`${at}T06:00:00Z`) : null,
});

/** A venue's stored stretch of Google reviews: where a fetch starts, how a fetch extends it */
describe('review fetch stretches', () => {
	it('a fetch starts at the last fetch when the stretch covers its day, else at the day', () => {
		// The stretch covers the day: the reviews up to the last fetch are stored
		expect(fetchStart('2026-09-01', stretch('2026-08-01', '2026-09-20'))).toBe('2026-09-20');
		// The stretch starts after the day: a gap before it
		expect(fetchStart('2026-09-01', stretch('2026-09-10', '2026-09-20'))).toBe('2026-09-01');
		// The stretch ends on the day itself
		expect(fetchStart('2026-09-20', stretch('2026-08-01', '2026-09-20'))).toBe('2026-09-20');
		expect(fetchStart('2026-09-01', stretch(null, null))).toBe('2026-09-01');
	});

	it('a fetch extends the stretch it starts inside, and begins a new one when it starts after it', () => {
		const now = new Date('2026-10-02T06:00:00Z');
		const inside = stretch('2026-08-01', '2026-09-20');
		markFetched(inside, '2026-09-20', now);
		expect([inside.reviewsFetchedFrom?.toISOString(), inside.reviewsFetchedAt]).toEqual([
			'2026-08-01T00:00:00.000Z',
			now,
		]);
		// From earlier than the stretch: it now starts there
		const earlier = stretch('2026-08-01', '2026-09-20');
		markFetched(earlier, '2026-03-01', now);
		expect(earlier.reviewsFetchedFrom?.toISOString()).toBe('2026-03-01T00:00:00.000Z');
		// After a gap: a new stretch
		const after = stretch('2026-08-01', '2026-09-20');
		markFetched(after, '2026-09-25', now);
		expect(after.reviewsFetchedFrom?.toISOString()).toBe('2026-09-25T00:00:00.000Z');
		const first = stretch(null, null);
		markFetched(first, '2026-09-25', now);
		expect(first.reviewsFetchedFrom?.toISOString()).toBe('2026-09-25T00:00:00.000Z');
	});

	it("a backfill run's cap is its plan with headroom, never more than the budget left, the actor's lowest at least", () => {
		expect(backfillRunCap(4, 90, 0.05)).toBe(6);
		expect(backfillRunCap(4, 5, 0.05)).toBe(5);
		expect(backfillRunCap(0.01, 0.001, 0.05)).toBeCloseTo(0.015);
	});
});
