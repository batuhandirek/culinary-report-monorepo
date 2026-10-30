import _ from 'lodash';

import {
	changesOf,
	complaintsOf,
	dishesOf,
	type FeedbackPointView,
	type FeedbackRowLike,
	praiseOf,
} from 'src/modules/feedback/util/feedback-rows.js';
import type { TopicIndex } from 'src/modules/topics/util/topics.js';
import type { FeedbackSentiment } from 'src/modules/venues/interfaces/feedback.interface.js';
import { monthName } from 'src/modules/venues/util/month.js';
import { isFoodVenue } from 'src/modules/venues/util/venue-names.js';

import type {
	ReportAspect,
	ReportChangeTheme,
	ReportCompetitor,
	ReportCreator,
	ReportData,
	ReportPoint,
	ReportPost,
	ReportPreviousMonth,
	ReportRatingPoint,
	ReportReviewGroup,
	ReportReviewItem,
} from '../interfaces/report-data.interface.js';

export interface SummaryMention {
	postId: string;
	platform: 'tiktok' | 'instagram' | 'blog';
	url: string;
	/** A blog article's headline (`articleTitle`) */
	title?: string;
	author?: string | null;
	authorFans?: number | null;
	/** By one of the brand's own accounts (`SocialAccount.brand`): listed apart, never counted as word of mouth */
	own?: boolean;
	postedAt: Date;
	views: number;
	likes: number;
	comments: number;
	saves: number;
	shares: number;
	isAd: boolean;
	isPromotional?: boolean | null;
	visited: boolean;
	sentiment: FeedbackSentiment;
	summary: string;
	/** What it says: its feedback rows */
	feedback: FeedbackRowLike[];
	/** It named the brand but no branch (the mention has no venue) */
	brandOnly?: boolean;
}

export interface SummaryReview {
	reviewId: string;
	publishedAt: Date;
	language?: string | null;
	stars?: number | null;
	text?: string | null;
	textTranslated?: string | null;
	ownerResponse?: string | null;
	/** What it says: its feedback rows (none before it is analysed), its noticed changes among them */
	feedback: FeedbackRowLike[];
	/** A chain's branch it is of (its street, else its name); absent for a one-branch brand */
	branch?: string;
}

/**
 * What the report's readers need of the aspect vocabulary (`TopicIndex`): which keys are aspects,
 * which are roots (a point "about price, nothing finer": what used to be a catch-all), and each
 * one's label, prompt label and root. The services fetch the index once per build and pass it down.
 */
export type ReportAspects = Pick<TopicIndex, 'isAspect' | 'isRoot' | 'label' | 'promptLabel' | 'rootOf'>;

/** The vocabulary as a report keeps it (`ReportData.aspects`): every aspect, roots first, with its label and root. */
export const reportAspects = (index: Pick<TopicIndex, 'aspects' | 'rootOf'>): ReportAspect[] =>
	index.aspects.map(t => ({ key: t.key, label: t.label, root: index.rootOf(t.key) ?? t.key }));

/**
 * Noticed changes by what changed: per theme, the reviews noticing it (a review once) and how they
 * put it ("burgers are getting smaller", "made smaller": portion size), the most noticed first;
 * a root ("Other", "Food") and the changes not filed yet last. `aspects` names each theme.
 */
export const groupChanges = (reviews: FeedbackPointView[][], aspects: Pick<ReportAspects, 'label' | 'isRoot'>): ReportChangeTheme[] => {
	const groups = new Map<string, { theme?: string; reviews: number; details: Map<string, string> }>();
	for (const changes of reviews) {
		const seen = new Set<string>();
		for (const change of changes) {
			const key = change.theme ?? '';
			const group = groups.get(key) ?? { ...(change.theme && { theme: change.theme }), reviews: 0, details: new Map<string, string>() };
			if (!seen.has(key)) {
				seen.add(key);
				group.reviews++;
			}
			if (!group.details.has(change.detail.toLowerCase())) group.details.set(change.detail.toLowerCase(), change.detail);
			groups.set(key, group);
		}
	}
	return _.orderBy(
		[...groups.values()].map(g => ({
			...(g.theme && { theme: g.theme }),
			label: g.theme ? aspects.label(g.theme) : 'Other changes',
			reviews: g.reviews,
			details: [...g.details.values()],
		})),
		[g => (!g.theme ? 2 : aspects.isRoot(g.theme) ? 1 : 0), g => g.reviews, g => g.label],
		['asc', 'desc', 'asc'],
	);
};

