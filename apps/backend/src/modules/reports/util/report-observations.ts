// The month's notable moves, found in code from the report's data: what the analysis then
// explains. Pure. A figure is compared only when both sides exist (absent is "not tracked",
// never zero); a place figure belongs to its branch and is never summed across branches;
// busyness is a change in the venue's own index, never a level next to another venue's.

import _ from 'lodash';

import { monthName } from 'src/modules/venues/util/month.js';
import { weekStart } from 'src/modules/venues/util/week.js';

import { MAX_OBSERVATIONS } from '../constants/report-analysis.constant.js';
import type {
	ObservationMetric,
	ObservationPoint,
	ObservationResolution,
	ReportObservation,
} from '../interfaces/report-analysis.interface.js';
import type {
	ReportBranch,
	ReportData,
	ReportReviewStats,
	ReportSocialStats,
} from '../interfaces/report-data.interface.js';

import { type ReportAspects, short, signed } from './summarize-report.js';

/** One earlier month of the brand, read from its stored report (`ReportService.history`). */
export interface ReportHistoryMonth {
	month: string;
	social?: Pick<ReportSocialStats, 'postCount' | 'views' | 'creators'>;
	reviews?: Pick<ReportReviewStats, 'count' | 'written' | 'avgStars' | 'replyRate'>;
	/** Each own account's followers at that month's close */
	followers?: { platform: string; handle: string; followers: number }[];
}

export interface ObservationInput {
	data: ReportData;
	/** The month before's stored report body, when there is one: competitors and places as they were */
	previousData?: Partial<ReportData>;
	/** The months before the previous one, oldest first; may be empty */
	history: ReportHistoryMonth[];
	timeZone: string;
	/** The aspect vocabulary: which complaint theme keys are aspects and roots, and their labels */
	aspects: Pick<ReportAspects, 'isAspect' | 'isRoot' | 'label'>;
}

/** Thresholds: a move counts when its relative and its absolute change both pass. */
export const OBSERVATION_FLOORS = {
	posts: { percent: 30, abs: 3, min: 5 },
	creators: { percent: 30, abs: 3, min: 5 },
	views: { percent: 40, abs: 5_000 },
	reviews: { percent: 30, abs: 5 },
	written_reviews: { percent: 30, abs: 4 },
	review_week: { share: 0.5, times: 2, min: 6 },
	avg_stars: { abs: 0.3, min: 5 },
	reply_rate: { points: 15, min: 5 },
	five_star_share: { points: 15, min: 8 },
	rating: { abs: 0.1 },
	followers: { percent: 5, abs: 50, min: 200 },
	booked: { points: 15, min: 3 },
	busyness: { points: 10, min: 2 },
	search_rank: { places: 3 },
	complaint_theme: { points: 10, min: 3, written: 8, aboveMedian: 15 },
	dish_share: { points: 10, min: 4 },
	competitor_reach: { percent: 30, min: 5 },
} as const;

const WEIGHTS: Record<ObservationMetric, number> = {
	avg_stars: 1,
	rating: 0.9,
	reviews: 0.9,
	review_week: 0.8,
	complaint_theme: 0.8,
	views: 0.8,
	posts: 0.7,
	booked: 0.7,
	five_star_share: 0.6,
	busyness: 0.6,
	search_rank: 0.6,
	followers: 0.6,
	creators: 0.5,
	reply_rate: 0.5,
	competitor_reach: 0.5,
	dish_share: 0.4,
	written_reviews: 0.4,
};

/** A fall (or a rise of a complaint) weighs more: it is what an owner asks about first. */
const BAD_WEIGHT = 1.2;
const SIBLING_WEIGHT = 0.5;
const MAX_STRENGTH = 4;

const pct = (from: number, to: number): number | undefined =>
	from > 0 ? Math.round(((to - from) / from) * 100) : undefined;
