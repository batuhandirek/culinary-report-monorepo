import { describe, expect, it } from '@jest/globals';

import type { ReportBranch, ReportData } from '../interfaces/report-data.interface.js';
import { observe, OBSERVATION_FLOORS, pickInvestigated } from '../util/report-observations.js';

const TZ = 'Europe/Berlin';

const stars = (counts: Partial<Record<1 | 2 | 3 | 4 | 5, number>>) =>
	[5, 4, 3, 2, 1].map(s => ({ stars: s, count: counts[s as 1 | 2 | 3 | 4 | 5] ?? 0 }));

const branch = (extra: Partial<ReportBranch> = {}): ReportBranch =>
	({
		venueId: 'v1',
		name: 'Chén Chè',
		social: { postCount: 0, views: 0, engagements: 0, creators: 0 },
		reviews: { count: 0, written: 0, praise: {}, complaints: {} },
		ratingTrend: [],
		neighbours: [],
		...extra,
	}) as ReportBranch;

/** A month with a previous one, quiet unless told otherwise. */
const data = (extra: Partial<ReportData> = {}, previous: Partial<NonNullable<ReportData['previous']>> = {}): ReportData =>
	({
		brand: { id: 'b', name: 'Chén Chè', brandOnlyPosts: 0 },
		branches: [branch()],
		month: '2026-09',
		previous: {
			month: '2026-08',
			social: { postCount: 10, views: 100_000, engagements: 0, creators: 8, promotional: 0 },
			reviews: { count: 20, written: 16, avgStars: 4.5, replyRate: 0.5, stars: stars({ 5: 14, 4: 4, 3: 2 }), complaints: {}, complaintThemes: {} },
			...previous,
		},
		social: { postCount: 10, views: 100_000, engagements: 0, creators: 8, promotional: 0, sentiment: { positive: 0, mixed: 0, neutral: 0, negative: 0 }, praise: {}, complaints: {} },
		posts: [],
		ownPosts: [],
		reviews: {
			count: 20,
			written: 16,
			avgStars: 4.5,
			replyRate: 0.5,
			stars: stars({ 5: 14, 4: 4, 3: 2 }),
			praise: {},
			complaints: {},
			complaintThemes: {},
			split: { fiveStar: {} as never, belowFive: {} as never },
			changes: [],
			critical: [],
			list: [],
			replyDrafts: [],
		},
		dishes: [],
		competitors: [],
		creators: [],
		creatorsNearby: [],
		...extra,
	}) as ReportData;

const keys = (input: ReportData, previousData?: Partial<ReportData>) =>
	observe({ data: input, previousData, history: [], timeZone: TZ }).map(o => o.key);

