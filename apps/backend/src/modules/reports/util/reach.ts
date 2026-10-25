// The reach and press sections of a report, from what the pipeline stored. Pure functions.

import { type FeedbackRowLike, topicsOf } from 'src/modules/feedback/util/feedback-rows.js';
import _ from 'lodash';

import type { ReportData, ReportPost } from '../interfaces/report-data.interface.js';
import type {
	ReportCommentQuestion,
	ReportComments,
	ReportOwnAccount,
	ReportPlatformGap,
	ReportPress,
	ReportPressItem,
	ReportReviewPlatform,
} from '../interfaces/report-reach.interface.js';

/** A question asked this often under the top posts gets an action. */
export const COMMENT_QUESTION_ACTION_MIN = 5;
/** Platforms are compared on topics from this many written reviews on each. */
export const PLATFORM_GAP_MIN_WRITTEN = 5;
/** A topic's share must differ by this much (0–1) to count as a gap. */
export const PLATFORM_GAP_MIN_DIFF = 0.2;

const QUESTION_ACTIONS: Record<string, string> = {
	location: 'People ask where you are: tag the location in your own posts and ask creators to tag it too.',
	price: 'People ask what it costs: put prices in your captions or pin a photo of the menu.',
	hours: 'People ask when you are open: keep your hours current on Google and in your bio.',
	menu: 'People ask what is on the menu: pin the menu to your profile.',
	dietary: 'People ask about vegan, vegetarian or gluten-free options: say what you offer in captions and on the menu.',
	payment: 'People ask whether you take cards: say how guests can pay in your bio and on Google.',
	reservation: 'People ask whether they can book: put the booking link in your bio.',
};

const round1 = (n: number) => Math.round(n * 10) / 10;

/** The own accounts with how creators' posts on the same platform did against theirs. */
export const ownAccountsSection = (
	accounts: Omit<ReportOwnAccount, 'creatorViewsMultiple'>[],
	posts: Pick<ReportPost, 'platform' | 'views'>[],
): ReportOwnAccount[] =>
	accounts.map(account => {
		const theirs = posts.filter(p => p.platform === account.platform);
		const creatorAvg = theirs.length ? _.meanBy(theirs, p => p.views) : 0;
		return {
			...account,
			...(account.avgViews && creatorAvg && { creatorViewsMultiple: round1(creatorAvg / account.avgViews) }),
		};
	});

/** A post's stored comments, as `PostCommentService.forReport` gives them. */
export interface CommentPostInput {
	postId: string;
	url: string;
	author?: string;
	views: number;
	comments: {
		intent: string | null;
		questionTopic: string | null;
		question: string | null;
		likes: number;
	}[];
	disagreement?: string;
}

/**
 * Intents per post and overall, and the three most asked kinds of question with an action once
 * `COMMENT_QUESTION_ACTION_MIN` people asked one. Undefined when no comment is classified.
 */
export const summarizeComments = (posts: CommentPostInput[]): ReportComments | undefined => {
	const classified = posts.map(p => ({ ...p, comments: p.comments.filter(c => c.intent) }));
	const all = classified.flatMap(p => p.comments);
	if (!all.length) return undefined;
	const questions: ReportCommentQuestion[] = _.orderBy(
		Object.entries(_.groupBy(all.filter(c => c.questionTopic), c => c.questionTopic!)),
		[([, group]) => group.length, ([, group]) => _.sumBy(group, c => c.likes)],
		['desc', 'desc'],
	)
		.slice(0, 3)
		.map(([topic, group]) => {
			const example = _.maxBy(group.filter(c => c.question), c => c.likes)?.question ?? topic;
			const action = group.length >= COMMENT_QUESTION_ACTION_MIN ? QUESTION_ACTIONS[topic] : undefined;
			return { topic, count: group.length, example, ...(action && { action }) };
		});
	return {
		comments: all.length,
		intents: _.countBy(all, c => c.intent!),
		posts: _.orderBy(
			classified.filter(p => p.comments.length),
			p => p.views,
			'desc',
		).map(p => ({
			postId: p.postId,
			url: p.url,
			...(p.author && { author: p.author }),
			views: p.views,
			comments: p.comments.length,
			intents: _.countBy(p.comments, c => c.intent!),
			...(p.disagreement && { disagreement: p.disagreement }),
		})),
		questions,
	};
};

