import { describe, expect, it } from '@jest/globals';

import type { TestClaim } from 'src/modules/statements/tests/factories/statement.factory.js';
import type { StatementView } from 'src/modules/statements/util/statement-views.js';
import { seedIndex } from 'src/modules/topics/tests/factories/topic.factory.js';
import { termKey } from 'src/modules/venues/util/dishes.js';

import {
	articleTitle,
	groupChanges,
	compareMonths,
	excerpt,
	ratingTrend,
	selectNearbyCreators,
	summarizeCompetitor,
	summarizePrevious,
	summarizeReport,
	SummaryMention,
	SummaryReview,
} from '../util/summarize-report.js';
import { said } from './factories/statement-like.factory.js';

const index = seedIndex();

/** What a source says, as agents A and B leave it: its claims with their parts (`said`) */
interface Said {
	claims?: TestClaim[];
}

const mention = ({
	claims = [{ text: 'great chicken', sentiment: 'positive', aspect: 'food' }, { foods: ['Half chicken'] }],
	...overrides
}: Partial<SummaryMention> & Said): SummaryMention => ({
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
	statements: said(index, claims),
	...overrides,
});

let reviewCount = 0;
const review = ({ claims = [], ...overrides }: Partial<SummaryReview> & Said): SummaryReview => ({
	reviewId: `r${++reviewCount}`,
	publishedAt: new Date('2026-09-15T12:00:00Z'),
	statements: said(index, claims),
	...overrides,
});

const VENUE = { id: 'v1', name: 'Chén Chè', district: 'Mitte' };

