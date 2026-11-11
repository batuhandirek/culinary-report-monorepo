// Pure: the figures of "who talked about X" (`StatementInsightService`) from the rows its SQL
// returns: months, shares, changes in points, stated numbers, and which topics a breakdown folds into.

import _ from 'lodash';

import type { TopicIndex } from 'src/modules/topics/util/topics.js';

import type { StatementUnit } from '../entities/statement.entity.js';

/** Months an Explore view covers at most */
export const INSIGHT_MAX_MONTHS = 24;
/** The default window: the six months up to the last whole one */
export const INSIGHT_DEFAULT_MONTHS = 6;
/** Rows a breakdown lists */
export const INSIGHT_BREAKDOWN_ROWS = 60;

/** A month `n` months after `month` (before, for a negative `n`) */
export const shiftMonth = (month: string, n: number): string => {
	const [year, m] = month.split('-').map(Number);
	return new Date(Date.UTC(year, m - 1 + n, 1)).toISOString().slice(0, 7);
};

/** Every month from `from` to `to`, both in, oldest first; empty when `from` is after `to` */
export const monthsBetween = (from: string, to: string): string[] => {
	const out: string[] = [];
	for (let m = from; m <= to && out.length <= INSIGHT_MAX_MONTHS * 4; m = shiftMonth(m, 1))
		out.push(m);
	return out;
};

/** Percent with one decimal; null without a base */
export const percent = (n: number, of: number): number | null =>
	of ? Math.round((n / of) * 1000) / 10 : null;

/** The change between two shares in points; null when either is missing */
export const pointsChange = (now: number | null, before: number | null): number | null =>
	now === null || before === null ? null : Math.round((now - before) * 10) / 10;

export const median = (values: number[]): number => {
	const sorted = [...values].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

/** The numbers a set of sources states, per unit: a source stating several keeps its largest (the SQL's `max`) */
export const statedAmounts = (
	rows: { source: string; unit: StatementUnit; amount: number }[],
): { unit: StatementUnit; sources: number; median: number; min: number; max: number }[] =>
	Object.entries(_.groupBy(rows, r => r.unit))
		.map(([unit, list]) => {
			const values = list.map(r => Number(r.amount));
			return {
				unit: unit as StatementUnit,
				sources: values.length,
				median: median(values),
				min: Math.min(...values),
				max: Math.max(...values),
			};
		})
		.sort((a, b) => b.sources - a.sources);

/** What a topic or wording a page names is: `term:<key>` for a wording, a topic's key otherwise */
export const TERM_REF = 'term:';
export const isTermRef = (ref: string) => ref.startsWith(TERM_REF);
export const termRef = (key: string) => `${TERM_REF}${key}`;

/**
 * The topic a breakdown of one side of the tree (the aspects, or the kinds of food) folds under:
 * the deepest of the refs on that side, so "Price › Price level" breaks down into its children
 * and "Döner & kebab" into its dishes; undefined when no ref is on that side.
 */
export const foldParent = (
	refs: string[],
	index: Pick<TopicIndex, 'get' | 'isAspect' | 'parentOf'>,
	aspects: boolean,
): string | undefined => {
	const depth = (key: string) => {
		let d = 0;
		for (let k = index.parentOf(key); k && d < 20; k = index.parentOf(k)) d++;
		return d;
	};
	const onSide = refs.filter(r => !isTermRef(r) && index.get(r) && index.isAspect(r) === aspects);
	return _.maxBy(onSide, depth);
};