/** The month's classified press (`WebMentionService.forReport`); undefined when there is none. */
export const pressSection = (
	mentions: {
		url: string;
		title: string;
		outlet?: string | null;
		publishedAt?: Date | null;
		kind?: string | null;
		summary?: string | null;
	}[],
): ReportPress | undefined => {
	const items: ReportPressItem[] = mentions
		.filter(m => m.kind === 'feature' || m.kind === 'listicle' || m.kind === 'passing')
		.map(m => ({
			url: m.url,
			title: m.title,
			...(m.outlet && { outlet: m.outlet }),
			...(m.publishedAt && { publishedAt: m.publishedAt.toISOString().slice(0, 10) }),
			kind: m.kind as ReportPressItem['kind'],
			...(m.summary && { summary: m.summary }),
		}));
	if (!items.length) return undefined;
	const count = _.countBy(items, i => i.kind);
	return {
		features: count.feature ?? 0,
		listicles: count.listicle ?? 0,
		passing: count.passing ?? 0,
		items,
	};
};

/** A month's review, with its platform. */
export interface PlatformReviewInput {
	platform: 'google' | 'tripadvisor';
	stars?: number | null;
	text?: string | null;
	textTranslated?: string | null;
	ownerResponse?: string | null;
	/** What it says: its feedback rows */
	feedback: FeedbackRowLike[];
}

/** Topic → written reviews raising it on that side, once each */
const countSources = (reviews: PlatformReviewInput[], sentiment: 'positive' | 'negative') =>
	_.countBy(reviews.flatMap(r => topicsOf(r.feedback, sentiment)));

/**
 * Google and TripAdvisor side by side, and the topics their reviewers see differently (both
 * with `PLATFORM_GAP_MIN_WRITTEN` written reviews, a share gap of `PLATFORM_GAP_MIN_DIFF`, the
 * three biggest). Undefined for a venue with no TripAdvisor side: no review there this month and
 * no rating known.
 */
export const reviewPlatforms = (
	reviews: PlatformReviewInput[],
	venue: {
		rating?: number | null;
		reviewsCount?: number | null;
		tripadvisorRating?: number | null;
		tripadvisorReviewsCount?: number | null;
	},
): { byPlatform: ReportReviewPlatform[]; platformGaps: ReportPlatformGap[] } | undefined => {
	const tripadvisor = reviews.filter(r => r.platform === 'tripadvisor');
	if (!tripadvisor.length && venue.tripadvisorRating == null) return undefined;
	const platform = (name: 'google' | 'tripadvisor', rs: PlatformReviewInput[]): ReportReviewPlatform => {
		const rated = rs.filter(r => typeof r.stars === 'number');
		const written = rs.filter(r => r.textTranslated || r.text);
		const rating = name === 'google' ? venue.rating : venue.tripadvisorRating;
		const reviewsCount = name === 'google' ? venue.reviewsCount : venue.tripadvisorReviewsCount;
		return {
			platform: name,
			count: rs.length,
			written: written.length,
			...(rated.length && { avgStars: round1(_.meanBy(rated, r => r.stars!)) }),
			...(rs.length && { replyRate: rs.filter(r => r.ownerResponse).length / rs.length }),
			...(rating != null && { rating }),
			...(reviewsCount != null && { reviewsCount }),
			praise: countSources(written, 'positive'),
			complaints: countSources(written, 'negative'),
		};
	};
	const google = platform('google', reviews.filter(r => r.platform === 'google'));
	const ta = platform('tripadvisor', tripadvisor);

	const gaps: (ReportPlatformGap & { diff: number })[] = [];
	if (google.written >= PLATFORM_GAP_MIN_WRITTEN && ta.written >= PLATFORM_GAP_MIN_WRITTEN) {
		for (const side of ['praise', 'complaints'] as const) {
			for (const topic of _.union(Object.keys(google[side]), Object.keys(ta[side]))) {
				if (topic === 'other') continue;
				const g = (google[side][topic] ?? 0) / google.written;
				const t = (ta[side][topic] ?? 0) / ta.written;
				if (Math.abs(g - t) >= PLATFORM_GAP_MIN_DIFF)
					gaps.push({ topic, side, google: round2(g), tripadvisor: round2(t), diff: Math.abs(g - t) });
			}
		}
	}
	return {
		byPlatform: [google, ta],
		platformGaps: _.orderBy(gaps, g => g.diff, 'desc')
			.slice(0, 3)
			.map(({ diff: _diff, ...gap }) => gap),
	};
};

