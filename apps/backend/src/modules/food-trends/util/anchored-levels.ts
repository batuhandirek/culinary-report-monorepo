// Pure: Google search levels made comparable across topics. Google scales every query to its own
// peak, so a term pulled alone compares only with itself. Pulled in groups of five that all carry
// one anchor topic, each group is put on the anchor's scale: a topic's weekly value over the
// anchor's mean in the same group. The anchor's two-year mean is 100 in every group, so a level of
// 40 is 40 % of the anchor's usual searches, whichever group the topic was in.

import _ from 'lodash';

import { termKey } from 'src/modules/trends/util/search-interest.js';

import { COMPARE_GROUP_SIZE } from '../constants/food-trends.constant.js';

/** A topic as one compare run asks for it: the stored `key`, the `query` Google gets. */
export interface CompareTerm {
	key: string;
	query: string;
}

/** One weekly point of a compare run, on the group's shared 0–100 scale. */
export interface ComparePoint {
	/** Unix seconds of the week's start */
	timestamp: number;
	value: number;
	isPartial?: boolean;
}

/**
 * One dataset row of `steadyfetch/google-trends-scraper`: one per keyword and surface; `notice`
 * and `summary` rows carry no keyword data.
 */
export interface TrendsCompareItem {
	surface: string;
	keyword?: string;
	sharedScale?: boolean;
	comparedWith?: string[];
	data?: { points?: ComparePoint[] };
}

/** A group's series by topic key, as the run returned them. */
export interface CompareGroupResult {
	terms: CompareTerm[];
	series: Map<string, ComparePoint[]>;
}

/** The anchor first, then up to four topics, every topic once; the anchor is not a topic of its own. */
export const compareGroups = (
	anchor: CompareTerm,
	topics: CompareTerm[],
	size = COMPARE_GROUP_SIZE,
): CompareTerm[][] =>
	_.chunk(
		_.uniqBy(
			topics.filter(t => t.key !== anchor.key),
			t => t.key,
		),
		size - 1,
	).map(chunk => [anchor, ...chunk]);

/** A run's interest-over-time rows by topic key, matched on the keyword the run echoes. */
export const groupSeries = (
	terms: CompareTerm[],
	items: TrendsCompareItem[],
): Map<string, ComparePoint[]> => {
	const byQuery = new Map(
		items
			.filter(i => i.surface === 'interestOverTime' && i.keyword && i.data?.points?.length)
			.map(i => [termKey(i.keyword!), i.data!.points!]),
	);
	return new Map(
		terms.flatMap(t => {
			const points = byQuery.get(termKey(t.query));
			return points ? [[t.key, points] as const] : [];
		}),
	);
};

const monthOf = (timestamp: number) => new Date(timestamp * 1000).toISOString().slice(0, 7);

/** Complete weeks starting inside the window. */
const windowPoints = (points: ComparePoint[], months: string[]) => {
	const inWindow = new Set(months);
	return points.filter(
		p =>
			typeof p.value === 'number' &&
			typeof p.timestamp === 'number' &&
			!p.isPartial &&
			inWindow.has(monthOf(p.timestamp)),
	);
};

/**
 * Per month, the mean of the weeks starting in it on the anchor's scale, one decimal. In a
 * comparison a week's 0 is "under half a point of the group's peak", a real low, so it counts;
 * a month with no week above 0 is null: below what the comparison resolves, never 0.
 */
export const anchoredMonths = (
	points: ComparePoint[],
	months: string[],
	anchorMean: number,
): (number | null)[] => {
	const byMonth = _.groupBy(windowPoints(points, months), p => monthOf(p.timestamp));
	return months.map(m => {
		const weeks = byMonth[m] ?? [];
		if (!weeks.some(w => w.value > 0)) return null;
		return Math.round((_.meanBy(weeks, w => w.value) / anchorMean) * 1000) / 10;
	});
};

/**
 * Every topic's monthly level on one scale: in each group, the anchor's mean over the window is
 * 100. A group whose anchor came back without data is left out (its topics stay unknown); the
 * anchor's own line is the first usable group's.
 */
export const anchoredLevels = (
	anchorKey: string,
	groups: CompareGroupResult[],
	months: string[],
): { levels: Record<string, (number | null)[]>; usableGroups: number } => {
	const levels: Record<string, (number | null)[]> = {};
	let usableGroups = 0;
	for (const group of groups) {
		const anchorPoints = windowPoints(group.series.get(anchorKey) ?? [], months);
		const anchorMean = anchorPoints.length ? _.meanBy(anchorPoints, p => p.value) : 0;
		if (!anchorMean) continue;
		usableGroups++;
		for (const [key, points] of group.series) {
			if (key === anchorKey && levels[key]) continue;
			levels[key] = anchoredMonths(points, months, anchorMean);
		}
	}
	return { levels, usableGroups };
};

/** The mean level over `of` (a quarter's months) from a line over `months`; null unless every month has one. */
export const periodLevel = (
	line: (number | null)[],
	months: string[],
	of: string[],
): number | null => {
	const values = of.map(m => {
		const i = months.indexOf(m);
		return i < 0 ? null : line[i];
	});
	if (values.some(v => v === null || v === undefined)) return null;
	return Math.round(_.mean(values as number[]) * 10) / 10;
};
