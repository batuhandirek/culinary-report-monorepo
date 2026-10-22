import { describe, expect, it } from '@jest/globals';

import {
	compareMonths,
	dishKey,
	excerpt,
	ratingTrend,
	selectNearbyCreators,
	summarizeCompetitor,
	summarizePrevious,
	summarizeReport,
	SummaryMention,
	SummaryReview,
} from '../util/summarize-report.js';

const mention = (overrides: Partial<SummaryMention>): SummaryMention => ({
	postId: 'p1',
	platform: 'tiktok',
	url: 'https://tiktok.com/x',
	author: 'creator',
	authorFans: 1000,
	postedAt: new Date('2026-09-10T12:00:00Z'),
	views: 1000,
	likes: 10,
	comments: 2,
	saves: 3,
	shares: 1,
	isAd: false,
	isPromotional: false,
	visited: true,
	sentiment: 'positive',
	summary: 'Great chicken.',
	praise: [{ topic: 'food', detail: 'great chicken' }],
	complaints: [],
	dishes: [{ name: 'Half chicken', sentiment: 'positive' }],
	...overrides,
});

let reviewCount = 0;
const review = (overrides: Partial<SummaryReview>): SummaryReview => ({
	reviewId: `r${++reviewCount}`,
	publishedAt: new Date('2026-09-15T12:00:00Z'),
	...overrides,
});

const VENUE = { id: 'v1', name: 'Chén Chè', district: 'Mitte' };

describe('summarizeReport', () => {
	it("keeps the venue's own posts out of the word-of-mouth numbers", () => {
		const data = summarizeReport({
			venue: VENUE,
			month: '2026-09',
			mentions: [
				mention({ postId: 'guest', author: 'si.an.truong', views: 4600 }),
				mention({ postId: 'own', author: 'chenche_berlin.0', views: 1000, own: true }),
			],
			reviews: [],
		});
		expect(data.social.postCount).toBe(1);
		expect(data.social.views).toBe(4600);
		expect(data.ownPosts.map(p => p.postId)).toEqual(['own']);
	});

	it('counts a post that names the venue twice once, and each topic once per post', () => {
		const data = summarizeReport({
			venue: VENUE,
			month: '2026-09',
			mentions: [mention({}), mention({ praise: [{ topic: 'vibe', detail: 'cosy' }] })],
			reviews: [],
		});
		expect(data.social.postCount).toBe(1);
		expect(data.social.praise).toEqual({ food: 1, vibe: 1 });
	});

	it('summarizes reviews: stars, replies, changes per review and the critical ones', () => {
		const data = summarizeReport({
			venue: VENUE,
			month: '2026-09',
			mentions: [],
			reviews: [
				review({ stars: 5, text: 'Lovely', ownerResponse: 'Thanks!' }),
				review({
					stars: 1,
					text: 'New owner, worse food',
					changes: ['new owner', 'food got worse'],
				}),
				review({ stars: 4, text: null }),
			],
		});
		expect(data.reviews.count).toBe(3);
		expect(data.reviews.avgStars).toBe(3.3);
		expect(data.reviews.replyRate).toBeCloseTo(1 / 3);
		expect(data.reviews.changes).toEqual([
			{ stars: 1, changes: ['new owner', 'food got worse'] },
		]);
		expect(data.reviews.critical).toEqual([
			{ stars: 1, text: 'New owner, worse food', replied: false },
		]);
		expect(data.reviews.stars.find(s => s.stars === 5)?.count).toBe(1);
	});

	it('counts reviews per topic, not complaint points, and splits 5 stars from the rest', () => {
		const data = summarizeReport({
			venue: VENUE,
			month: '2026-09',
			mentions: [],
			reviews: [
				review({
					stars: 1,
					text: 'Rude sommelier',
					complaints: [
						{ topic: 'service', detail: 'rude' },
						{ topic: 'service', detail: 'spilled wine' },
						{ topic: 'service', detail: 'no help choosing' },
					],
				}),
				review({ stars: 4, text: 'Slow', complaints: [{ topic: 'service', detail: 'slow' }] }),
				review({ stars: 5, text: 'Great meat', praise: [{ topic: 'food', detail: 'juicy meat' }] }),
				review({ stars: 5, text: null }),
			],
		});
		expect(data.reviews.complaints).toEqual({ service: 2 });
		expect(data.reviews.written).toBe(3);
		expect(data.reviews.split.fiveStar).toMatchObject({ count: 2, praise: { food: 1 } });
		expect(data.reviews.split.belowFive).toMatchObject({
			count: 2,
			complaints: { service: 2 },
		});
		expect(data.reviews.split.belowFive.complaintDetails).toHaveLength(4);
	});

	it('merges dishes from posts and reviews by name', () => {
		const data = summarizeReport({
			venue: VENUE,
			month: '2026-09',
			mentions: [mention({})],
			reviews: [review({ stars: 2, dishes: [{ name: 'half chicken', sentiment: 'negative' }] })],
		});
		expect(data.dishes[0]).toEqual({
			name: 'Half chicken',
			count: 2,
			positive: 1,
			negative: 1,
		});
	});

	it('folds English plurals per word, so "burgers" and "burger" are one dish', () => {
		const data = summarizeReport({
			venue: VENUE,
			month: '2026-09',
			mentions: [
				mention({
					dishes: [
						{ name: 'Burgers', sentiment: 'positive' },
						{ name: 'burger', sentiment: 'positive' },
						{ name: 'Fries', sentiment: 'positive' },
					],
				}),
			],
			reviews: [
				review({
					dishes: [
						{ name: 'burger', sentiment: 'negative' },
						{ name: 'French fries', sentiment: 'positive' },
					],
				}),
			],
		});
		expect(data.dishes.map(d => [d.name, d.count])).toEqual([
			['Burgers', 2],
			['Fries', 1],
			['French fries', 1],
		]);
		expect(
			['cookies', 'Cookie', 'fries', 'fry', 'kebabs', 'hummus', 'Glass', 'Ribs'].map(dishKey),
		).toEqual(['cooky', 'cooky', 'fry', 'fry', 'kebab', 'hummus', 'glass', 'rib']);
	});

	it('cuts a competitor down to what a report compares, and passes competitors through', () => {
		const competitorData = summarizeReport({
			venue: { id: 'v2', name: 'Rüyam', rating: 4.8 },
			month: '2026-09',
			mentions: [mention({ views: 5000 })],
			reviews: [
				review({
					stars: 2,
					text: 'Long queue',
					complaints: [{ topic: 'wait', detail: 'long queue' }],
				}),
			],
		});
		const competitor = summarizeCompetitor(competitorData, true);
		expect(competitor).toMatchObject({
			venueId: 'v2',
			name: 'Rüyam',
			rating: 4.8,
			reviewsTracked: true,
			social: { postCount: 1, views: 5000 },
			reviews: { count: 1, written: 1, complaints: { wait: 1 } },
		});

		const data = summarizeReport({
			venue: VENUE,
			month: '2026-09',
			mentions: [],
			reviews: [],
			competitors: [competitor],
		});
		expect(data.competitors.map(c => c.name)).toEqual(['Rüyam']);
	});
});

