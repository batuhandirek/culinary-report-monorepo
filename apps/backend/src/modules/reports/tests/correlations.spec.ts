import { describe, expect, it } from '@jest/globals';

import {
	baselineReviewsPerWeek,
	buzzToReviews,
	complaintTimes,
	type CorrelationReview,
	paidVsOrganic,
} from '../util/correlations.js';

const TZ = 'Europe/Berlin';
const review = (publishedAt: string, complaints: string[] = [], written = true): CorrelationReview => ({
	publishedAt,
	complaints,
	written,
	stars: complaints.length ? 2 : 5,
});
const many = (n: number, day: string, hourUtc = 12) =>
	Array.from({ length: n }, (_, i) => review(`${day}T${String(hourUtc).padStart(2, '0')}:${String(i).padStart(2, '0')}:00.000Z`));

// 13 reviews in each of June, July and August: 39 over 92 days, ~3 a week
const BASELINE = ['2026-06-10', '2026-07-10', '2026-08-10'].flatMap(day => many(13, day));
// Two a week in September, eight in the week after the viral one, and the run's week in October
const SEPTEMBER = [
	...many(2, '2026-09-02'),
	...many(2, '2026-09-09'),
	...many(8, '2026-09-16'),
	...many(2, '2026-09-23'),
	...many(2, '2026-09-29'),
	...many(1, '2026-10-02'),
];
const POSTS = [
	{ postedAt: '2026-09-08T17:00:00.000Z', views: 50_000, promotional: false },
	{ postedAt: '2026-09-10T17:00:00.000Z', views: 30_000, promotional: true },
	{ postedAt: '2026-09-22T17:00:00.000Z', views: 2_000, promotional: false },
];

describe('buzz to reviews', () => {
	it('reads the week after the most viewed week against the usual pace', () => {
		expect(baselineReviewsPerWeek(BASELINE)).toBe(3);
		const res = buzzToReviews({ month: '2026-09', timeZone: TZ, posts: POSTS, reviews: SEPTEMBER, baseline: BASELINE })!;
		expect(res.weeks.map(w => [w.week, w.posts, w.views, w.reviews])).toEqual([
			['2026-08-31', 0, 0, 2],
			['2026-09-07', 2, 80_000, 2],
			['2026-09-14', 0, 0, 8],
			['2026-09-21', 1, 2_000, 2],
			['2026-09-28', 0, 0, 3],
		]);
		expect(res).toMatchObject({ peakWeek: '2026-09-07', followingWeek: '2026-09-14', followingReviews: 8, ratio: 2.7 });
		expect(res.sentence).toBe(
			'The 2 posts in the week of 7 Sept (80,000 views) were followed by 8 new Google reviews the week after, 2.7× your usual 3 a week.',
		);
		expect(res.sentence).not.toMatch(/caus/);
	});

	it('is hidden below 10 reviews, 3 posts, or without a baseline', () => {
		const input = { month: '2026-09', timeZone: TZ, posts: POSTS, reviews: SEPTEMBER, baseline: BASELINE };
		expect(buzzToReviews({ ...input, reviews: SEPTEMBER.slice(0, 9) })).toBeNull();
		expect(buzzToReviews({ ...input, posts: POSTS.slice(0, 2) })).toBeNull();
		expect(buzzToReviews({ ...input, baseline: [] })).toBeNull();
	});
});

describe('complaints by time', () => {
	// Saturday 12 Sept, 20:30 and 21:10 in Berlin (UTC+2), and the Saturdays around it
	const WAIT = ['2026-09-12T18:30:00Z', '2026-09-12T19:10:00Z', '2026-09-19T18:00:00Z', '2026-09-05T17:45:00Z'].map(t =>
		review(t, ['wait', 'service']),
	);
	const OTHER = [
		review('2026-09-07T10:00:00Z', ['wait']),
		review('2026-09-08T10:00:00Z', ['price']),
		review('2026-09-09T10:00:00Z', ['price']),
		...many(5, '2026-09-15'),
	];
	const histogram = { Sa: [{ hour: 18, occupancyPercent: 70 }, { hour: 20, occupancyPercent: 90 }, { hour: 23, occupancyPercent: 100 }] };

	it('places each topic over its floor in the week, next to popular times', () => {
		const res = complaintTimes({ timeZone: TZ, reviews: [...WAIT, ...OTHER, review('2026-09-20T10:00:00Z', [], false)], histogram })!;
		expect(res.written).toBe(12);
		expect(res.topics).toEqual([
			{ topic: 'wait', reviews: 5, day: 'Sa', daypart: 'evening', there: 4, usualShare: 0.33, busyness: 90 },
			{ topic: 'service', reviews: 4, day: 'Sa', daypart: 'evening', there: 4, usualShare: 0.33, busyness: 90 },
		]);
		// Saturday row (index 5), 20:00 and 21:00
		expect(res.matrix[5][20]).toBe(2);
		expect(res.matrix[5].reduce((a, b) => a + b, 0)).toBe(4);
		expect(res.sentence).toBe(
			'Of the 5 reviews criticising wait, 4 were posted on Saturday evenings, which carry 33 % of all your reviews, when Google shows you at 90 % of your peak.',
		);
	});

	it('leaves popular times out when unknown, and hides below 10 written reviews', () => {
		const res = complaintTimes({ timeZone: TZ, reviews: [...WAIT, ...OTHER] })!;
		expect(res.topics[0].busyness).toBeUndefined();
		expect(res.sentence).toBe(
			'Of the 5 reviews criticising wait, 4 were posted on Saturday evenings, which carry 33 % of all your reviews.',
		);
		expect(complaintTimes({ timeZone: TZ, reviews: [...WAIT, ...OTHER].slice(0, 9) })).toBeNull();
	});

	it('names no time when a topic falls where all reviews fall', () => {
		// Every review, complaint or not, on Saturday evenings: no lift
		const reviews = Array.from({ length: 12 }, (_, i) =>
			review(`2026-09-${String(5 + 7 * (i % 3)).padStart(2, '0')}T18:${String(i).padStart(2, '0')}:00Z`, i < 6 ? ['wait'] : []),
		);
		expect(complaintTimes({ timeZone: TZ, reviews })).toBeNull();
	});
});

describe('paid against organic', () => {
	it('compares median views and the reviews in the week after', () => {
		const res = paidVsOrganic({ month: '2026-09', posts: POSTS, reviews: SEPTEMBER, baseline: BASELINE })!;
		// Paid 10 Sept: the 16th's 8; organic 8 Sept: the 9th's 2, 22 Sept: the 23rd's and 29th's 4 → 3
		expect(res.paid).toEqual({ posts: 1, medianViews: 30_000, reviewsAfter: 8 });
		expect(res.organic).toEqual({ posts: 2, medianViews: 26_000, reviewsAfter: 3 });
		expect(res.baselinePerWeek).toBe(3);
		expect(res.sentence).toContain('followed by 8 new reviews on average, after an organic one 3');
	});

	it('is hidden without a post in each group or below the floors', () => {
		const organicOnly = POSTS.map(p => ({ ...p, promotional: false }));
		expect(paidVsOrganic({ month: '2026-09', posts: organicOnly, reviews: SEPTEMBER, baseline: BASELINE })).toBeNull();
		expect(paidVsOrganic({ month: '2026-09', posts: POSTS, reviews: SEPTEMBER.slice(0, 9), baseline: BASELINE })).toBeNull();
	});
});
