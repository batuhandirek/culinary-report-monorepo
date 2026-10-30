// The month's material, as the editor reads it: the posts with their comments, the brand's own
// posts and accounts, the press, the reviews (what guests noticed changed, the critical ones,
// five stars against the rest), each place's own month, the competitors, the city, the moves
// the analysis found, last month's actions, the calendar, and the gaps said plainly. Built from
// the data a configuration's sections show (`trimForSections`), so the letter never cites a
// block the report leaves out. Counts stay counts ("7 of 23 written reviews"), never
// percentages: the editor says magnitudes in words. Pure.

import _ from 'lodash';

import { monthName } from 'src/modules/venues/util/month.js';

import type { ReportAnalysis } from '../interfaces/report-analysis.interface.js';
import type {
	ReportBranch,
	ReportCompetitor,
	ReportData,
	ReportFeedbackPoint,
	ReportPost,
	ReportReviewGroup,
} from '../interfaces/report-data.interface.js';
import { signalsPromptInput } from '../services/report-signals.service.js';

import { ratingBenchmarkSentence } from './rating-benchmark.js';
import { reachPromptInput } from './reach.js';
import type { PromptScope } from './report-sections.js';
import type { ReportAspects } from './summarize-report.js';

/** What the pack needs of the aspect vocabulary: which keys are aspects and roots, and how a prompt names each */
type PackAspects = Pick<ReportAspects, 'isAspect' | 'isRoot' | 'promptLabel'>;

/** Themes listed per group, most raised first. */
const THEMES_SHOWN = 8;
const PHRASES_SHOWN = 12;
const NEIGHBOURS_SHOWN = 5;
const OPENINGS_SHOWN = 8;
/** Both groups of the five-stars split need this many written reviews to be worth reading apart. */
const SPLIT_MIN_WRITTEN = 3;

/** "price / price increase: prices went up", or the topic for a point without a theme. */
const phrase = (p: ReportFeedbackPoint, aspects: PackAspects) =>
	`${p.theme ? aspects.promptLabel(p.theme) : p.topic}: ${p.detail}`;

/** "7 of 23 written reviews" per theme, most raised first; the roots (a point "about price, nothing finer") left out. */
const themeCounts = (
	counts: Record<string, number> | undefined,
	total: number,
	unit: string,
	aspects: PackAspects,
	limit = THEMES_SHOWN,
): string[] | undefined =>
	counts &&
	_.sortBy(
		Object.entries(counts).filter(([theme]) => aspects.isAspect(theme) && !aspects.isRoot(theme)),
		([, n]) => -n,
	)
		.slice(0, limit)
		.map(([theme, n]) => `${aspects.promptLabel(theme)}: ${n} of ${total} ${unit}`);

/** The same per topic (food, service, wait, …), for counts without themes. */
const topicCounts = (counts: Record<string, number>, total: number, unit: string, limit = THEMES_SHOWN): string[] =>
	_.sortBy(Object.entries(counts), ([, n]) => -n)
		.slice(0, limit)
		.map(([topic, n]) => `${topic}: ${n} of ${total} ${unit}`);

const creatorLabel = (p: Pick<ReportPost, 'author' | 'authorFans' | 'platform'>) =>
	`${p.author ? `@${p.author}` : 'an account'} on ${p.platform === 'blog' ? 'a blog' : p.platform === 'tiktok' ? 'TikTok' : 'Instagram'}` +
	(p.authorFans ? `, ${p.authorFans} followers` : '');

const reviewGroupInput = (g: ReportReviewGroup, unit: string, aspects: PackAspects) => ({
	reviews: g.count,
	written: g.written,
	praised: themeCounts(g.praiseThemes, g.written, unit, aspects, 5) ?? topicCounts(g.praise, g.written, unit, 5),
	criticised: themeCounts(g.complaintThemes, g.written, unit, aspects, 5) ?? topicCounts(g.complaints, g.written, unit, 5),
	whatTheySaid: {
		praise: g.praiseDetails.slice(0, PHRASES_SHOWN).map(p => phrase(p, aspects)),
		complaints: g.complaintDetails.slice(0, PHRASES_SHOWN).map(p => phrase(p, aspects)),
	},
});

