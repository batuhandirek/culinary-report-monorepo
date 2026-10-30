import { describe, expect, it } from '@jest/globals';

import { type AnsweredPoint, feedbackRows } from 'src/modules/feedback/util/feedback-rows.js';

import type { ReportAnalysis } from '../interfaces/report-analysis.interface.js';
import type { ReportData } from '../interfaces/report-data.interface.js';
import { editorPack, packGaps, packKeys } from '../util/editor-pack.js';
import type { PromptScope } from '../util/report-sections.js';
import { summarizeReport, type SummaryMention, type SummaryReview } from '../util/summarize-report.js';
import { seedIndex } from 'src/modules/topics/tests/factories/topic.factory.js';

const index = seedIndex();
const said = (praise: AnsweredPoint[] = [], complaints: AnsweredPoint[] = [], changes: string[] = []) =>
	feedbackRows({ praise, complaints, dishes: [], changes }, { asked: true, aspects: index });

const mention = (overrides: Partial<SummaryMention>): SummaryMention => ({
	postId: 'p1',
	platform: 'tiktok',
	url: 'https://tiktok.com/x',
	author: 'navito',
	authorFans: 492700,
	postedAt: new Date('2026-09-23T12:00:00Z'),
	views: 626500,
	likes: 10,
	comments: 2,
	saves: 3,
	shares: 1,
	isAd: false,
	isPromotional: false,
	visited: true,
	sentiment: 'positive',
	summary: 'Juicy chicken, praise for the owner.',
	feedback: said([{ topic: 'food', theme: 'seasoning', detail: 'juicy, marinated chicken' }]),
	...overrides,
});

let n = 0;
const review = (overrides: Partial<SummaryReview>): SummaryReview => ({
	reviewId: `r${++n}`,
	publishedAt: new Date('2026-09-15T12:00:00Z'),
	stars: 5,
	text: 'Great.',
	feedback: said([{ topic: 'food', theme: 'taste', detail: 'great chicken' }]),
	...overrides,
});

const FULL: PromptScope = { social: true, reviews: true, stars: true, branches: true, analysis: 3 };