/** Topic → how many sources (posts or reviews) raised it: a review listing three service complaints counts once. */
const countSources = (sources: FeedbackPointView[][]): Record<string, number> =>
	_.countBy(sources.flatMap(points => _.uniq(points.map(p => p.topic))));

/**
 * Theme → how many sources raised it, once per source: "prices went up" and "dürüm now €9.50"
 * in one review are one review raising `price_increase`. Undefined when any point has no theme
 * (stored before themes and not backfilled yet), so a count is whole or absent, never short.
 */
export const countThemes = (sources: FeedbackPointView[][]): Record<string, number> | undefined => {
	if (sources.some(ps => ps.some(p => !p.theme))) return undefined;
	return _.countBy(sources.flatMap(ps => _.uniq(ps.map(p => p.theme!))));
};

const DETAILS_PER_GROUP = 30;

const EXCERPT_LENGTH = 240;
const CREATORS_SHOWN = 8;

/** At most `max` characters, cut at a word where one is near, with an ellipsis. */
export const excerpt = (text: string, max = EXCERPT_LENGTH): string => {
	const clean = text.replace(/\s+/g, ' ').trim();
	if (clean.length <= max) return clean;
	const cut = clean.slice(0, max - 1);
	const space = cut.lastIndexOf(' ');
	return `${(space > max * 0.7 ? cut.slice(0, space) : cut).trimEnd()}…`;
};

const toReviewItem = (r: SummaryReview): ReportReviewItem => {
	const text = r.textTranslated || r.text;
	return {
		reviewId: r.reviewId,
		...(r.branch && { branch: r.branch }),
		publishedAt: r.publishedAt.toISOString(),
		stars: r.stars ?? undefined,
		excerpt: text ? excerpt(text) : undefined,
		language: r.language ?? undefined,
		replied: !!r.ownerResponse,
		praise: _.uniq(praiseOf(r.feedback).map(p => p.topic)),
		complaints: _.uniq(complaintsOf(r.feedback).map(p => p.topic)),
	};
};

/** One row per creator (platform and handle), most viewed first. */
export const summarizeCreators = (posts: ReportPost[]): ReportCreator[] =>
	Object.values(
		_.groupBy(
			posts.filter(p => p.author),
			p => `${p.platform}:${p.author!.toLowerCase()}`,
		),
	)
		.map(group => {
			const top = _.maxBy(group, p => p.views)!;
			return {
				author: top.author!,
				platform: top.platform,
				authorFans: _.max(group.map(p => p.authorFans)),
				posts: group.length,
				views: _.sumBy(group, p => p.views),
				promotional: group.filter(p => p.promotional).length,
				visited: group.some(p => p.visited),
				url: top.url,
			};
		})
		.sort((a, b) => b.views - a.views)
		.slice(0, CREATORS_SHOWN);


const reviewGroup = (reviews: SummaryReview[]): ReportReviewGroup => {
	const praise = reviews.map(r => praiseOf(r.feedback));
	const complaints = reviews.map(r => complaintsOf(r.feedback));
	return {
		count: reviews.length,
		written: reviews.filter(r => r.textTranslated || r.text).length,
		praise: countSources(praise),
		complaints: countSources(complaints),
		praiseThemes: countThemes(praise),
		complaintThemes: countThemes(complaints),
		praiseDetails: praise.flat().slice(0, DETAILS_PER_GROUP),
		complaintDetails: complaints.flat().slice(0, DETAILS_PER_GROUP),
	};
};

const ARTICLE_TITLE_CHARS = 160;

/**
 * A blog article's headline: the first paragraph of its stored text, which the blog scrape
 * writes as the title, then the article. Undefined for other platforms or an empty text.
 */
export const articleTitle = (platform: SummaryMention['platform'], text?: string | null) => {
	if (platform !== 'blog' || !text) return undefined;
	const first = text.split(/\n\s*\n/, 1)[0].replace(/\s+/g, ' ').trim();
	if (!first) return undefined;
	return first.length > ARTICLE_TITLE_CHARS ? `${first.slice(0, ARTICLE_TITLE_CHARS - 1).trimEnd()}…` : first;
};
const toPost = (m: SummaryMention): ReportPost => ({
	postId: m.postId,
	platform: m.platform,
	url: m.url,
	...(m.title && { title: m.title }),
	author: m.author ?? undefined,
	authorFans: m.authorFans ?? undefined,
	postedAt: m.postedAt.toISOString(),
	views: m.views,
	engagements: m.likes + m.comments + m.saves + m.shares,
	promotional: !!(m.isAd || m.isPromotional),
	visited: m.visited,
	sentiment: m.sentiment,
	summary: m.summary,
	praise: praiseOf(m.feedback),
	complaints: complaintsOf(m.feedback),
	dishes: dishesOf(m.feedback).map(d => ({ name: d.name, sentiment: d.sentiment })),
});