const round1 = (n: number) => Math.round(n * 10) / 10;
const percent = (share: number) => Math.round(share * 100);
const ordinal = (n: number) => {
	const rest = n % 100;
	const suffix = rest >= 11 && rest <= 13 ? 'th' : (['th', 'st', 'nd', 'rd'][n % 10] ?? 'th');
	return `${n}${suffix}`;
};
const dayLabel = (date: string) =>
	new Date(`${date}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

type Draft = Omit<ReportObservation, 'sentence' | 'score' | 'checks' | 'related' | 'month'> & {
	/** How far past its floor the move is, 1 at the floor */
	strength: number;
	/** The move an owner would call bad */
	bad: boolean;
	/** The sentence's own words, when the generic one doesn't fit */
	sentence?: string;
};

const branchLabel = (branch: ReportBranch, chain: boolean) => (chain ? branch.name : 'Your place');
const possessive = (name: string) => (name.endsWith('s') ? `${name}'` : `${name}'s`);

/** The sentence a move reads as on its own: what the report shows when the model's line fails. */
export const observationSentence = (o: Omit<ReportObservation, 'sentence' | 'score' | 'checks'>): string => {
	const prev = o.comparedWith;
	const month = monthName(o.month);
	const change =
		o.unit === 'share' || o.unit === 'points' ? signed(o.change, `${Math.abs(o.change)} percentage points`)
		: o.unit === 'stars' ? signed(o.change, Math.abs(o.change).toFixed(1))
		: o.unit === 'index' ? signed(o.change, `${Math.abs(o.change)} points`)
		: o.changePercent !== undefined ? `${signed(o.change, short(Math.abs(o.change)))}, ${signed(o.changePercent, `${Math.abs(o.changePercent)}%`)}`
		: signed(o.change, short(Math.abs(o.change)));
	switch (o.metric) {
		case 'posts':
			return `Posts by others on TikTok and Instagram went from ${o.from} in ${prev} to ${o.to} in ${month} (${change}).`;
		case 'views':
			return `Views of posts by others went from ${short(o.from)} in ${prev} to ${short(o.to)} in ${month} (${change}).`;
		case 'creators':
			return `Creators posting about you went from ${o.from} in ${prev} to ${o.to} in ${month} (${change}).`;
		case 'reviews':
			return `Google reviews went from ${o.from} in ${prev} to ${o.to} in ${month} (${change}).`;
		case 'written_reviews':
			return `Written Google reviews went from ${o.from} in ${prev} to ${o.to} in ${month} (${change}).`;
		case 'avg_stars':
			return `Your average stars this month went from ${o.from.toFixed(1)} in ${prev} to ${o.to.toFixed(1)} in ${month} (${change}).`;
		case 'reply_rate':
			return `Your reply rate on Google reviews went from ${o.from}% in ${prev} to ${o.to}% in ${month} (${change}).`;
		case 'five_star_share':
			return `5-star reviews went from ${o.from}% of your rated Google reviews in ${prev} to ${o.to}% in ${month} (${change}).`;
		case 'rating':
			return `${possessive(o.branchName ?? 'Your place')} all-time Google rating went from ${o.from.toFixed(1)} to ${o.to.toFixed(1)} between ${prev} and ${month}.`;
		case 'busyness':
			return `${possessive(o.branchName ?? 'Your place')} Google busyness index went from ${o.from} in ${prev} to ${o.to} in ${month} (${change}).`;
		case 'booked':
			return `${possessive(o.branchName ?? 'Your place')} Friday and Saturday evenings were ${o.to}% booked in ${month}, ${o.from}% in ${prev} (${change}).`;
		default:
			return `${o.label} went from ${o.from} to ${o.to} (${change}).`;
	}
};

const finish = (draft: Draft, month: string): Omit<ReportObservation, 'checks'> => {
	const { strength, bad, sentence, ...rest } = draft;
	const withMonth = { ...rest, month };
	return {
		...withMonth,
		sentence: sentence ?? observationSentence(withMonth),
		score: round1(Math.min(strength, MAX_STRENGTH) * WEIGHTS[rest.metric] * (bad ? BAD_WEIGHT : 1)),
	};
};

const countMove = (
	metric: 'posts' | 'views' | 'creators' | 'reviews' | 'written_reviews',
	from: number | undefined,
	to: number,
	months: { prev: string; now: string },
	series: ObservationPoint[],
	source: string,
	label: string,
): Draft | undefined => {
	if (from === undefined) return undefined;
	const floor = OBSERVATION_FLOORS[metric];
	const change = to - from;
	const changePercent = pct(from, to);
	if (changePercent === undefined || Math.abs(changePercent) < floor.percent || Math.abs(change) < floor.abs) return undefined;
	if ('min' in floor && Math.max(from, to) < floor.min) return undefined;
	return {
		key: metric,
		metric,
		kind: change < 0 ? 'dip' : 'spike',
		label,
		source,
		unit: metric === 'views' ? 'views' : 'count',
		from,
		to,
		change,
		changePercent,
		comparedWith: monthName(months.prev),
		resolution: 'month',
		series,
		// Against the relative floor: a count's absolute floor only keeps tiny months out
		strength: Math.abs(changePercent) / floor.percent,
		bad: change < 0,
	};
};

const reviewSource = (data: ReportData) =>
	data.reviews.byPlatform?.some(p => p.platform === 'tripadvisor') ? 'Google and TripAdvisor reviews' : 'Google reviews';

/** The month's notable moves, the most important first, `MAX_OBSERVATIONS` at most; empty without a previous month. */
export const observe = ({ data, previousData, history, timeZone, aspects }: ObservationInput): Omit<ReportObservation, 'checks'>[] => {
	const prev = data.previous;
	const month = data.month;
	const chain = data.branches.length > 1;
	const drafts: (Draft | undefined)[] = [];
	const months = prev ? { prev: prev.month, now: month } : undefined;
	const monthSeries = (
		pick: (h: ReportHistoryMonth) => number | undefined,
		before: number | undefined,
		now: number | undefined,
	): ObservationPoint[] => [
		...history.flatMap(h => {
			const value = pick(h);
			return value === undefined ? [] : [{ at: h.month, value }];
		}),
		...(prev && before !== undefined ? [{ at: prev.month, value: before }] : []),
		...(now !== undefined ? [{ at: month, value: now }] : []),
	];
	const social = 'TikTok and Instagram';
	const reviews = reviewSource(data);

	if (prev && months) {
		// Word of mouth
		drafts.push(
			countMove('posts', prev.social.postCount, data.social.postCount, months, monthSeries(h => h.social?.postCount, prev.social.postCount, data.social.postCount), social, 'Posts by others'),
			countMove('views', prev.social.views, data.social.views, months, monthSeries(h => h.social?.views, prev.social.views, data.social.views), social, 'Views'),
			countMove('creators', prev.social.creators, data.social.creators, months, monthSeries(h => h.social?.creators, prev.social.creators, data.social.creators), social, 'Creators'),
		);

		// Reviews: only when the month before was scraped
		if (prev.reviews) {
			const count = countMove('reviews', prev.reviews.count, data.reviews.count, months, monthSeries(h => h.reviews?.count, prev.reviews.count, data.reviews.count), reviews, 'Google reviews');
			drafts.push(
				count ??
					countMove('written_reviews', prev.reviews.written, data.reviews.written, months, monthSeries(h => h.reviews?.written, prev.reviews.written, data.reviews.written), reviews, 'Written reviews'),
			);

			const rated = _.sumBy(data.reviews.stars, s => s.count);
			if (
				data.reviews.avgStars !== undefined &&
				prev.reviews.avgStars !== undefined &&
				rated >= OBSERVATION_FLOORS.avg_stars.min &&
				prev.reviews.count >= OBSERVATION_FLOORS.avg_stars.min
			) {
				const change = round1(data.reviews.avgStars - prev.reviews.avgStars);
				if (Math.abs(change) >= OBSERVATION_FLOORS.avg_stars.abs)
					drafts.push({
						key: 'avg_stars',
						metric: 'avg_stars',
						kind: change < 0 ? 'dip' : 'spike',
						label: 'Average stars this month',
						source: reviews,
						unit: 'stars',
						from: prev.reviews.avgStars,
						to: data.reviews.avgStars,
						change,
						comparedWith: monthName(prev.month),
						resolution: 'month',
						series: monthSeries(h => h.reviews?.avgStars, prev.reviews.avgStars, data.reviews.avgStars),
						strength: Math.abs(change) / OBSERVATION_FLOORS.avg_stars.abs,
						bad: change < 0,
					});
			}

			if (
				data.reviews.replyRate !== undefined &&
				prev.reviews.replyRate !== undefined &&
				data.reviews.count >= OBSERVATION_FLOORS.reply_rate.min &&
				prev.reviews.count >= OBSERVATION_FLOORS.reply_rate.min
			) {
				const from = percent(prev.reviews.replyRate);
				const to = percent(data.reviews.replyRate);
				const change = to - from;
				if (Math.abs(change) >= OBSERVATION_FLOORS.reply_rate.points)
					drafts.push({
						key: 'reply_rate',
						metric: 'reply_rate',
						kind: change < 0 ? 'dip' : 'spike',
						label: 'Reply rate',
						source: reviews,
						unit: 'share',
						from,
						to,
						change,
						comparedWith: monthName(prev.month),
						resolution: 'month',
						series: monthSeries(h => (h.reviews?.replyRate === undefined ? undefined : percent(h.reviews.replyRate)), from, to),
						strength: Math.abs(change) / OBSERVATION_FLOORS.reply_rate.points,
						bad: change < 0,
					});
			}

			const prevStars = prev.reviews.stars;
			const prevRated = prevStars ? _.sumBy(prevStars, s => s.count) : 0;
			if (prevStars && rated >= OBSERVATION_FLOORS.five_star_share.min && prevRated >= OBSERVATION_FLOORS.five_star_share.min) {
				const fives = (stars: { stars: number; count: number }[]) => stars.find(s => s.stars === 5)?.count ?? 0;
				const from = percent(fives(prevStars) / prevRated);
				const to = percent(fives(data.reviews.stars) / rated);
				const change = to - from;
				if (Math.abs(change) >= OBSERVATION_FLOORS.five_star_share.points)
					drafts.push({
						key: 'five_star_share',
						metric: 'five_star_share',
						kind: 'shift',
						label: '5-star share',
						source: reviews,
						unit: 'share',
						from,
						to,
						change,
						comparedWith: monthName(prev.month),
						resolution: 'month',
						series: [{ at: prev.month, value: from }, { at: month, value: to }],
						strength: Math.abs(change) / OBSERVATION_FLOORS.five_star_share.points,
						bad: change < 0,
					});
			}

			// A complaint theme's share against the month before (the roots, "about price, nothing finer", left out)
			const prevThemes = prev.reviews.complaintThemes;
			if (
				prevThemes &&
				data.reviews.complaintThemes &&
				data.reviews.written >= OBSERVATION_FLOORS.complaint_theme.written &&
				prev.reviews.written >= OBSERVATION_FLOORS.complaint_theme.written
			) {
				for (const [theme, n] of Object.entries(data.reviews.complaintThemes)) {
					if (!aspects.isAspect(theme) || aspects.isRoot(theme)) continue;
					if (n < OBSERVATION_FLOORS.complaint_theme.min) continue;
					const before = prevThemes[theme] ?? 0;
					const from = percent(before / prev.reviews.written);
					const to = percent(n / data.reviews.written);
					const change = to - from;
					if (change < OBSERVATION_FLOORS.complaint_theme.points) continue;
					const label = aspects.label(theme).toLowerCase();
					drafts.push({
						key: `complaint_theme:${theme}`,
						metric: 'complaint_theme',
						kind: 'shift',
						label: `Complaints about ${label}`,
						source: reviews,
						unit: 'share',
						from,
						to,
						change,
						comparedWith: monthName(prev.month),
						resolution: 'month',
						theme,
						series: [{ at: prev.month, value: from }, { at: month, value: to }],
						strength: change / OBSERVATION_FLOORS.complaint_theme.points,
						bad: true,
						sentence:
							`Complaints about ${label} went from ${before} of ${prev.reviews.written} written ${reviews.toLowerCase()} (${from}%) in ${monthName(prev.month)} ` +
							`to ${n} of ${data.reviews.written} (${to}%) in ${monthName(month)}.`,
					});
				}
			}
		}

		// Dishes: a dish's share of everything named
		if (prev.dishes?.length && data.dishes.length) {
			const total = _.sumBy(data.dishes, d => d.count);
			const prevTotal = _.sumBy(prev.dishes, d => d.count);
			for (const dish of data.dishes) {
				if (dish.count < OBSERVATION_FLOORS.dish_share.min || !total || !prevTotal) continue;
				const before = prev.dishes.find(d => d.name.toLowerCase() === dish.name.toLowerCase())?.count ?? 0;
				const from = percent(before / prevTotal);
				const to = percent(dish.count / total);
				const change = to - from;
				if (Math.abs(change) < OBSERVATION_FLOORS.dish_share.points) continue;
				drafts.push({
					key: `dish_share:${dish.name.toLowerCase()}`,
					metric: 'dish_share',
					kind: 'shift',
					label: `Talk about ${dish.name}`,
					source: 'posts and reviews',
					unit: 'share',
					from,
					to,
					change,
					comparedWith: monthName(prev.month),
					resolution: 'month',
					series: [{ at: prev.month, value: from }, { at: month, value: to }],
					strength: Math.abs(change) / OBSERVATION_FLOORS.dish_share.points,
					bad: false,
					sentence:
						`${dish.name} went from ${from}% of the dishes named in posts and reviews in ${monthName(prev.month)} ` +
						`to ${to}% in ${monthName(month)} (${signed(change, `${Math.abs(change)} percentage points`)}).`,
				});
			}
		}

		// A competitor moving the other way on views
		const venuePct = pct(prev.social.views, data.social.views);
		if (venuePct !== undefined && Math.abs(venuePct) >= OBSERVATION_FLOORS.competitor_reach.percent && data.social.postCount >= OBSERVATION_FLOORS.competitor_reach.min)
			for (const c of data.competitors) {
				const before = previousData?.competitors?.find(p => p.venueId === c.venueId);
				if (!before || c.social.postCount < OBSERVATION_FLOORS.competitor_reach.min) continue;
				const theirs = pct(before.social.views, c.social.views);
				if (theirs === undefined || Math.abs(theirs) < OBSERVATION_FLOORS.competitor_reach.percent || Math.sign(theirs) === Math.sign(venuePct)) continue;
				drafts.push({
					key: `competitor_reach:${c.venueId}`,
					metric: 'competitor_reach',
					kind: 'shift',
					label: `Views against ${c.name}`,
					source: social,
					unit: 'views',
					from: prev.social.views,
					to: data.social.views,
					change: data.social.views - prev.social.views,
					changePercent: venuePct,
					comparedWith: monthName(prev.month),
					resolution: 'month',
					competitor: c.name,
					series: [{ at: prev.month, value: prev.social.views }, { at: month, value: data.social.views }],
					strength: Math.abs(venuePct) / OBSERVATION_FLOORS.competitor_reach.percent,
					bad: venuePct < 0,
					sentence:
						`Your views went from ${short(prev.social.views)} in ${monthName(prev.month)} to ${short(data.social.views)} in ${monthName(month)} (${signed(venuePct, `${Math.abs(venuePct)}%`)}), ` +
						`while ${possessive(c.name)} went from ${short(before.social.views)} to ${short(c.social.views)} (${signed(theirs, `${Math.abs(theirs)}%`)}).`,
				});
			}
	}

	// A complaint theme far above the month's other report venues (the city section's rows)
	for (const t of data.city?.themes ?? []) {
		const gap = percent(t.venueShare) - percent(t.median);
		if (t.reviews < OBSERVATION_FLOORS.complaint_theme.min || gap < OBSERVATION_FLOORS.complaint_theme.aboveMedian) continue;
		if (drafts.some(d => d?.key === `complaint_theme:${t.key}`)) continue;
		drafts.push({
			key: `complaint_theme:${t.key}`,
			metric: 'complaint_theme',
			kind: 'shift',
			label: `Complaints about ${t.label.toLowerCase()}`,
			source: reviews,
			unit: 'share',
			from: percent(t.median),
			to: percent(t.venueShare),
			change: gap,
			comparedWith: 'the city median',
			resolution: 'month',
			theme: t.key,
			series: [{ at: month, value: percent(t.venueShare) }],
			strength: gap / OBSERVATION_FLOORS.complaint_theme.aboveMedian,
			bad: true,
			sentence:
				`Complaints about ${t.label.toLowerCase()} came up in ${percent(t.venueShare)}% of your written ${reviews.toLowerCase()} in ${monthName(month)}, ` +
				`against ${percent(t.median)}% at the month's other report venues (median of ${t.venues}).`,
		});
	}

	// Reviews crowding into one week
	if (data.reviews.list.length >= OBSERVATION_FLOORS.review_week.min) {
		const byWeek = _.countBy(data.reviews.list, r => weekStart(new Date(r.publishedAt), timeZone));
		const weeks = Object.keys(byWeek).sort();
		const series = weeks.map(week => ({ at: week, value: byWeek[week] }));
		const [top, count] = _.maxBy(Object.entries(byWeek), ([, n]) => n)!;
		const baseline = data.correlations?.buzzToReviews?.baselinePerWeek;
		const usual = baseline ?? _.mean(weeks.filter(w => w !== top).map(w => byWeek[w]));
		if (
			count >= OBSERVATION_FLOORS.review_week.min &&
			count / data.reviews.list.length >= OBSERVATION_FLOORS.review_week.share &&
			usual > 0 &&
			count >= usual * OBSERVATION_FLOORS.review_week.times
		)
			drafts.push({
				key: 'review_week',
				metric: 'review_week',
				kind: 'spike',
				label: 'Reviews in one week',
				source: reviews,
				unit: 'count',
				from: round1(usual),
				to: count,
				change: round1(count - usual),
				comparedWith: baseline ? 'your usual pace (6 months)' : "the month's other weeks",
				resolution: 'week',
				series,
				strength: count / (usual * OBSERVATION_FLOORS.review_week.times),
				bad: false,
				sentence:
					`${count} of your ${data.reviews.list.length} ${reviews} came in the week of ${dayLabel(top)}, ` +
					(baseline ? `against your usual ${round1(usual)} a week.` : `against ${round1(usual)} in the month's other weeks.`),
			});
	}

	// Own accounts' followers
	for (const account of data.ownAccounts ?? []) {
		if (account.followers === undefined || account.followersChange === undefined) continue;
		if (account.followers < OBSERVATION_FLOORS.followers.min) continue;
		const before = account.followers - account.followersChange;
		const changePercent = pct(before, account.followers);
		if (changePercent === undefined || Math.abs(account.followersChange) < OBSERVATION_FLOORS.followers.abs || Math.abs(changePercent) < OBSERVATION_FLOORS.followers.percent) continue;
		const platform = account.platform === 'tiktok' ? 'TikTok' : 'Instagram';
		const points = account.followerPoints ?? [];
		const weekly = points.length >= 2;
		const series: ObservationPoint[] =
			weekly ? points.map(p => ({ at: p.date, value: p.followers }))
			: [
					...history.flatMap(h => {
						const f = h.followers?.find(a => a.handle === account.handle && a.platform === account.platform);
						return f ? [{ at: h.month, value: f.followers }] : [];
					}),
					...(prev ? [{ at: prev.month, value: before }] : []),
					{ at: month, value: account.followers },
				];
		const resolution: ObservationResolution = weekly ? 'week' : 'month';
		const jump = weekly ? points.find((p, i) => i > 0 && Math.abs(p.followers - points[i - 1].followers) >= OBSERVATION_FLOORS.followers.abs) : undefined;
		drafts.push({
			key: `followers:${account.platform}:${account.handle}`,
			metric: 'followers',
			kind: account.followersChange < 0 ? 'dip' : 'spike',
			label: `Followers of @${account.handle}`,
			source: `${platform} @${account.handle}`,
			unit: 'followers',
			from: before,
			to: account.followers,
			change: account.followersChange,
			changePercent,
			comparedWith: prev ? monthName(prev.month) : "the month before's snapshot",
			resolution,
			series,
			strength: Math.abs(changePercent) / OBSERVATION_FLOORS.followers.percent,
			bad: account.followersChange < 0,
			sentence:
				`@${account.handle} on ${platform} went from ${before.toLocaleString('en')} followers to ${account.followers.toLocaleString('en')} ` +
				`(${signed(account.followersChange, account.followersChange.toLocaleString('en').replace('-', ''))}, ${signed(changePercent, `${Math.abs(changePercent)}%`)}) ` +
				(jump ? `in the week of ${dayLabel(weekStart(new Date(`${jump.date}T12:00:00Z`), timeZone))}.`
				: `between the ${prev ? monthName(prev.month) : 'earlier'} and ${monthName(month)} snapshots.`),
		});
	}

	// Place figures, one branch at a time
	for (const branch of data.branches) {
		const name = branchLabel(branch, chain);
		const trend = branch.ratingTrend.filter(p => p.rating !== undefined);
		if (trend.length >= 2) {
			const [before, now] = trend.slice(-2);
			const change = round1(now.rating! - before.rating!);
			if (Math.abs(change) >= OBSERVATION_FLOORS.rating.abs)
				drafts.push({
					key: `rating:${branch.venueId}`,
					metric: 'rating',
					kind: change < 0 ? 'dip' : 'spike',
					label: chain ? `Google rating · ${branch.name}` : 'Google rating',
					source: 'Google Maps',
					unit: 'stars',
					from: before.rating!,
					to: now.rating!,
					change,
					comparedWith: monthName(before.month),
					resolution: 'month',
					branchId: branch.venueId,
					branchName: name,
					series: trend.map(p => ({ at: p.month, value: p.rating! })),
					strength: Math.abs(change) / OBSERVATION_FLOORS.rating.abs,
					bad: change < 0,
				});
		}

		const busy = branch.busyness;
		if (busy?.previous && busy.samples >= OBSERVATION_FLOORS.busyness.min && busy.previous.samples >= OBSERVATION_FLOORS.busyness.min) {
			const change = Math.round(busy.index - busy.previous.index);
			if (Math.abs(change) >= OBSERVATION_FLOORS.busyness.points)
				drafts.push({
					key: `busyness:${branch.venueId}`,
					metric: 'busyness',
					kind: change < 0 ? 'dip' : 'spike',
					label: chain ? `Foot traffic · ${branch.name}` : 'Foot traffic',
					source: 'Google popular times',
					unit: 'index',
					from: Math.round(busy.previous.index),
					to: Math.round(busy.index),
					change,
					comparedWith: monthName(busy.previous.month),
					resolution: 'week',
					branchId: branch.venueId,
					branchName: name,
					series: [...busy.previous.weeks, ...busy.weeks].flatMap(w => (w.index === undefined ? [] : [{ at: w.week, value: Math.round(w.index) }])),
					strength: Math.abs(change) / OBSERVATION_FLOORS.busyness.points,
					bad: change < 0,
				});
		}

		const demand = branch.demand;
		if (demand?.previousBooked !== undefined && demand.evenings.length >= OBSERVATION_FLOORS.booked.min) {
			const from = Math.round(demand.previousBooked);
			const to = Math.round(demand.booked);
			const change = to - from;
			if (Math.abs(change) >= OBSERVATION_FLOORS.booked.points)
				drafts.push({
					key: `booked:${branch.venueId}`,
					metric: 'booked',
					kind: change < 0 ? 'dip' : 'spike',
					label: chain ? `Weekend tables · ${branch.name}` : 'Weekend tables',
					source: 'booking page',
					unit: 'points',
					from,
					to,
					change,
					comparedWith: prev ? monthName(prev.month) : 'the month before',
					resolution: 'week',
					branchId: branch.venueId,
					branchName: name,
					series: demand.evenings.map(e => ({ at: e.date, value: Math.round(e.booked) })),
					strength: Math.abs(change) / OBSERVATION_FLOORS.booked.points,
					bad: change < 0,
				});
		}

		for (const rank of branch.searchRanks ?? []) {
			const last = rank.history.at(-1);
			if (!last) continue;
			const was = last.rank;
			const is = rank.rank;
			if (was === undefined && is === undefined) continue;
			const moved = was !== undefined && is !== undefined ? is - was : undefined;
			if (moved !== undefined && Math.abs(moved) < OBSERVATION_FLOORS.search_rank.places) continue;
			const out = rank.results + 1;
			const from = was ?? out;
			const to = is ?? out;
			const query = `"${rank.query}"`;
			drafts.push({
				key: `search_rank:${branch.venueId}:${rank.query}`,
				metric: 'search_rank',
				kind: 'rank_move',
				label: chain ? `Google Maps search ${query} · ${branch.name}` : `Google Maps search ${query}`,
				source: 'Google Maps',
				unit: 'rank',
				from,
				to,
				change: to - from,
				comparedWith: monthName(last.month),
				resolution: 'month',
				branchId: branch.venueId,
				branchName: name,
				query: rank.query,
				series: [...rank.history, { month, rank: rank.rank }].flatMap(h => (h.rank === undefined ? [] : [{ at: h.month, value: h.rank }])),
				strength: moved !== undefined ? Math.abs(moved) / OBSERVATION_FLOORS.search_rank.places : 2,
				bad: to > from,
				sentence:
					was !== undefined && is !== undefined ?
						`${name} moved from ${ordinal(was)} to ${ordinal(is)} on the Google Maps search ${query} between ${monthName(last.month)} and ${monthName(month)}.`
					: is === undefined ?
						`${name} dropped out of the top ${rank.results} on the Google Maps search ${query}: ${ordinal(was!)} in ${monthName(last.month)}, not among the results in ${monthName(month)}.`
					:	`${name} entered the Google Maps search ${query} at ${ordinal(is)} in ${monthName(month)}; it was not among the top ${rank.results} in ${monthName(last.month)}.`,
			});
		}
	}

	const found = drafts.filter((d): d is Draft => !!d).map(d => finish(d, month));

	// Siblings: the one that moved together with a stronger one steps back
	const related = (keys: string[]) => {
		// Those that moved the same way are one story; a rise next to a fall stays its own
		for (const group of Object.values(_.groupBy(found.filter(o => keys.includes(o.key)), o => Math.sign(o.change)))) {
			if (group.length < 2) continue;
			const [, ...rest] = _.orderBy(group, o => o.score, 'desc');
			for (const o of group) o.related = group.filter(x => x !== o).map(x => x.key);
			for (const o of rest) o.score = round1(o.score * SIBLING_WEIGHT);
		}
	};
	related(['posts', 'views', 'creators']);
	related(['reviews', 'written_reviews', 'review_week']);

	return _.orderBy(found, [o => o.score, o => o.key], ['desc', 'asc']).slice(0, MAX_OBSERVATIONS);
};

/**
 * The observations the agent investigates: the top `max`, skipping one whose sibling (`related`)
 * is already taken, so a group that moved together is one investigation and the next story gets
 * its turn.
 */
export const pickInvestigated = <T extends Pick<ReportObservation, 'key' | 'related'>>(observations: T[], max: number): T[] => {
	const taken = new Set<string>();
	const out: T[] = [];
	for (const o of observations) {
		if (out.length >= max) break;
		if (o.related?.some(k => taken.has(k))) continue;
		taken.add(o.key);
		out.push(o);
	}
	return out;
};