describe('reviews.list', () => {
	it('lists every review newest first, with a capped excerpt and its topics', () => {
		const long = `${'Very good food and friendly staff. '.repeat(10)}End.`;
		const data = summarizeReport({
			venue: VENUE,
			month: '2026-09',
			mentions: [],
			reviews: [
				review({ reviewId: 'old', publishedAt: new Date('2026-09-02'), stars: 4 }),
				review({
					reviewId: 'new',
					publishedAt: new Date('2026-09-28'),
					stars: 2,
					text: 'Original',
					textTranslated: long,
					language: 'de',
					ownerResponse: 'Sorry',
					complaints: [
						{ topic: 'wait', detail: 'slow' },
						{ topic: 'wait', detail: 'very slow' },
					],
				}),
				review({ reviewId: 'mid', publishedAt: new Date('2026-09-10'), text: 'Nice' }),
			],
		});
		expect(data.reviews.list.map(r => r.reviewId)).toEqual(['new', 'mid', 'old']);
		const [newest, mid, old] = data.reviews.list;
		expect(newest).toMatchObject({
			stars: 2,
			language: 'de',
			replied: true,
			complaints: ['wait'],
			praise: [],
		});
		expect(newest.excerpt!.length).toBeLessThanOrEqual(240);
		expect(newest.excerpt!.endsWith('…')).toBe(true);
		expect(mid.excerpt).toBe('Nice');
		expect(old.excerpt).toBeUndefined();
		expect(data.reviews.replyDrafts).toEqual([]);
	});

	it('leaves a short text alone and cuts a long one at a word', () => {
		expect(excerpt('  short  text ')).toBe('short text');
		expect(excerpt('aaaa bbbb cccc dddd', 12)).toBe('aaaa bbbb…');
	});
});