describe('observe', () => {
	it('finds nothing without a previous month, and nothing when nothing moved', () => {
		expect(observe({ data: data({ previous: undefined }), history: [], timeZone: TZ })).toEqual([]);
		expect(keys(data())).toEqual([]);
	});

	it('fires on a count past both floors, not one past only one', () => {
		// +40 % but only +4 posts: under the absolute floor of 3? No: 4 ≥ 3, and max 14 ≥ 5
		expect(keys(data({ social: { ...data().social, postCount: 14 } }))).toEqual(['posts']);
		// +50 % but 2 → 3 posts: too few
		expect(keys(data({ social: { ...data().social, postCount: 3 } }, { social: { postCount: 2, views: 100_000, engagements: 0, creators: 8, promotional: 0 } }))).toEqual([]);
		// Views +40 % passes, +39 % doesn't
		expect(keys(data({ social: { ...data().social, views: 140_000 } }))).toEqual(['views']);
		expect(keys(data({ social: { ...data().social, views: 139_000 } }))).toEqual([]);
	});

	it('writes the move as a sentence with both months and the change', () => {
		const [views] = observe({ data: data({ social: { ...data().social, views: 250_000 } }), history: [], timeZone: TZ });
		expect(views).toMatchObject({ metric: 'views', kind: 'spike', from: 100_000, to: 250_000, change: 150_000, changePercent: 150, comparedWith: 'August 2026', resolution: 'month' });
		expect(views.sentence).toBe('Views of posts by others went from 100k in August 2026 to 250k in September 2026 (+150k, +150%).');
		expect(views.series).toEqual([
			{ at: '2026-08', value: 100_000 },
			{ at: '2026-09', value: 250_000 },
		]);
	});

	it('reads review moves only when the month before was scraped', () => {
		const dipped = data({ reviews: { ...data().reviews, count: 10, avgStars: 4.0, replyRate: 0.1 } });
		expect(keys(dipped)).toEqual(expect.arrayContaining(['reviews', 'avg_stars', 'reply_rate']));
		expect(keys({ ...dipped, previous: { ...dipped.previous!, reviews: undefined } })).toEqual([]);
	});

	it('ranks a fall in stars first and links the siblings that moved together', () => {
		const month = data({
			social: { ...data().social, postCount: 16, views: 180_000, creators: 13 },
			reviews: { ...data().reviews, avgStars: 4.0 },
		});
		const out = observe({ data: month, history: [], timeZone: TZ });
		expect(out[0].key).toBe('avg_stars');
		const views = out.find(o => o.key === 'views')!;
		const posts = out.find(o => o.key === 'posts')!;
		expect(views.related).toEqual(expect.arrayContaining(['posts', 'creators']));
		// The siblings step back behind the strongest of them
		expect(Math.max(posts.score, out.find(o => o.key === 'creators')!.score)).toBeLessThan(views.score);
	});

	it('reads the five-star share, a complaint theme and a dish from what the previous month stored', () => {
		const month = data(
			{
				reviews: {
					...data().reviews,
					stars: stars({ 5: 6, 4: 8, 3: 6 }),
					complaintThemes: { wait_for_food: 5, service_other: 2 },
				},
				dishes: [
					{ name: 'Pho', count: 8, positive: 7, negative: 1 },
					{ name: 'Bún chả', count: 2, positive: 2, negative: 0 },
				],
			},
			{
				reviews: { count: 20, written: 16, avgStars: 4.5, replyRate: 0.5, stars: stars({ 5: 14, 4: 4, 3: 2 }), complaints: {}, complaintThemes: { wait_for_food: 1 } },
				dishes: [
					{ name: 'Pho', count: 2 },
					{ name: 'Bún chả', count: 6 },
				],
			},
		);
		const out = observe({ data: month, history: [], timeZone: TZ });
		expect(out.map(o => o.key)).toEqual(expect.arrayContaining(['five_star_share', 'complaint_theme:wait_for_food', 'dish_share:pho']));
		expect(out.find(o => o.key === 'complaint_theme:wait_for_food')!.sentence).toBe(
			'Complaints about wait for food went from 1 of 16 written google reviews (6%) in August 2026 to 5 of 16 (31%) in September 2026.',
		);
		// The catch-all theme never counts
		expect(out.some(o => o.key.includes('service_other'))).toBe(false);
	});

	it('reads a complaint far above the city median from the city section', () => {
		const month = data({
			city: {
				cityName: 'Berlin',
				mentions: 500,
				risingCuisines: [],
				risingDishes: [],
				baseline: { venues: 10, posts: { venues: 10 }, views: { venues: 10 }, avgStars: { venues: 10 }, replyRate: { venues: 10 } },
				themes: [{ key: 'wait_for_food', label: 'Wait for food', topic: 'service', reviews: 5, venueShare: 0.31, median: 0.08, venues: 14 }],
			},
		});
		const [theme] = observe({ data: month, history: [], timeZone: TZ });
		expect(theme).toMatchObject({ key: 'complaint_theme:wait_for_food', from: 8, to: 31, comparedWith: 'the city median' });
	});

	it('finds reviews crowding into one week', () => {
		const list = [
			...Array.from({ length: 11 }, (_, i) => ({ reviewId: `a${i}`, publishedAt: `2026-09-1${(i % 5) + 4}T12:00:00Z`, replied: false, praise: [], complaints: [] })),
			...Array.from({ length: 8 }, (_, i) => ({ reviewId: `b${i}`, publishedAt: `2026-09-0${(i % 7) + 1}T12:00:00Z`, replied: false, praise: [], complaints: [] })),
		];
		const month = data({ reviews: { ...data().reviews, count: 19, list } });
		const week = observe({ data: month, history: [], timeZone: TZ }).find(o => o.key === 'review_week')!;
		expect(week).toMatchObject({ metric: 'review_week', resolution: 'week', to: 11 });
		expect(week.sentence).toMatch(/^11 of your 19 Google reviews came in the week of 14 September 2026, against /);
	});

	it('reads followers from the own accounts, at week resolution when the month has points', () => {
		const monthly = data({ ownAccounts: [{ platform: 'instagram', handle: 'chenche', url: 'u', followers: 1_450, followersChange: 250 }] });
		const [m] = observe({ data: monthly, history: [], timeZone: TZ });
		expect(m).toMatchObject({ key: 'followers:instagram:chenche', resolution: 'month', from: 1_200, to: 1_450, change: 250, changePercent: 21 });
		expect(m.sentence).toBe('@chenche on Instagram went from 1,200 followers to 1,450 (+250, +21%) between the August 2026 and September 2026 snapshots.');

		const weekly = data({
			ownAccounts: [
				{
					platform: 'instagram',
					handle: 'chenche',
					url: 'u',
					followers: 1_450,
					followersChange: 250,
					followerPoints: [
						{ date: '2026-09-06', followers: 1_210 },
						{ date: '2026-09-13', followers: 1_220 },
						{ date: '2026-09-20', followers: 1_440 },
						{ date: '2026-09-27', followers: 1_450 },
					],
				},
			],
		});
		const [w] = observe({ data: weekly, history: [], timeZone: TZ });
		expect(w.resolution).toBe('week');
		expect(w.series).toHaveLength(4);
		expect(w.sentence).toMatch(/in the week of 14 September 2026\.$/);
		// Under the floors: nothing
		expect(keys(data({ ownAccounts: [{ platform: 'instagram', handle: 'x', url: 'u', followers: 190, followersChange: 60 }] }))).toEqual([]);
	});

	it('reads place figures per branch, never summed, with the branch named for a chain', () => {
		const month = data({
			branches: [
				branch({
					venueId: 'v1',
					name: 'Oranienstraße',
					ratingTrend: [
						{ month: '2026-08', date: '2026-09-02', rating: 4.4 },
						{ month: '2026-09', date: '2026-10-02', rating: 4.2 },
					],
					busyness: { weeks: [{ week: '2026-09-07', index: 48 }], index: 48, samples: 4, previous: { month: '2026-08', weeks: [{ week: '2026-08-03', index: 62 }], index: 62, samples: 4 } },
					demand: { platform: 'google', booked: 70, previousBooked: 45, evenings: [{ date: '2026-09-05', booked: 70 }, { date: '2026-09-12', booked: 70 }, { date: '2026-09-19', booked: 70 }] },
					searchRanks: [
						{ query: 'pho kreuzberg', rank: 8, results: 20, top: [], history: [{ month: '2026-08', rank: 3 }] },
						{ query: 'vietnamese kreuzberg', rank: 4, results: 20, top: [], history: [{ month: '2026-08', rank: 5 }] },
					],
				}),
				branch({ venueId: 'v2', name: 'Rosenthaler Str.', ratingTrend: [{ month: '2026-08', date: '2026-09-02', rating: 4.6 }, { month: '2026-09', date: '2026-10-02', rating: 4.6 }] }),
			],
		});
		const out = observe({ data: month, history: [], timeZone: TZ });
		expect(out.map(o => o.key)).toEqual(expect.arrayContaining(['rating:v1', 'busyness:v1', 'booked:v1', 'search_rank:v1:pho kreuzberg']));
		expect(out.some(o => o.key === 'rating:v2' || o.key.includes('vietnamese'))).toBe(false);
		const rating = out.find(o => o.key === 'rating:v1')!;
		expect(rating).toMatchObject({ branchId: 'v1', branchName: 'Oranienstraße', from: 4.4, to: 4.2, change: -0.2 });
		expect(rating.sentence).toBe("Oranienstraße's all-time Google rating went from 4.4 to 4.2 between August 2026 and September 2026.");
		expect(out.find(o => o.key === 'busyness:v1')!.sentence).toBe("Oranienstraße's Google busyness index went from 62 in August 2026 to 48 in September 2026 (-14 points).");
		expect(out.find(o => o.key === 'search_rank:v1:pho kreuzberg')!.sentence).toBe(
			'Oranienstraße moved from 3rd to 8th on the Google Maps search "pho kreuzberg" between August 2026 and September 2026.',
		);
	});

	it('compares with a competitor that moved the other way, from the previous report', () => {
		const competitor = { venueId: 'c1', name: 'Monsieur Vuong', social: { postCount: 6, views: 50_000, engagements: 0, creators: 5 }, reviewsTracked: false, reviews: { count: 0, written: 0, praise: {}, complaints: {} } };
		const month = data({
			social: { ...data().social, views: 55_000 },
			competitors: [{ ...competitor, social: { ...competitor.social, views: 80_000 } }],
		});
		const out = observe({ data: month, previousData: { competitors: [competitor] }, history: [], timeZone: TZ });
		const rel = out.find(o => o.key === 'competitor_reach:c1')!;
		expect(rel.sentence).toBe("Your views went from 100k in August 2026 to 55k in September 2026 (-45%), while Monsieur Vuong's went from 50k to 80k (+60%).");
	});

	it('keeps eight at most and draws a series from the history', () => {
		const month = data({ social: { ...data().social, views: 250_000 } });
		const [views] = observe({
			data: month,
			history: [
				{ month: '2026-06', social: { postCount: 5, views: 50_000, creators: 4 } },
				{ month: '2026-07', social: { postCount: 7, views: 70_000, creators: 6 } },
			],
			timeZone: TZ,
		});
		expect(views.series.map(p => p.at)).toEqual(['2026-06', '2026-07', '2026-08', '2026-09']);
		expect(OBSERVATION_FLOORS.views.abs).toBe(5_000);
	});

	it('investigates one of a sibling group and moves on to the next story', () => {
		const out = pickInvestigated(
			[
				{ key: 'views', related: ['posts', 'creators'] },
				{ key: 'posts', related: ['views', 'creators'] },
				{ key: 'avg_stars' },
				{ key: 'creators', related: ['views', 'posts'] },
				{ key: 'reviews', related: ['review_week'] },
				{ key: 'review_week', related: ['reviews'] },
			],
			4,
		);
		expect(out.map(o => o.key)).toEqual(['views', 'avg_stars', 'reviews']);
	});
});
