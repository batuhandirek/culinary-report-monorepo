// Pure: a city's quarter of food trends from what is stored (the anchored search levels, Google's
// related queries, topic mention counts, openings by kind of food). Topics only; rises only.

import _ from 'lodash';

import { FoodTopicKindEnum } from 'src/modules/food-topics/entities/food-topic.entity.js';
import { monthsUpTo, termKey } from 'src/modules/trends/util/search-interest.js';
import type { TopicMentionCounts } from 'src/modules/trends/util/topic-mentions.js';
import { isDenied } from 'src/modules/venues/services/brand-lead-score.service.js';
import type { VenueStatusCounts, VenueStatusGroup } from 'src/modules/venues/util/venue-status.js';

import {
	FOOD_TRENDS_BREAKOUTS,
	FOOD_TRENDS_OPENINGS,
	FOOD_TRENDS_RISING,
	FOOD_TRENDS_TOP,
	MIN_QUARTER_MENTIONS,
	MIN_RISE,
	MIN_RISING_LEVEL,
	MIN_SEARCH_LEVEL,
	MIN_TOPIC_MENTIONS,
	NEGATIVE_QUERY_WORDS,
} from '../constants/food-trends.constant.js';
import type {
	AnchoredSearchLevels,
	FoodTrendsBreakout,
	FoodTrendsBreakouts,
	FoodTrendsData,
	FoodTrendsOpenings,
	FoodTrendsSearches,
	FoodTrendsSearchTopic,
	FoodTrendsTalked,
} from '../interfaces/food-trends.interface.js';

import { periodLevel } from './anchored-levels.js';
import { quarterBefore, quarterMonths } from './quarter.js';

export interface FoodTrendsTopicInfo {
	key: string;
	label: string;
	kind: FoodTopicKindEnum;
}

/** One of Google's rising related queries of a searched topic. */
export interface FoodTrendsRelatedRow {
	/** The topic's label */
	topic: string;
	query: string;
	/** Percent growth */
	value: number;
	breakout?: boolean;
}

export interface FoodTrendsInput {
	quarter: string;
	topics: Map<string, FoodTrendsTopicInfo>;
	levels?: AnchoredSearchLevels | null;
	/** Rising queries of the pull whose window ends with `month` */
	related?: { month: string; rows: FoodTrendsRelatedRow[] };
	/** Topic mentions over the quarter and the one before (`countTopicMentions`) */
	mentions: TopicMentionCounts;
	openings?: { totals: VenueStatusCounts; byCategory: VenueStatusGroup[] };
	doNotListVenues: readonly string[];
}

// Kinds of place (café, bar, fast food) are not kinds of food: off the public lists
const isFood = (topic: FoodTrendsTopicInfo | undefined): topic is FoodTrendsTopicInfo =>
	!!topic && topic.kind !== FoodTopicKindEnum.FORMAT;

const round1 = (n: number) => Math.round(n * 10) / 10;

export const computeSearches = (
	quarter: string,
	levels: AnchoredSearchLevels | null | undefined,
	topics: Map<string, FoodTrendsTopicInfo>,
): FoodTrendsSearches | undefined => {
	const anchor = levels && topics.get(levels.anchor);
	if (!levels || !anchor) return undefined;
	const now = quarterMonths(quarter);
	const before = quarterMonths(quarterBefore(quarter, 4));
	const rows: FoodTrendsSearchTopic[] = Object.entries(levels.levels).flatMap(([key, line]) => {
		const topic = topics.get(key);
		if (!isFood(topic)) return [];
		const level = periodLevel(line, levels.months, now);
		if (level === null) return [];
		const prev = periodLevel(line, levels.months, before);
		const change =
			prev !== null && prev >= MIN_SEARCH_LEVEL ?
				Math.round((level / prev - 1) * 100) / 100
			:	null;
		return [
			{
				key,
				label: topic.label,
				kind: topic.kind,
				level,
				...(prev !== null && { prevYearLevel: prev }),
				...(change !== null && { change }),
				...(key === levels.anchor && { anchor: true }),
			},
		];
	});
	const top = _.sortBy(
		rows.filter(r => r.level >= MIN_SEARCH_LEVEL),
		r => -r.level,
		r => r.label,
	).slice(0, FOOD_TRENDS_TOP);
	if (!top.length) return undefined;
	const rising = _.sortBy(
		rows.filter(
			r => r.level >= MIN_RISING_LEVEL && r.change !== undefined && r.change >= MIN_RISE,
		),
		r => -r.change!,
		r => r.label,
	).slice(0, FOOD_TRENDS_RISING);
	return {
		anchor: { key: anchor.key, label: anchor.label },
		geo: levels.geo,
		from: levels.months[0],
		to: levels.months.at(-1)!,
		top,
		rising,
	};
};