describe('creators', () => {
	it('groups posts by creator, most viewed first, with their flags', () => {
		const data = summarizeReport({
			venue: VENUE,
			month: '2026-09',
			mentions: [
				mention({ postId: 'a1', author: 'foodie', views: 100, visited: false }),
				mention({ postId: 'a2', author: 'Foodie', views: 900, url: 'https://t/a2' }),
				mention({ postId: 'b1', author: 'eats', views: 500, isPromotional: true }),
				mention({ postId: 'c1', author: 'eats', platform: 'instagram', views: 10 }),
				mention({ postId: 'own', author: 'chenche_berlin', views: 5000, own: true }),
			],
			reviews: [],
		});
		expect(data.creators).toEqual([
			expect.objectContaining({
				author: 'Foodie',
				posts: 2,
				views: 1000,
				visited: true,
				promotional: 0,
				url: 'https://t/a2',
			}),
			expect.objectContaining({ author: 'eats', platform: 'tiktok', promotional: 1 }),
			expect.objectContaining({ author: 'eats', platform: 'instagram' }),
		]);
	});

	it('picks nearby creators who skipped the venue, by followers, without neighbours’ own accounts', () => {
		const post = (o: Partial<Parameters<typeof selectNearbyCreators>[0][number]>) => ({
			postId: 'x',
			platform: 'tiktok' as const,
			url: 'https://t/x',
			author: 'someone',
			authorFans: 100,
			views: 100,
			venueName: 'Burgerme',
			category: 'Hamburger restaurant',
			...o,
		});
		const nearby = selectNearbyCreators(
			[
				post({ postId: 'p1', author: 'bigfoodie', authorFans: 90_000, venueName: 'Burgerme' }),
				post({ postId: 'p1', author: 'bigfoodie', authorFans: 90_000, venueName: 'Zola' }),
				post({ postId: 'p2', author: 'bigfoodie', authorFans: 90_000, venueName: 'Zola', views: 5000 }),
				post({ postId: 'p3', author: 'smallfoodie', authorFans: 2000 }),
				// Posted about the venue too
				post({ postId: 'p4', author: 'loyal', authorFans: 500_000 }),
				// The neighbour's own account
				post({ postId: 'p5', author: 'burgerme_berlin', authorFans: 300_000, own: true }),
				// Not a food venue
				post({ postId: 'p6', author: 'gymrat', category: 'Gym' }),
			],
			new Set(['tiktok:loyal']),
		);
		expect(nearby.map(c => c.author)).toEqual(['bigfoodie', 'smallfoodie']);
		expect(nearby[0]).toMatchObject({ posts: 2, views: 5100, venues: ['Zola', 'Burgerme'] });
	});
});

describe('previous month', () => {
	const month = (mentions: SummaryMention[], reviews: SummaryReview[]) =>
		summarizeReport({ venue: VENUE, month: '2026-08', mentions, reviews });

	it('is undefined when the month had neither posts nor reviews', () => {
		expect(summarizePrevious(month([], []))).toBeUndefined();
	});

	it('leaves reviews out when none were stored, and carries the actions', () => {
		const actions = [{ title: 'Answer reviews', text: 'Reply to every review.' }];
		const prev = summarizePrevious(month([mention({ views: 400 })], []), actions);
		expect(prev).toEqual({
			month: '2026-08',
			social: { postCount: 1, views: 400, engagements: 16, creators: 1, promotional: 0 },
			reviews: undefined,
			actions,
		});
	});

	it('computes the change of each KPI for the prompt', () => {
		const previous = summarizePrevious(
			month(
				[mention({ views: 1000 })],
				[review({ stars: 4, text: 'ok' }), review({ stars: 2, text: 'meh', ownerResponse: 'x' })],
			),
		);
		const data = summarizeReport({
			venue: VENUE,
			month: '2026-09',
			mentions: [mention({ postId: 'a', views: 1500 }), mention({ postId: 'b', views: 500 })],
			reviews: [
				review({ stars: 5, ownerResponse: 'x' }),
				review({ stars: 5, ownerResponse: 'x' }),
				review({ stars: 4, ownerResponse: 'x' }),
				review({ stars: 3 }),
			],
			previous,
		});
		const comparison = compareMonths(data)!;
		expect(comparison.month).toBe('August 2026');
		expect(comparison.socialMedia.views).toBe('from 1k to 2k (+1k, +100%)');
		expect(comparison.socialMedia.postsByOthers).toBe('from 1 to 2 (+1, +100%)');
		expect(comparison.googleReviews).toEqual({
			reviews: 'from 2 to 4 (+2, +100%)',
			avgStarsThisMonth: 'from 3.0 to 4.3 (+1.3)',
			replyRate: 'from 50% to 75% (+25 percentage points)',
		});
		expect(compareMonths({ ...data, previous: undefined })).toBeUndefined();
	});
});

describe('ratingTrend', () => {
	it('keeps the latest snapshot closing each month, up to the report month, six at most', () => {
		const snap = (snapshotDate: string, rating: number) => ({
			snapshotDate,
			rating,
			reviewsCount: 100,
		});
		const trend = ratingTrend(
			[
				snap('2026-02-02', 4.0), // closes January
				snap('2026-03-03', 4.1),
				snap('2026-04-02', 4.2),
				snap('2026-05-02', 4.3),
				snap('2026-06-02', 4.4),
				snap('2026-07-02', 4.5),
				snap('2026-08-02', 4.6),
				snap('2026-09-15', 4.65), // mid-September, replaced by the closing one
				snap('2026-10-02', 4.7), // closes September
				snap('2026-10-20', 4.8), // October: after the report month
				{ snapshotDate: '2026-09-01', rating: null, reviewsCount: null },
			],
			'2026-09',
		);
		// Each early-month snapshot closes the month before; August has none
		expect(trend.map(p => p.month)).toEqual([
			'2026-03',
			'2026-04',
			'2026-05',
			'2026-06',
			'2026-07',
			'2026-09',
		]);
		expect(trend.at(-1)).toEqual({
			month: '2026-09',
			date: '2026-10-02',
			rating: 4.7,
			reviewsCount: 100,
		});
	});
});