const placeInput = (b: ReportBranch, data: ReportData, scope: PromptScope, chain: boolean) => {
	const competitors = data.competitors.filter(c => !c.branchId || c.branchId === b.venueId);
	return {
		name: b.name,
		street: b.street,
		district: b.district,
		city: b.city,
		googleRatingAllTime: b.rating,
		googleReviewsAllTime: b.reviewsCount,
		// One pre-written sentence: its rating against its district's and its kind of food's venues
		ratingAgainstOthers: b.ratingBenchmark && ratingBenchmarkSentence(b.ratingBenchmark),
		ratingAtEachMonthsClose:
			b.ratingTrend.length >= 2 ? b.ratingTrend.map(p => _.pick(p, ['month', 'rating', 'reviewsCount'])) : undefined,
		// A chain's branch: the posts that named it and its reviews (a one-branch brand's are the brand's)
		thisMonth:
			chain && scope.branches ?
				{
					postsByOthersNamingIt: b.social.postCount,
					views: b.social.views,
					...(scope.reviews && {
						reviews: b.reviews.count,
						writtenReviews: b.reviews.written,
						averageStars: b.reviews.avgStars,
						answeredByOwner: answered(b.reviews),
						// A branch's month is cut like a competitor's: topics, no themes
						criticised: topicCounts(b.reviews.complaints, b.reviews.written, 'written reviews', 5),
						praised: topicCounts(b.reviews.praise, b.reviews.written, 'written reviews', 3),
					}),
				}
			:	undefined,
		// Pre-written sentences on foot traffic, open tables, prices (quote, don't compute)
		demandAndPrices: signalsPromptInput({ ...b, competitors }),
		talkedAboutNearbyThisMonth: b.neighbours
			.slice(0, NEIGHBOURS_SHOWN)
			.map(n => _.pick(n, ['name', 'category', 'posts', 'views'])),
		googleMapsSearches: b.searchRanks?.map(r => ({
			search: r.query,
			yourPlace: r.rank ?? `not in the top ${r.results}`,
			topThree: r.top.slice(0, 3).map(t => (t.isVenue ? `${t.name} (you)` : t.name)),
			earlierMonths: r.history.map(h => ({ month: h.month, place: h.rank ?? 'not in the results' })),
		})),
		// Seen by our scrapes or announced by a creator's post ("first seen", never an opening date)
		openedOrClosedNearby: b.neighbourhood && {
			district: b.neighbourhood.changes.district,
			since: b.neighbourhood.changes.from,
			..._.pick(b.neighbourhood.changes, ['opened', 'closed', 'reopened']),
			onYourStreet: b.neighbourhood.changes.street,
			places: b.neighbourhood.changes.venues
				.slice(0, OPENINGS_SHOWN)
				.map(v => ({
					..._.pick(v, ['name', 'category', 'kind', 'street', 'sameStreet']),
					firstSeen: v.date,
					...(v.source === 'posts' && { how: "a creator's post said it had opened" }),
				})),
		},
	};
};

const competitorInput = (c: ReportCompetitor) => ({
	name: c.name,
	category: c.category,
	district: c.district,
	// A chain's places together; one picked for a branch compares with that branch only
	wholeChainOfPlaces: c.branches,
	comparedWithYourBranch: c.against,
	googleRatingAllTime: c.rating,
	postsByOthers: c.social.postCount,
	views: c.social.views,
	creators: c.social.creators,
	reviewsThisMonth:
		c.reviewsTracked ?
			{
				reviews: c.reviews.count,
				written: c.reviews.written,
				averageStars: c.reviews.avgStars,
				answeredByOwner: answered(c.reviews),
				praised: topicCounts(c.reviews.praise, c.reviews.written, 'written reviews', 3),
				criticised: topicCounts(c.reviews.complaints, c.reviews.written, 'written reviews', 3),
			}
		:	'not tracked: nothing to compare its reviews with',
	weekendTablesBookedOut: c.demand && `${c.demand.booked} % over ${c.demand.evenings} evenings`,
	footTrafficChangeInPoints:
		c.busyness?.previousIndex !== undefined ? Math.round(c.busyness.index - c.busyness.previousIndex) : undefined,
});

