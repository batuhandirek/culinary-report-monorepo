import { describe, expect, it } from '@jest/globals';

import { seedIndex } from 'src/modules/topics/tests/factories/topic.factory.js';

import type { ReportObservation } from '../interfaces/report-analysis.interface.js';
import type { ReportData, ReportPost } from '../interfaces/report-data.interface.js';
import { type PlaybookContext, reviewWeeksOf, runPlaybook } from '../util/report-playbooks.js';

const TZ = 'Europe/Berlin';

const post = (postedAt: string, views: number, extra: Partial<ReportPost> = {}): ReportPost => ({
	postId: `${postedAt}-${views}`,
	platform: 'instagram',
	url: 'u',
	postedAt: `${postedAt}T12:00:00Z`,
	views,
	engagements: 0,
	promotional: false,
	visited: true,
	sentiment: 'positive',
	summary: 'Nice.',
	praise: [],
	complaints: [],
	dishes: [],
	author: 'anna',
	authorFans: 50_000,
	...extra,
});

const observation = (extra: Partial<ReportObservation>): ReportObservation =>
	({
		key: 'views',
		metric: 'views',
		kind: 'spike',
		month: '2026-09',
		label: 'Views',
		source: 'TikTok and Instagram',
		unit: 'views',
		from: 100_000,
		to: 300_000,
		change: 200_000,
		comparedWith: 'August 2026',
		resolution: 'month',
		series: [],
		sentence: '',
		score: 1,
		checks: [],
		...extra,
	}) as ReportObservation;

const context = (data: Partial<ReportData>, extra: Partial<PlaybookContext> = {}): PlaybookContext => ({
	data: {
		brand: { id: 'b', name: 'Chén Chè', brandOnlyPosts: 0 },
		branches: [],
		month: '2026-09',
		previous: {
			month: '2026-08',
			social: { postCount: 10, views: 100_000, engagements: 0, creators: 8, promotional: 1 },
			reviews: { count: 20, written: 16, avgStars: 4.5, replyRate: 0.5, complaintThemes: { wait_for_food: 1 } },
		},
		social: { postCount: 4, views: 300_000, engagements: 0, creators: 3, promotional: 0, sentiment: { positive: 4, mixed: 0, neutral: 0, negative: 0 }, praise: {}, complaints: {} },
		posts: [],
		ownPosts: [],
		reviews: { count: 20, written: 16, stars: [], praise: {}, complaints: {}, complaintThemes: {}, split: {} as never, changes: [], critical: [], list: [], replyDrafts: [] },
		dishes: [],
		competitors: [],
		creators: [],
		creatorsNearby: [],
		...data,
	} as ReportData,
	history: [],
	timeZone: TZ,
	days: [],
	reviewWeeks: [],
	baselinePerWeek: null,
	competitorsPrevious: new Map(),
	aspects: seedIndex(),
	...extra,
});