/** Who a summary is of: a brand, one of its branches, or a competitor. */
export interface SummaryVenue {
	id: string;
	name: string;
	category?: string;
	district?: string;
	rating?: number;
	reviewsCount?: number;
}

/** A month summed up from mentions and reviews: the report's brand-wide sections, and `venue`. */
export type ReportSummary = { venue: SummaryVenue } & Pick<
	ReportData,
	| 'month'
	| 'previous'
	| 'social'
	| 'posts'
	| 'ownPosts'
	| 'reviews'
	| 'dishes'
	| 'competitors'
	| 'creators'
	| 'creatorsNearby'
>;

/**
 * What a month's report shows, from the mentions and reviews of a brand (or one place). Its own
 * accounts' posts are split off: they are not word of mouth. `aspects` names the noticed changes'
 * themes (`groupChanges`); the counts keep the keys.
 */
export const summarizeReport = (input: {
	venue: SummaryVenue;
	month: string;
	mentions: SummaryMention[];
	reviews: SummaryReview[];
	aspects: Pick<ReportAspects, 'label' | 'isRoot'>;
	competitors?: ReportCompetitor[];
	creatorsNearby?: ReportData['creatorsNearby'];
	previous?: ReportData['previous'];
}): ReportSummary => {
	const own = input.mentions.filter(m => m.own);
	const others = input.mentions.filter(m => !m.own);
	// A post that names the venue twice counts once, and so does its feedback
	const posts = _.uniqBy(others, m => m.postId);
	const byPost = Object.values(_.groupBy(others, m => m.postId));
	const postPraise = byPost.map(ms => ms.flatMap(m => praiseOf(m.feedback)));
	const postComplaints = byPost.map(ms => ms.flatMap(m => complaintsOf(m.feedback)));

	// Each post or review counts a dish once: a source's rows give each dish once (`dishesOf`)
	const dishSources = [
		...byPost.map(ms => dishesOf(ms.flatMap(m => m.feedback))),
		...input.reviews.map(r => dishesOf(r.feedback)),
	];
	const dishes = Object.values(_.groupBy(dishSources.flat(), d => d.key))
		.map(group => ({
			name: group[0].name,
			count: group.length,
			positive: group.filter(d => d.sentiment === 'positive').length,
			negative: group.filter(d => d.sentiment === 'negative').length,
		}))
		.sort((a, b) => b.count - a.count)
		.slice(0, 15);

	const reviews = input.reviews;
	const fiveStar = reviews.filter(r => r.stars === 5);
	const belowFive = reviews.filter(r => typeof r.stars === 'number' && r.stars < 5);
	const rated = reviews.filter(r => typeof r.stars === 'number');
	const sentiment = _.countBy(posts, m => m.sentiment);
	const reportPosts = _.orderBy(posts.map(toPost), p => p.views, 'desc');

	return {
		venue: input.venue,
		month: input.month,
		previous: input.previous,
		social: {
			postCount: posts.length,
			tiktokCount: posts.filter(p => p.platform === 'tiktok').length,
			instagramCount: posts.filter(p => p.platform === 'instagram').length,
			views: _.sumBy(posts, p => p.views),
			engagements: _.sumBy(posts, p => p.likes + p.comments + p.saves + p.shares),
			creators: _.uniq(posts.map(p => p.author).filter(Boolean)).length,
			promotional: posts.filter(p => p.isAd || p.isPromotional).length,
			sentiment: {
				positive: sentiment.positive ?? 0,
				mixed: sentiment.mixed ?? 0,
				neutral: sentiment.neutral ?? 0,
				negative: sentiment.negative ?? 0,
			},
			praise: countSources(postPraise),
			complaints: countSources(postComplaints),
			praiseThemes: countThemes(postPraise),
			complaintThemes: countThemes(postComplaints),
		},
		posts: reportPosts,
		ownPosts: _.orderBy(_.uniqBy(own, m => m.postId).map(toPost), p => p.views, 'desc'),
		reviews: {
			count: reviews.length,
			written: reviews.filter(r => r.textTranslated || r.text).length,
			avgStars:
				rated.length ? Math.round(_.meanBy(rated, r => r.stars!) * 10) / 10 : undefined,
			replyRate:
				reviews.length ?
					reviews.filter(r => r.ownerResponse).length / reviews.length
				:	undefined,
			stars: [5, 4, 3, 2, 1].map(stars => ({
				stars,
				count: reviews.filter(r => r.stars === stars).length,
			})),
			praise: countSources(reviews.map(r => praiseOf(r.feedback))),
			complaints: countSources(reviews.map(r => complaintsOf(r.feedback))),
			praiseThemes: countThemes(reviews.map(r => praiseOf(r.feedback))),
			complaintThemes: countThemes(reviews.map(r => complaintsOf(r.feedback))),
			split: {
				fiveStar: reviewGroup(fiveStar),
				belowFive: reviewGroup(belowFive),
			},
			changes: reviews
				.map(r => ({
					stars: r.stars ?? undefined,
					...(r.branch && { branch: r.branch }),
					changes: changesOf(r.feedback).map(c => c.detail),
				}))
				.filter(r => r.changes.length),
			changeThemes: groupChanges(reviews.map(r => changesOf(r.feedback)), input.aspects),
			critical: reviews
				.filter(r => (r.stars ?? 5) <= 3 && (r.textTranslated || r.text))
				.slice(0, 6)
				.map(r => ({
					stars: r.stars ?? undefined,
					...(r.branch && { branch: r.branch }),
					text: (r.textTranslated || r.text)!.slice(0, 400),
					replied: !!r.ownerResponse,
				})),
			list: _.orderBy(reviews, r => r.publishedAt.getTime(), 'desc').map(toReviewItem),
			replyDrafts: [],
		},
		dishes,
		competitors: input.competitors ?? [],
		creators: summarizeCreators(reportPosts),
		creatorsNearby: input.creatorsNearby ?? [],
	};
};