/** The Mondays of every week touching the month, `YYYY-MM-DD`: what the tools' `week` filters take. */
export const mondaysOf = (month: string): string[] => {
	const first = new Date(`${month}-01T00:00:00Z`);
	const next = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 1));
	const monday = new Date(first);
	monday.setUTCDate(first.getUTCDate() - ((first.getUTCDay() + 6) % 7));
	const out: string[] = [];
	for (; monday < next; monday.setUTCDate(monday.getUTCDate() + 7)) out.push(monday.toISOString().slice(0, 10));
	return out;
};

/** "3 of 250" answered, from the reply rate; undefined without reviews. */
const answered = (r: { count: number; replyRate?: number }) =>
	r.count && r.replyRate !== undefined ? `${Math.round(r.replyRate * r.count)} of ${r.count}` : undefined;

/** What this report could not see, said plainly, so the editor never writes a gap as a zero. */
export const packGaps = (data: ReportData, scope: PromptScope): string[] => {
	const gaps: string[] = [];
	const allTime = _.sumBy(data.branches, b => b.reviewsCount ?? 0);
	if (scope.reviews && !data.reviews.count && allTime)
		gaps.push(
			`No Google review of ${monthName(data.month)} was read for this report, though the brand has ${allTime} reviews on Google all time: say the month's reviews were not read, never that there were none.`,
		);
	if (!data.previous) gaps.push('A first report: there is no month before to compare with.');
	else if (scope.reviews && !data.previous.reviews)
		gaps.push(`The reviews of ${monthName(data.previous.month)} were not read: do not compare review figures with it.`);
	if (data.ownPosts.length && !data.ownAccounts?.length)
		gaps.push("The brand's own accounts' follower counts were not read this month; its own posts and their views are known.");
	const untracked = data.competitors.filter(c => !c.reviewsTracked).map(c => c.name);
	if (untracked.length) gaps.push(`Reviews of ${untracked.join(', ')} are not tracked: nothing to compare with there.`);
	const noSearches = data.branches.filter(b => !b.searchRanks?.length);
	if (noSearches.length && data.branches.length > noSearches.length)
		gaps.push(`No Google Maps searches were tracked for ${noSearches.map(b => b.street ?? b.name).join(', ')}.`);
	else if (noSearches.length) gaps.push('No Google Maps searches were tracked for the place this month.');
	if (!data.branches.some(b => b.busyness || b.demand))
		gaps.push('Neither popular times nor open tables were sampled: nothing on how full the place was.');
	return gaps;
};

/**
 * The editor's user message. `scope` is what the configuration's sections show
 * (`trimForSections`); `aspects` names the theme keys; `analysis` is the build's, when it ran.
 */