describe('runPlaybook', () => {
	it('answers the follower questions: own posts, creators, press, and the resolution caveat', () => {
		const account = { platform: 'instagram' as const, handle: 'chenche', url: 'u', followers: 1_450, followersChange: 250, avgViews: 2_000 };
		const ctx = context({
			ownAccounts: [account],
			ownPosts: [post('2026-09-12', 9_000, { author: 'chenche' })],
			posts: [post('2026-09-11', 240_000), post('2026-09-20', 30_000, { author: 'ben' }), post('2026-09-21', 30_000, { author: 'cem' })],
		});
		const checks = runPlaybook(observation({ key: 'followers:instagram:chenche', metric: 'followers', resolution: 'month' }), ctx);
		expect(checks.map(c => c.verdict)).toEqual(['supports', 'supports', 'unknown', 'unknown']);
		expect(checks[0].answer).toContain('1 own post, the most viewed with 9k views');
		expect(checks[0].answer).toContain('against your usual 2k');
		expect(checks[1].answer).toContain('@anna on Instagram (50k followers): 240k views');
		expect(checks[2].answer).toMatch(/No press was found/);
		expect(checks[3].answer).toContain('monthly snapshots');
		expect(checks.every(c => ['month', 'day'].includes(c.resolution))).toBe(true);
	});

	it('narrows the follower window to the week before the jump when the month has points', () => {
		const account = {
			platform: 'instagram' as const,
			handle: 'chenche',
			url: 'u',
			followers: 1_450,
			followersChange: 250,
			followerPoints: [
				{ date: '2026-09-06', followers: 1_210 },
				{ date: '2026-09-13', followers: 1_220 },
				{ date: '2026-09-20', followers: 1_440 },
			],
		};
		const ctx = context({
			ownAccounts: [account],
			ownPosts: [post('2026-09-02', 9_000, { author: 'chenche' }), post('2026-09-16', 7_000, { author: 'chenche' })],
		});
		const [own] = runPlaybook(observation({ key: 'followers:instagram:chenche', metric: 'followers', resolution: 'week' }), ctx);
		expect(own.question).toBe('Did you post on Instagram in the week before and the week of 14 September?');
		// Only the post of the 16th falls in the window
		expect(own.answer).toContain('1 own post, the most viewed with 7k views');
		expect(runPlaybook(observation({ key: 'followers:instagram:chenche', metric: 'followers', resolution: 'week' }), ctx).some(c => c.answer.includes('monthly snapshots'))).toBe(false);
	});

	it('answers the review questions: the weeks, the stars of the busy weeks, the calendar and the competitors', () => {
		const weeks = reviewWeeksOf(
			[
				...Array.from({ length: 11 }, (_, i) => ({ publishedAt: new Date(`2026-09-1${(i % 5) + 4}T12:00:00Z`), stars: i < 7 ? 2 : 5, text: 'x', themes: ['wait_for_food'] })),
				{ publishedAt: new Date('2026-09-02T12:00:00Z'), stars: 5, text: 'x', themes: [] },
			],
			TZ,
		);
		const competitor = { venueId: 'c1', name: 'Rival', social: { postCount: 1, views: 1, engagements: 0, creators: 1 }, reviewsTracked: true, reviews: { count: 10, written: 8, praise: {}, complaints: {} } };
		const ctx = context(
			{
				reviews: { count: 12, written: 12, stars: [{ stars: 5, count: 5 }, { stars: 2, count: 7 }], praise: {}, complaints: {}, complaintThemes: { wait_for_food: 7 }, split: {} as never, changes: [], critical: [], list: [], replyDrafts: [] },
				competitors: [competitor],
				context: { month: '2026-09', weekends: 4, holidays: [], events: [{ name: 'Marathon', kind: 'event' as never, startDate: '2026-09-19', endDate: '2026-09-20' }] },
			},
			{
				reviewWeeks: weeks,
				baselinePerWeek: 2,
				days: [{ date: '2026-09-15', rainMm: 4 }, { date: '2026-09-16', rainMm: 0 }],
				competitorsPrevious: new Map([['c1', { ...competitor, reviews: { ...competitor.reviews, count: 10 } }]]),
				cityThemes: [{ key: 'wait_for_food', label: 'Wait for food', reviewShare: 12, reviewShareChange: 1, venues: 40 }],
			},
		);
		const checks = runPlaybook(observation({ key: 'review_week', metric: 'review_week', kind: 'spike', to: 11 }), ctx);
		expect(checks.map(c => c.question)).toEqual([
			'How did the reviews spread over the weeks?',
			'What stars did the busy weeks give?',
			'Was there a holiday, an event or rain in the week of 14 September?',
			"Did your competitors' review counts move the same way?",
			'Did the complaints that grew for you grow across the city too?',
		]);
		expect(checks[0].answer).toContain('your usual pace is 2 a week');
		expect(checks[1]).toMatchObject({ verdict: 'supports', resolution: 'week' });
		expect(checks[1].answer).toContain('7 of the 11 reviews');
		expect(checks[2].answer).toContain('rain on 1 of 2 days');
		expect(checks[2].answer).toContain('Marathon');
		// The competitor's count stood still: the move is yours alone
		expect(checks[3]).toMatchObject({ verdict: 'supports' });
		expect(checks[4]).toMatchObject({ verdict: 'supports' });
		expect(checks[4].answer).toContain('wait for food grew for you but not across the city');
	});

	it('answers the stars questions: the complaints that grew, noticed changes, and the theme against others', () => {
		const competitor = { venueId: 'c1', name: 'Rival', social: { postCount: 1, views: 1, engagements: 0, creators: 1 }, reviewsTracked: true, reviews: { count: 12, written: 10, praise: {}, complaints: { wait: 1 } } };
		const ctx = context(
			{
				reviews: {
					count: 20,
					written: 16,
					stars: [{ stars: 5, count: 8 }, { stars: 2, count: 8 }],
					praise: {},
					complaints: { service: 6 },
					complaintThemes: { wait_for_food: 6, taste: 1 },
					split: {} as never,
					changes: [],
					changeThemes: [{ theme: 'ownership_change', label: 'Ownership change', reviews: 3, details: ['new owner since summer'] }],
					critical: [],
					list: [],
					replyDrafts: [],
				},
				competitors: [competitor],
			},
			{ cityThemes: [{ key: 'wait_for_food', label: 'Wait for food', reviewShare: 12, reviewShareChange: 1, venues: 40 }] },
		);
		const checks = runPlaybook(observation({ key: 'complaint_theme:wait_for_food', metric: 'complaint_theme', kind: 'shift', theme: 'wait_for_food', from: 6, to: 38, change: 32 }), ctx);
		expect(checks[0]).toMatchObject({ verdict: 'supports' });
		expect(checks[0].answer).toContain('wait for food: from 1 of 16 written reviews to 6 of 16 (+32 points)');
		expect(checks[1]).toMatchObject({ verdict: 'supports' });
		expect(checks[1].answer).toContain('ownership change (3 reviews: "new owner since summer")');
		const against = checks.find(c => c.question.startsWith('Is this complaint higher'))!;
		expect(against.verdict).toBe('supports');
		expect(against.answer).toBe('Yours: 38%. wait complaints at 1 tracked competitor: median 10% of written reviews; wait for food city-wide: 12% of written reviews at 40 brands.');
	});

	it('says what is missing instead of guessing', () => {
		const ctx = context({ previous: { month: '2026-08', social: { postCount: 10, views: 100_000, engagements: 0, creators: 8, promotional: 0 } } });
		const [grew] = runPlaybook(observation({ key: 'avg_stars', metric: 'avg_stars', kind: 'dip' }), ctx);
		expect(grew).toMatchObject({ verdict: 'unknown' });
		expect(grew.answer).toContain('not stored');
		const [rank] = runPlaybook(observation({ key: 'search_rank:v1:pho', metric: 'search_rank', branchId: 'v1', query: 'pho' }), ctx);
		expect(rank).toBeUndefined();
	});

	it('answers the social questions: the posts that carried the month, the paid share and the buzz', () => {
		const ctx = context({ posts: [post('2026-09-11', 240_000), post('2026-09-20', 30_000, { author: 'ben', promotional: true }), post('2026-09-21', 30_000, { author: 'cem' })] });
		ctx.data.social.promotional = 1;
		const checks = runPlaybook(observation({ key: 'views', metric: 'views', kind: 'spike' }), ctx);
		expect(checks[0]).toMatchObject({ verdict: 'supports', resolution: 'day' });
		expect(checks[0].answer).toContain("The top post holds 80% of the month's 300k views");
		expect(checks[1].answer).toBe('1 of 4 posts were paid or gifted (25%); 1 of 10 in August 2026.');
		expect(checks[2]).toMatchObject({ verdict: 'unknown' });
	});

	it('answers a search rank move with who moved above and the openings nearby', () => {
		const ctx = context(
			{
				branches: [
					{
						venueId: 'v1',
						name: 'Chén Chè',
						social: { postCount: 0, views: 0, engagements: 0, creators: 0 },
						reviews: { count: 0, written: 0, praise: {}, complaints: {} },
						ratingTrend: [],
						neighbours: [],
						searchRanks: [{ query: 'pho mitte', rank: 4, results: 20, top: [{ name: 'Pho Haus', isVenue: false }, { name: 'Monsieur Vuong', isVenue: false }, { name: 'District Mot', isVenue: false }, { name: 'Chén Chè', isVenue: true }], history: [{ month: '2026-08', rank: 1 }] }],
						neighbourhood: { changes: { from: '2026-07', to: '2026-09', district: 'Mitte', opened: 1, closed: 0, reopened: 0, venues: [{ venueId: 'n', name: 'Pho Haus', kind: 'opened', date: '2026-08-20', sameStreet: false, source: 'posts' }] } },
					},
				],
			},
			{ previousData: { branches: [{ venueId: 'v1', searchRanks: [{ query: 'pho mitte', rank: 1, results: 20, top: [{ name: 'Chén Chè', isVenue: true }, { name: 'Monsieur Vuong', isVenue: false }, { name: 'District Mot', isVenue: false }], history: [] }] } as never] } },
		);
		const checks = runPlaybook(observation({ key: 'search_rank:v1:pho mitte', metric: 'search_rank', kind: 'rank_move', branchId: 'v1', query: 'pho mitte', from: 1, to: 4, change: 3 }), ctx);
		expect(checks[0]).toMatchObject({ verdict: 'supports' });
		expect(checks[0].answer).toContain('New in the top ten since August 2026: Pho Haus');
		expect(checks[1]).toMatchObject({ verdict: 'supports' });
		expect(checks[1].answer).toContain('Pho Haus (from a post)');
		expect(checks[1].answer).toContain("Pho Haus now in this search's top ten");
	});
});