/** A query about trouble (a closure, a recall, an inspection): never on a public page. */
export const isNegativeQuery = (query: string): boolean =>
	query
		.toLowerCase()
		.split(/[^\p{L}\p{N}]+/u)
		.some(word => word && NEGATIVE_QUERY_WORDS.some(bad => word.startsWith(bad)));

// One query once, however Google spelled its plural ("squishy dumpling" and "squishy dumplings")
const breakoutKey = (query: string) =>
	termKey(query)
		.split(' ')
		.map(w => (w.length > 3 ? w.replace(/s$/, '') : w))
		.join(' ');

export const computeBreakouts = (
	related: FoodTrendsInput['related'],
	doNotListVenues: readonly string[],
): FoodTrendsBreakouts | undefined => {
	if (!related?.rows.length) return undefined;
	const kept = _.uniqBy(
		related.rows.filter(
			r =>
				!isNegativeQuery(r.query) &&
				!(doNotListVenues.length && isDenied(r.query, doNotListVenues)),
		),
		r => breakoutKey(r.query),
	);
	const queries: FoodTrendsBreakout[] = _.sortBy(
		kept,
		r => (r.breakout ? 0 : 1),
		r => -r.value,
		r => r.query,
	)
		.slice(0, FOOD_TRENDS_BREAKOUTS)
		.map(r => ({
			query: r.query,
			topic: r.topic,
			...(r.breakout ? { breakout: true } : { growth: r.value }),
		}));
	if (!queries.length) return undefined;
	const window = monthsUpTo(related.month, 12);
	return { from: window[0], to: related.month, queries };
};

const sumOver = (perMonth: Map<string, number> | undefined, months: string[]) =>
	_.sumBy(months, m => perMonth?.get(m) ?? 0);

export const computeTalked = (
	quarter: string,
	counts: TopicMentionCounts,
	topics: Map<string, FoodTrendsTopicInfo>,
): FoodTrendsTalked | undefined => {
	const now = quarterMonths(quarter);
	const before = quarterMonths(quarterBefore(quarter));
	const total = sumOver(counts.totals, now);
	if (total < MIN_QUARTER_MENTIONS) return undefined;
	const prevTotal = sumOver(counts.totals, before);
	const rows = [...counts.byTopic].flatMap(([key, perMonth]) => {
		const topic = topics.get(key);
		const mentions = sumOver(perMonth, now);
		if (!isFood(topic) || mentions < MIN_TOPIC_MENTIONS) return [];
		const share = round1((mentions / total) * 100);
		const gain =
			prevTotal >= MIN_QUARTER_MENTIONS ?
				round1(share - (sumOver(perMonth, before) / prevTotal) * 100)
			:	0;
		return [
			{
				key,
				label: topic.label,
				kind: topic.kind,
				share,
				mentions,
				...(gain > 0 && { gain }),
			},
		];
	});
	return {
		mentions: total,
		topics: _.sortBy(
			rows,
			r => -r.share,
			r => r.label,
		).slice(0, FOOD_TRENDS_TOP),
	};
};

export const computeOpenings = (
	openings: FoodTrendsInput['openings'],
): FoodTrendsOpenings | undefined => {
	if (!openings) return undefined;
	const closed = (c: VenueStatusCounts) => c.temporarilyClosed + c.permanentlyClosed;
	if (!openings.totals.opened && !closed(openings.totals)) return undefined;
	return {
		opened: openings.totals.opened,
		closed: closed(openings.totals),
		byTopic: _.sortBy(
			openings.byCategory
				.map(g => ({ label: g.key, opened: g.opened, closed: closed(g) }))
				.filter(g => g.opened + g.closed > 0),
			g => -g.opened,
			g => g.closed,
			g => g.label,
		).slice(0, FOOD_TRENDS_OPENINGS),
	};
};

/** The quarter as the public page shows it; each section absent when its data is. */
export const computeFoodTrends = (input: FoodTrendsInput): FoodTrendsData => {
	const searches = computeSearches(input.quarter, input.levels, input.topics);
	const breakouts = computeBreakouts(input.related, input.doNotListVenues);
	const talked = computeTalked(input.quarter, input.mentions, input.topics);
	const openings = computeOpenings(input.openings);
	return {
		months: quarterMonths(input.quarter),
		...(searches && { searches }),
		...(breakouts && { breakouts }),
		...(talked && { talked }),
		...(openings && { openings }),
	};
};