const round2 = (n: number) => Math.round(n * 100) / 100;

const pct = (n: number) => `${Math.round(n * 100)}%`;

/**
 * Pre-written sentences on own reach, comments, press and the review platforms for the
 * highlights prompt: the model quotes them, it doesn't compute.
 */
export const reachPromptInput = (
	data: Pick<ReportData, 'ownAccounts' | 'comments' | 'press' | 'reviews'>,
): Record<string, string> | undefined => {
	const out: Record<string, string> = {};
	const accounts = data.ownAccounts ?? [];
	if (accounts.length)
		out.ownAccounts = accounts
			.map(a => {
				const parts = [
					a.followers !== undefined && `${a.followers} followers`,
					a.followersChange !== undefined &&
						`${a.followersChange >= 0 ? '+' : ''}${a.followersChange} since last month`,
					a.avgViews !== undefined && `${a.avgViews} average views over its latest posts`,
					a.postsLast30Days !== undefined && `${a.postsLast30Days} posts in the last 30 days`,
					a.creatorViewsMultiple !== undefined &&
						`creators' posts on ${a.platform} got ${a.creatorViewsMultiple}× its average views`,
				].filter(Boolean);
				const whose = a.branch ? `${a.branch}'s own` : `the venue's own`;
				return `${whose[0].toUpperCase()}${whose.slice(1)} ${a.platform} account @${a.handle}: ${parts.join(', ')}.`;
			})
			.join(' ');
	const c = data.comments;
	if (c) {
		const i = c.intents;
		out.comments =
			`Under its top ${c.posts.length} TikTok posts by others, ${c.comments} comments were read: ` +
			`${i.intent ?? 0} want to go or saved it, ${i.confirmation ?? 0} had been and agreed, ` +
			`${i.disagreement ?? 0} disagreed, ${i.question ?? 0} asked something.` +
			(c.questions.length ?
				` Most asked: ${c.questions.map(q => `"${q.example}" (${q.count})`).join(', ')}.`
			:	'') +
			c.posts
				.filter(p => p.disagreement)
				.map(p => ` Disagreement under @${p.author ?? 'a creator'}'s post: ${p.disagreement}`)
				.join('');
	}
	const p = data.press;
	if (p)
		out.press =
			`In the press this month: ${p.features} features, ${p.listicles} lists, ${p.passing} passing mentions. ` +
			p.items
				.filter(item => item.kind !== 'passing')
				.slice(0, 4)
				.map(item => `${item.outlet ?? 'A site'}: "${item.title}"${item.summary ? ` (${item.summary})` : ''}.`)
				.join(' ');
	const platforms = data.reviews.byPlatform;
	if (platforms) {
		const [g, t] = platforms;
		out.reviewPlatforms =
			`Google this month: ${g.count} reviews${g.avgStars !== undefined ? `, ${g.avgStars} stars on average` : ''}; ` +
			`TripAdvisor (mostly visitors): ${t.count} reviews${t.avgStars !== undefined ? `, ${t.avgStars} stars on average` : ''}` +
			`${t.rating !== undefined ? `, ${t.rating} all-time there` : ''}.` +
			(data.reviews.platformGaps ?? [])
				.map(
					gap =>
						` ${gap.topic} was ${gap.side === 'praise' ? 'praised' : 'criticised'} in ${pct(gap.google)} of written Google reviews and ${pct(gap.tripadvisor)} of TripAdvisor ones.`,
				)
				.join('');
	}
	return Object.keys(out).length ? out : undefined;
};