export const editorPack = (data: ReportData, scope: PromptScope, aspects: PackAspects, analysis?: ReportAnalysis) => {
	const chain = data.branches.length > 1;
	const reach = reachPromptInput(data);
	const commentsByPost = new Map((data.comments?.posts ?? []).map(p => [p.postId, p]));
	const prev = data.previous;
	const split = data.reviews.split;
	const splitWorthReading =
		scope.stars && split.fiveStar.written >= SPLIT_MIN_WRITTEN && split.belowFive.written >= SPLIT_MIN_WRITTEN;

	return {
		brand: {
			name: data.brand.name,
			kindOfPlace: data.brand.category,
			kindOfFood: data.city?.cuisine?.label,
			places: data.branches.map(b => _.pick(b, ['name', 'street', 'district', 'city'])),
			...(chain && { postsByOthersNamingNoBranch: data.brand.brandOnlyPosts }),
		},
		month: monthName(data.month),
		// The tools' week filters take a Monday
		weeksStartOnMondays: mondaysOf(data.month),
		inNumbers: {
			...(scope.social && {
				postsByOthers: data.social.postCount,
				ofWhichPaidOrGifted: data.social.promotional,
				views: data.social.views,
				creators: data.social.creators,
				ownPosts: data.ownPosts.length,
				ownPostsViews: _.sumBy(data.ownPosts, p => p.views),
			}),
			...(scope.reviews && {
				reviews: data.reviews.count,
				writtenReviews: data.reviews.written,
				averageStars: data.reviews.avgStars,
				answeredByOwner: answered(data.reviews),
			}),
			monthBefore: prev && {
				month: monthName(prev.month),
				...(scope.social && {
					postsByOthers: prev.social.postCount,
					views: prev.social.views,
					creators: prev.social.creators,
				}),
				...(scope.reviews &&
					prev.reviews && {
						reviews: prev.reviews.count,
						writtenReviews: prev.reviews.written,
						averageStars: prev.reviews.avgStars,
						answeredByOwner: answered(prev.reviews),
					}),
			},
		},
		cityCalendar: data.context,
		postsByOthers:
			scope.social ?
				_.orderBy(data.posts, p => p.views, 'desc').map(p => {
					const c = commentsByPost.get(p.postId);
					return {
						date: p.postedAt.slice(0, 10),
						creator: creatorLabel(p),
						...(p.title && { headline: p.title }),
						views: p.views,
						paidOrGifted: p.promotional,
						visited: p.visited,
						sentiment: p.sentiment,
						summary: p.summary,
						praise: p.praise.map(point => phrase(point, aspects)),
						complaints: p.complaints.map(point => phrase(point, aspects)),
						dishes: p.dishes.map(d => `${d.name} (${d.sentiment})`),
						...(c && {
							commentsUnderIt: {
								read: c.comments,
								wantToGo: c.intents.intent ?? 0,
								agreed: c.intents.confirmation ?? 0,
								disagreed: c.intents.disagreement ?? 0,
								asked: c.intents.question ?? 0,
								...(c.disagreement && { whatTheDisagreeingOnesSay: c.disagreement }),
							},
						}),
					};
				})
			:	undefined,
		questionsViewersKeptAsking: data.comments?.questions.map(q => `"${q.example}" (${q.count} times)`),
		ownPosts: scope.social && data.ownPosts.length ?
			{
				note: "Posted by the brand itself: not word of mouth, but part of the month's reach",
				posts: _.orderBy(data.ownPosts, p => p.views, 'desc').map(p => ({
					date: p.postedAt.slice(0, 10),
					account: creatorLabel(p),
					views: p.views,
					summary: p.summary,
				})),
			} : undefined,
		ownAccounts: reach?.ownAccounts,
		press: data.press?.items.map(i => ({
			date: i.publishedAt,
			outlet: i.outlet,
			kind: i.kind,
			title: i.title,
			summary: i.summary,
		})),
		creatorsWhoCoveredNeighboursButNotYou: data.creatorsNearby.map(c => ({
			creator: creatorLabel(c),
			covered: c.venues,
		})),
		reviews:
			scope.reviews ?
				{
					count: data.reviews.count,
					written: data.reviews.written,
					averageStars: data.reviews.avgStars,
					answeredByOwner: answered(data.reviews),
					byStars: data.reviews.stars.map(s => `${s.count} with ${s.stars} stars`),
					whatGuestsNoticedChanged: data.reviews.changes.map(c => ({
						stars: c.stars,
						...(c.branch && { branch: c.branch }),
						changes: c.changes,
					})),
					criticalReviews: data.reviews.critical.map(r => ({
						stars: r.stars,
						...(r.branch && { branch: r.branch }),
						answered: r.replied,
						text: r.text,
					})),
					praisedMost:
						themeCounts(data.reviews.praiseThemes, data.reviews.written, 'written reviews', aspects) ??
						topicCounts(data.reviews.praise, data.reviews.written, 'written reviews'),
					criticisedMost:
						themeCounts(data.reviews.complaintThemes, data.reviews.written, 'written reviews', aspects) ??
						topicCounts(data.reviews.complaints, data.reviews.written, 'written reviews'),
					fiveStarsAgainstTheRest:
						splitWorthReading ?
							{
								note: 'What five-star reviews praise next to what the reviews below five criticise: what keeps a guest from giving five',
								fiveStars: reviewGroupInput(split.fiveStar, 'written five-star reviews', aspects),
								belowFive: reviewGroupInput(split.belowFive, 'written reviews below five stars', aspects),
							}
						:	undefined,
					googleAgainstTripadvisor: reach?.reviewPlatforms,
				}
			:	undefined,
		dishesNamedMost: scope.social ? data.dishes.slice(0, 8).map(d => `${d.name} (${d.count})`) : undefined,
		places: data.branches.map(b => placeInput(b, data, scope, chain)),
		// The brand's relations over every place's reviews: pre-written sentences
		patterns: signalsPromptInput({ correlations: data.correlations }),
		competitors: data.competitors.map(competitorInput),
		theCity: data.city && {
			name: data.city.cityName,
			postsAboutFoodThisMonth: data.city.mentions,
			yourKindOfFood: data.city.cuisine && {
				label: data.city.cuisine.label,
				placesTalkedAboutForIt: data.city.cuisine.venues,
				yourPlaceAmongThemByViews: data.city.cuisine.rank,
				shareOfTheCitysPosts: data.city.cuisine.share,
				shareTheMonthBefore: data.city.cuisine.prevShare,
			},
			risingKindsOfFood: data.city.risingCuisines.map(r => ({ label: r.label, shareNow: r.share, shareBefore: r.prevShare })),
			risingDishes: data.city.risingDishes.map(r => ({ label: r.label, shareNow: r.share, shareBefore: r.prevShare })),
			// Google search interest (0–100 on the term's own 12-month peak) next to the share of posts
			googleSearchesAgainstPosts: data.city.searches?.map(r => ({
				label: r.label,
				searchInterestNow: r.interest,
				searchInterestBefore: r.prevInterest,
				shareOfPostsNow: r.share,
				shareOfPostsBefore: r.prevShare,
			})),
			// Pre-written: quote, never compute
			yourComplaintsAgainstTheMonthsReportVenues: data.city.themes?.map(
				t =>
					`${t.label.toLowerCase()}: ${t.reviews} of your written reviews (${Math.round(t.venueShare * 100)} %); ` +
					`${Math.round(t.median * 100)} % at the month's other report venues (median of ${t.venues})`,
			),
			youAgainstTheMonthsReportVenues: {
				venuesCompared: data.city.baseline.venues,
				..._.mapValues(_.pick(data.city.baseline, ['posts', 'views', 'avgStars', 'replyRate']), m => ({
					you: m.venue,
					median: m.median,
					youAreAheadOfPercent: m.percentile,
				})),
			},
		},
		whatMovedAndWhy: analysis && {
			movesFound: analysis.observations.map(o => ({
				what: o.sentence,
				checks: o.checks.filter(c => c.verdict !== 'unknown').map(c => c.answer),
			})),
			investigated: analysis.investigations.map(i => ({
				whatHappened: i.whatHappened,
				possibleReasons: i.hypotheses.map(h => `${h.confidence}: ${h.reason}`),
				cannotTell: i.cannotTell,
				worthChecking: i.worthChecking,
			})),
		},
		actionsSuggestedLastMonth: prev?.actions,
		gaps: packGaps(data, scope),
	};
};

export type EditorPack = ReturnType<typeof editorPack>;

/** The pack's camelCase field names: a line naming one leaked the input, and is dropped. */
export const packKeys = (value: unknown, out = new Set<string>()): string[] => {
	if (Array.isArray(value)) value.forEach(v => packKeys(v, out));
	else if (value && typeof value === 'object')
		for (const [k, v] of Object.entries(value)) {
			if (/[a-z][A-Z]/.test(k)) out.add(k);
			packKeys(v, out);
		}
	return [...out];
};