/** A three-branch brand's month, as `summarizeReport` and the build shape it. */
const data = (): ReportData => {
	const summary = summarizeReport({
		aspects: index,
		venue: { id: 'v1', name: 'Nhas City Chicken', district: 'Mitte' },
		month: '2026-09',
		mentions: [
			mention({}),
			mention({ postId: 'p2', author: 'traitic', authorFans: 460, views: 169955, sentiment: 'negative', summary: 'Says the owner is under investigation.', feedback: said([], [{ topic: 'other', theme: 'other', detail: 'owner allegedly involved in a case' }]) }),
			mention({ postId: 'own', author: 'nhascitychicken1993', own: true, views: 990414, summary: 'Our chicken.' }),
		],
		reviews: [
			review({ branch: 'Torstraße 125' }),
			review({ branch: 'Sonnenallee 73', stars: 4, text: 'Pricier than the other branches.', feedback: said([], [{ topic: 'price', theme: 'price_level', detail: 'more expensive than other branches' }]) }),
			review({ branch: 'Torstraße 125', stars: 1, text: 'Not what you used to be.', feedback: said([], [{ topic: 'food', theme: 'quality_change', detail: 'quality declined' }], ['quality declined']) }),
			review({ branch: 'Torstraße 125' }),
			review({ branch: 'Sonnenallee 73' }),
		],
		previous: {
			month: '2026-08',
			social: { postCount: 1, views: 197100, engagements: 13604, creators: 1, promotional: 0 },
			reviews: { count: 278, written: 163, avgStars: 4.6, replyRate: 0 },
			actions: [{ title: 'Answer reviews', text: 'Reply to the critical ones.' }],
		},
	});
	const { venue: _venue, ...rest } = summary;
	const branch = (venueId: string, street: string, district: string) => ({
		venueId,
		name: 'Nhas City Chicken',
		street,
		district,
		rating: 4.7,
		reviewsCount: 2531,
		social: { postCount: 2, views: 627108, engagements: 1, creators: 2 },
		reviews: { count: 3, written: 3, avgStars: 4.8, replyRate: 0, praise: { food: 2 }, complaints: { food: 1 } },
		ratingTrend: [],
		neighbours: [{ venueId: 'n1', name: 'Mezame Matcha', category: 'Tea house', posts: 9, views: 874247 }],
		searchRanks: [{ query: 'fried chicken Mitte', rank: 1, results: 10, top: [{ name: 'Nhas City Chicken', isVenue: true }, { name: 'Wondeo Chikin', isVenue: false }], history: [] }],
	});
	return {
		brand: { id: 'b1', name: 'Nhas City Chicken', category: 'Chicken restaurant', brandOnlyPosts: 1 },
		branches: [branch('v1', 'Torstraße 125', 'Mitte'), { ...branch('v2', 'Sonnenallee 73', 'Neukölln'), searchRanks: undefined }],
		...rest,
		competitors: [
			{ venueId: 'c1', name: 'City Chicken', social: { postCount: 1, views: 692900, engagements: 0, creators: 1 }, reviewsTracked: true, reviews: { count: 8, written: 7, avgStars: 4.6, replyRate: 0, praise: { food: 5 }, complaints: {} } },
			{ venueId: 'c2', name: 'Ya Hala', social: { postCount: 0, views: 0, engagements: 0, creators: 0 }, reviewsTracked: false, reviews: { count: 0, written: 0, praise: {}, complaints: {} } },
		],
		comments: {
			comments: 79,
			intents: { disagreement: 11, question: 5 },
			posts: [{ postId: 'p1', url: 'https://tiktok.com/x', author: 'navito', views: 626500, comments: 79, intents: { disagreement: 11, question: 5, confirmation: 11 }, disagreement: 'Several call it overpriced and hype.' }],
			questions: [{ topic: 'other', count: 7, example: 'Where does the chicken come from?' }],
		},
		press: { features: 1, listicles: 0, passing: 0, items: [{ url: 'https://derwesten.de/x', title: 'Hype in NRW', outlet: 'DerWesten', kind: 'feature', publishedAt: '2026-09-28', summary: 'Profiles the hype and discusses the owner.' }] },
	};
};