describe('summarizeReport', () => {
	it("keeps the venue's own posts out of the word-of-mouth numbers", () => {
		const data = summarizeReport({
			aspects: index,
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

	it('counts a post that names the venue twice once, and each root once per post', () => {
		const data = summarizeReport({
			aspects: index,
			venue: VENUE,
			month: '2026-09',
			mentions: [mention({}), mention({ claims: [{ text: 'cosy', sentiment: 'positive', aspect: 'vibe' }] })],
			reviews: [],
		});
		expect(data.social.postCount).toBe(1);
		expect(data.social.praise).toEqual({ food: 1, vibe: 1 });
	});

	it("keeps a post's neutral and mixed claims as noted, counted as neither praise nor complaint", () => {
		const data = summarizeReport({
			aspects: index,
			venue: VENUE,
			month: '2026-09',
			mentions: [
				mention({
					claims: [
						{ text: 'fries for 10 euros', sentiment: 'neutral', aspect: 'price_level', amount: 10, unit: 'money', foods: ['fries'] },
						{ text: 'good but pricey', sentiment: 'mixed', aspect: 'value_for_money' },
					],
				}),
			],
			reviews: [],
		});
		expect(data.social.praise).toEqual({});
		expect(data.social.complaints).toEqual({});
		expect(data.posts[0].noted).toEqual([
			{ topic: 'price', theme: 'price_level', detail: 'fries for 10 euros' },
			{ topic: 'price', theme: 'value_for_money', detail: 'good but pricey' },
		]);
		// The wording a neutral claim names is a dish of the post, as the claim came across
		expect(data.posts[0].dishes).toEqual([{ name: 'fries', sentiment: 'neutral' }]);
		expect(data.dishes).toEqual([{ name: 'fries', count: 1, positive: 0, negative: 0 }]);
		const plain = summarizeReport({ aspects: index, venue: VENUE, month: '2026-09', mentions: [mention({})], reviews: [] });
		expect(plain.posts[0].noted).toBeUndefined();
	});

	it('summarizes reviews: stars, replies, changes per review and the critical ones', () => {
		const data = summarizeReport({
			aspects: index,
			venue: VENUE,
			month: '2026-09',
			mentions: [],
			reviews: [
				review({ stars: 5, text: 'Lovely', ownerResponse: 'Thanks!' }),
				review({
					stars: 1,
					text: 'New owner, worse food',
					claims: [
						{ text: 'new owner', change: true },
						{ text: 'food got worse', change: true },
					],
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
		// Under no aspect yet: together, under "Other changes"
		expect(data.reviews.changeThemes).toEqual([
			{ label: 'Other changes', reviews: 1, details: ['new owner', 'food got worse'] },
		]);
		expect(data.reviews.critical).toEqual([
			{ stars: 1, text: 'New owner, worse food', replied: false },
		]);
		expect(data.reviews.stars.find(s => s.stars === 5)?.count).toBe(1);
	});

	it('counts reviews per root, not complaints, and splits 5 stars from the rest', () => {
		const complaint = (text: string): TestClaim => ({ text, sentiment: 'negative', aspect: 'service' });
		const data = summarizeReport({
			aspects: index,
			venue: VENUE,
			month: '2026-09',
			mentions: [],
			reviews: [
				review({
					stars: 1,
					text: 'Rude sommelier',
					claims: [complaint('rude'), complaint('spilled wine'), complaint('no help choosing')],
				}),
				review({ stars: 4, text: 'Slow', claims: [complaint('slow')] }),
				review({ stars: 5, text: 'Great meat', claims: [{ text: 'juicy meat', sentiment: 'positive', aspect: 'food' }] }),
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
		expect(data.reviews.split.belowFive.complaintDetails[0]).toEqual({ topic: 'service', theme: 'service', detail: 'rude' });
	});

	// An aspect counts once per source, like a root; a claim about no aspect counts under neither
	it('counts aspects per source, and a claim about no aspect under none', () => {
		const charge = (text: string): TestClaim => ({ text, sentiment: 'negative', aspect: 'extra_charges' });
		const data = summarizeReport({
			aspects: index,
			venue: VENUE,
			month: '2026-09',
			mentions: [],
			reviews: [
				review({ stars: 2, text: 'Extras', claims: [charge('charged for water'), charge('the sauce costs extra')] }),
				review({
					stars: 3,
					text: 'Extras and dear',
					claims: [charge('a service fee on the bill'), { text: 'expensive', sentiment: 'negative', aspect: 'price_level' }],
				}),
			],
		});
		expect(data.reviews.complaints).toEqual({ price: 2 });
		expect(data.reviews.complaintThemes).toEqual({ extra_charges: 2, price_level: 1 });
		expect(data.reviews.split.belowFive.complaintThemes).toEqual({ extra_charges: 2, price_level: 1 });

		const none = summarizeReport({
			aspects: index,
			venue: VENUE,
			month: '2026-09',
			mentions: [],
			reviews: [review({ stars: 2, text: 'Dear', claims: [{ text: 'expensive', sentiment: 'negative' }] })],
		});
		expect([none.reviews.complaints, none.reviews.complaintThemes]).toEqual([{}, {}]);
		// Kept as said: the report's copy files it under `other`
		expect(none.reviews.split.belowFive.complaintDetails).toEqual([{ topic: 'other', detail: 'expensive' }]);
	});

	// A wording a claim names is one dish of that source, with the claim's sentiment
	it('counts a dish a claim names once, with how the claim came across', () => {
		const data = summarizeReport({
			aspects: index,
			venue: VENUE,
			month: '2026-09',
			mentions: [],
			reviews: [
				review({
					stars: 2,
					text: 'Pricey burger',
					claims: [{ text: 'the burger is pricey', sentiment: 'negative', aspect: 'price_level', foods: ['burger'] }],
				}),
			],
		});
		expect(data.dishes).toEqual([{ name: 'burger', count: 1, positive: 0, negative: 1 }]);
	});

	it('merges dishes from posts and reviews by name', () => {
		const data = summarizeReport({
			aspects: index,
			venue: VENUE,
			month: '2026-09',
			mentions: [mention({})],
			reviews: [review({ stars: 2, claims: [{ foods: ['half chicken'], sentiment: 'negative' }] })],
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
			aspects: index,
			venue: VENUE,
			month: '2026-09',
			mentions: [mention({ claims: [{ foods: ['Burgers'] }, { foods: ['burger'] }, { foods: ['Fries'] }] })],
			reviews: [review({ claims: [{ foods: ['burger'], sentiment: 'negative' }, { foods: ['French fries'] }] })],
		});
		expect(data.dishes.map(d => [d.name, d.count])).toEqual([
			['Burgers', 2],
			['Fries', 1],
			['French fries', 1],
		]);
		expect(
			['cookies', 'Cookie', 'fries', 'fry', 'kebabs', 'hummus', 'Glass', 'Ribs'].map(termKey),
		).toEqual(['cooky', 'cooky', 'fry', 'fry', 'kebab', 'hummus', 'glass', 'rib']);
	});

	it('cuts a competitor down to what a report compares, and passes competitors through', () => {
		const competitorData = summarizeReport({
			aspects: index,
			venue: { id: 'v2', name: 'Rüyam', rating: 4.8 },
			month: '2026-09',
			mentions: [mention({ views: 5000 })],
			reviews: [
				review({
					stars: 2,
					text: 'Long queue',
					claims: [{ text: 'long queue', sentiment: 'negative', aspect: 'wait' }],
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
			aspects: index,
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
	it('lists every review newest first, with a capped excerpt and its roots', () => {
		const long = `${'Very good food and friendly staff. '.repeat(10)}End.`;
		const data = summarizeReport({
			aspects: index,
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
					claims: [
						{ text: 'slow', sentiment: 'negative', aspect: 'wait' },
						{ text: 'very slow', sentiment: 'negative', aspect: 'wait_for_food' },
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
			aspects: index,
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
		summarizeReport({ venue: VENUE, month: '2026-08', mentions, reviews, aspects: index });

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
			// The dishes named, for the analysis's dish shifts
			dishes: [{ name: 'Half chicken', count: 1 }],
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
			aspects: index,
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

	it('groups noticed changes by what changed, a review once per aspect', () => {
		const filed = (aspect: string, text: string): StatementView => ({
			text,
			sentiment: 'neutral',
			kind: 'change',
			aspect,
			root: index.rootOf(aspect)!,
		});
		expect(
			groupChanges(
				[
					[filed('portion_size', 'burgers are getting smaller'), filed('portion_size', 'made smaller')],
					[filed('portion_size', 'Burgers are smaller than before'), filed('ownership', 'new owner')],
					[filed('portion_size', 'made smaller'), { text: 'new menu', sentiment: 'neutral', kind: 'change' }],
					[filed('other', 'new kebab shop'), filed('interior', 'renovated')],
				],
				index,
			),
		).toEqual([
			{
				theme: 'portion_size',
				label: 'Portion size',
				reviews: 3,
				details: ['burgers are getting smaller', 'made smaller', 'Burgers are smaller than before'],
			},
			{ theme: 'interior', label: 'Interior', reviews: 1, details: ['renovated'] },
			{ theme: 'ownership', label: 'Ownership', reviews: 1, details: ['new owner'] },
			// A root (a change "about something else, nothing finer"), then the changes under no aspect, last
			{ theme: 'other', label: 'Other', reviews: 1, details: ['new kebab shop'] },
			{ label: 'Other changes', reviews: 1, details: ['new menu'] },
		]);
	});
});

describe('articleTitle', () => {
	it("takes a blog article's first paragraph, the title the blog scrape wrote", () => {
		expect(articleTitle('blog', 'Die besten Döner in  Kreuzberg\n\nWir haben getestet …')).toBe(
			'Die besten Döner in Kreuzberg',
		);
	});

	it('cuts a long one and leaves other platforms without one', () => {
		expect(articleTitle('blog', 'x'.repeat(300))).toHaveLength(160);
		expect(articleTitle('tiktok', 'Best döner\n\nso good')).toBeUndefined();
		expect(articleTitle('blog', null)).toBeUndefined();
	});
});