/** A competitor's month, cut down to what a report compares. */
export const summarizeCompetitor = (
	data: ReportSummary,
	reviewsTracked: boolean,
): ReportCompetitor => ({
	venueId: data.venue.id,
	name: data.venue.name,
	category: data.venue.category,
	district: data.venue.district,
	rating: data.venue.rating,
	reviewsCount: data.venue.reviewsCount,
	social: _.pick(data.social, ['postCount', 'views', 'engagements', 'creators']),
	reviewsTracked,
	reviews: _.pick(data.reviews, [
		'count',
		'written',
		'avgStars',
		'replyRate',
		'praise',
		'complaints',
	]),
});

const PREVIOUS_DISHES = 8;

/** The previous month's KPIs, or undefined when the venue had neither posts nor reviews then. */
export const summarizePrevious = (
	data: ReportSummary,
	actions?: ReportPoint[],
): ReportPreviousMonth | undefined => {
	if (!data.social.postCount && !data.ownPosts.length && !data.reviews.count) return undefined;
	return {
		month: data.month,
		social: _.pick(data.social, ['postCount', 'views', 'engagements', 'creators', 'promotional']),
		reviews:
			data.reviews.count ?
				_.pick(data.reviews, ['count', 'written', 'avgStars', 'replyRate', 'stars', 'complaints', 'complaintThemes'])
			:	undefined,
		dishes: data.dishes.length ? data.dishes.slice(0, PREVIOUS_DISHES).map(d => _.pick(d, ['name', 'count'])) : undefined,
		actions: actions?.length ? actions : undefined,
	};
};

/** "197.1k", "1.2m": a count the way people say it (the observations use it too). */
export const short = (n: number) =>
	Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 })
		.format(n)
		.toLowerCase();
export const signed = (n: number, text: string) => `${n > 0 ? '+' : n < 0 ? '-' : '±'}${text}`;

/** "from 197.1k to 978.8k (+781.7k, +397%)", worked out so the model quotes it, never computes it. */
const comparison = (
	now: number | undefined,
	before: number | undefined,
	unit: 'count' | 'stars' | 'share',
): string | undefined => {
	if (now === undefined || before === undefined) return undefined;
	const diff = now - before;
	if (unit === 'share') {
		const points = Math.round(diff * 100);
		return `from ${Math.round(before * 100)}% to ${Math.round(now * 100)}% (${signed(points, `${Math.abs(points)} percentage points`)})`;
	}
	if (unit === 'stars')
		return `from ${before.toFixed(1)} to ${now.toFixed(1)} (${signed(diff, Math.abs(diff).toFixed(1))})`;
	const pct = before ? `, ${signed(diff, `${Math.round(Math.abs(diff / before) * 100)}%`)}` : '';
	return `from ${short(before)} to ${short(now)} (${signed(diff, short(Math.abs(diff)))}${pct})`;
};