describe('editorPack', () => {
	it("hands the editor the month as material: posts with their comments, the press, what guests noticed changed with the branch, each place's own month", () => {
		const pack = editorPack(data(), FULL, index);
		expect(pack.month).toBe('September 2026');
		expect(pack.inNumbers).toMatchObject({ postsByOthers: 2, ownPosts: 1, ownPostsViews: 990414, reviews: 5, writtenReviews: 5, answeredByOwner: '0 of 5' });
		expect(pack.inNumbers.monthBefore).toMatchObject({ month: 'August 2026', postsByOthers: 1, reviews: 278 });
		// Most viewed first, each with what it said and what the comments under it said
		expect(pack.postsByOthers!.map(p => p.creator)).toEqual(['@navito on TikTok, 492700 followers', '@traitic on TikTok, 460 followers']);
		expect(pack.postsByOthers![0].commentsUnderIt).toMatchObject({ read: 79, disagreed: 11, whatTheDisagreeingOnesSay: 'Several call it overpriced and hype.' });
		// A point filed at a root is named by the root alone
		expect(pack.postsByOthers![1].complaints).toEqual(['other: owner allegedly involved in a case']);
		expect(pack.questionsViewersKeptAsking).toEqual(['"Where does the chicken come from?" (7 times)']);
		expect(pack.ownPosts!.posts[0]).toMatchObject({ views: 990414, account: expect.stringContaining('@nhascitychicken1993 on TikTok') });
		expect(pack.press![0]).toMatchObject({ outlet: 'DerWesten', kind: 'feature' });
		// Counts stay counts, never percentages; the branch travels with a review
		expect(pack.reviews!.praisedMost[0]).toBe('food / taste: 3 of 5 written reviews');
		expect(pack.weeksStartOnMondays).toEqual(['2026-08-31', '2026-09-07', '2026-09-14', '2026-09-21', '2026-09-28']);
		expect(pack.reviews!.whatGuestsNoticedChanged).toEqual([{ stars: 1, branch: 'Torstraße 125', changes: ['quality declined'] }]);
		expect(pack.reviews!.criticalReviews[0]).toMatchObject({ stars: 1, branch: 'Torstraße 125', text: 'Not what you used to be.' });
		expect(JSON.stringify(pack.reviews)).not.toMatch(/\d+%/);
		// Each place on its own
		expect(pack.places.map(p => p.street)).toEqual(['Torstraße 125', 'Sonnenallee 73']);
		expect(pack.places[0].googleMapsSearches![0]).toMatchObject({ search: 'fried chicken Mitte', yourPlace: 1, topThree: ['Nhas City Chicken (you)', 'Wondeo Chikin'] });
		expect(pack.places[0].thisMonth).toMatchObject({ postsByOthersNamingIt: 2, reviews: 3 });
		expect(pack.competitors[1].reviewsThisMonth).toBe('not tracked: nothing to compare its reviews with');
		expect(pack.actionsSuggestedLastMonth).toEqual([{ title: 'Answer reviews', text: 'Reply to the critical ones.' }]);
		expect(pack.gaps).toEqual(expect.arrayContaining([expect.stringContaining('Ya Hala')]));
	});

	it('leaves out what the sections leave out, and keeps the moves whatever they show', () => {
		const analysis: ReportAnalysis = {
			builtAt: '2026-10-28T00:00:00Z',
			observations: [{ key: 'views', metric: 'views', kind: 'spike', month: '2026-09', label: 'Views', source: 'TikTok', unit: 'views', from: 197100, to: 1187886, change: 990786, comparedWith: 'August 2026', resolution: 'month', series: [], sentence: 'Views went from 197.1k to 1.2M.', score: 1, checks: [{ question: 'Which posts carried the month?', answer: 'One post holds most of it.', verdict: 'supports', resolution: 'day' }, { question: 'Reviews?', answer: 'Below the floors.', verdict: 'unknown', resolution: 'week' }] }],
			investigations: [{ key: 'views', whatHappened: 'Views rose.', hypotheses: [{ reason: 'One post may have carried it.', confidence: 'likely', evidenceFor: [], evidenceAgainst: [] }], worthChecking: [] }],
			trace: { model: 'x', steps: [], toolCalls: 0, problems: [], durationMs: 0 },
		};
		const pack = editorPack(data(), { social: false, reviews: false, stars: false, branches: false, analysis: false }, index, analysis);
		expect(pack.postsByOthers).toBeUndefined();
		expect(pack.ownPosts).toBeUndefined();
		expect(pack.reviews).toBeUndefined();
		expect(pack.inNumbers).toEqual({ monthBefore: { month: 'August 2026' } });
		expect(pack.places[0].thisMonth).toBeUndefined();
		// The moves are material: the sentence and the answered checks only
		expect(pack.whatMovedAndWhy!.movesFound[0]).toEqual({ what: 'Views went from 197.1k to 1.2M.', checks: ['One post holds most of it.'] });
		expect(pack.whatMovedAndWhy!.investigated[0].possibleReasons).toEqual(['likely: One post may have carried it.']);
	});

	it('says the gaps plainly: reviews not read, a first report, accounts without a count', () => {
		const d = data();
		d.reviews.count = 0;
		delete d.previous;
		expect(packGaps(d, FULL)).toEqual(
			expect.arrayContaining([
				expect.stringMatching(/No Google review of September 2026 was read .* 5062 reviews on Google all time/),
				'A first report: there is no month before to compare with.',
				expect.stringContaining("own accounts' follower counts were not read"),
				'No Google Maps searches were tracked for Sonnenallee 73.',
			]),
		);
	});

	it('lists the camelCase field names a line must not quote', () => {
		const keys = packKeys(editorPack(data(), FULL, index));
		expect(keys).toEqual(expect.arrayContaining(['postsByOthers', 'inNumbers', 'whatTheDisagreeingOnesSay', 'ratingAgainstOthers']));
		expect(keys).not.toContain('press');
	});
});