/**
 * This month against the previous one, one phrase per KPI with the change already worked
 * out. Undefined without a previous month.
 */
export const compareMonths = (data: Pick<ReportData, 'previous' | 'social' | 'reviews'>) => {
	const prev = data.previous;
	if (!prev) return undefined;
	return {
		// By name: the model quotes what it is given, an input key or a `YYYY-MM` too
		month: monthName(prev.month),
		socialMedia: {
			postsByOthers: comparison(data.social.postCount, prev.social.postCount, 'count'),
			views: comparison(data.social.views, prev.social.views, 'count'),
			creators: comparison(data.social.creators, prev.social.creators, 'count'),
			interactions: comparison(data.social.engagements, prev.social.engagements, 'count'),
		},
		googleReviews:
			prev.reviews ?
				{
					reviews: comparison(data.reviews.count, prev.reviews.count, 'count'),
					avgStarsThisMonth: comparison(
						data.reviews.avgStars,
						prev.reviews.avgStars,
						'stars',
					),
					replyRate: comparison(data.reviews.replyRate, prev.reviews.replyRate, 'share'),
				}
			:	'not tracked for the previous month: do not compare reviews',
		actionsSuggestedLastMonth: prev.actions,
	};
};

/** A snapshot dated in a month's first week closes the month before: the monthly run takes it then. */
const CLOSING_DAYS = 7;
const TREND_MONTHS = 6;

/**
 * The venue's closing Google figures for the last six months up to `month`, oldest first:
 * per month the latest snapshot that closes it.
 */
export const ratingTrend = (
	snapshots: { snapshotDate: string; rating?: number | null; reviewsCount?: number | null }[],
	month: string,
): ReportRatingPoint[] => {
	const closes = (date: string) => {
		const d = new Date(`${date}T00:00:00Z`);
		d.setUTCDate(d.getUTCDate() - CLOSING_DAYS);
		return d.toISOString().slice(0, 7);
	};
	const byMonth = _.groupBy(
		snapshots.filter(s => s.rating != null || s.reviewsCount != null),
		s => closes(s.snapshotDate),
	);
	return Object.entries(byMonth)
		.filter(([m]) => m <= month)
		.sort(([a], [b]) => a.localeCompare(b))
		.slice(-TREND_MONTHS)
		.map(([m, group]) => {
			const last = _.maxBy(group, s => s.snapshotDate)!;
			return {
				month: m,
				date: last.snapshotDate,
				rating: last.rating ?? undefined,
				reviewsCount: last.reviewsCount ?? undefined,
			};
		});
};

/** A non-promotional post about a district neighbour this month, as `neighbourPosts` reads it. */
export interface NeighbourPost {
	postId: string;
	platform: 'tiktok' | 'instagram' | 'blog';
	url: string;
	author: string;
	authorFans?: number | null;
	views: number;
	venueName: string;
	/** By one of the neighbour's own accounts: not a creator */
	own?: boolean;
	category?: string | null;
}

/**
 * Creators who posted about district neighbours this month but not about the venue, top eight
 * by followers: invitation candidates. A neighbour's own account is not a creator.
 */
export const selectNearbyCreators = (
	posts: NeighbourPost[],
	/** `platform:handle` (lower case) of everyone who posted about the venue this month */
	venueAuthors: Set<string>,
): ReportData['creatorsNearby'] => {
	const key = (p: { platform: string; author: string }) =>
		`${p.platform}:${p.author.toLowerCase()}`;
	const eligible = posts.filter(
		p =>
			isFoodVenue(p.category) &&
			!venueAuthors.has(key(p)) &&
			!p.own,
	);
	return Object.values(_.groupBy(eligible, p => key(p)))
		.map(group => {
			// A post naming two neighbours counts once
			const byPost = _.uniqBy(group, p => p.postId);
			const venueViews = _.groupBy(group, p => p.venueName);
			return {
				author: group[0].author,
				platform: group[0].platform,
				authorFans: _.max(group.map(p => p.authorFans ?? undefined)),
				posts: byPost.length,
				views: _.sumBy(byPost, p => p.views),
				venues: _.sortBy(Object.keys(venueViews), v => -_.sumBy(venueViews[v], p => p.views)),
				url: _.maxBy(byPost, p => p.views)!.url,
			};
		})
		.sort((a, b) => (b.authorFans ?? 0) - (a.authorFans ?? 0) || b.views - a.views)
		.slice(0, CREATORS_SHOWN);
};
