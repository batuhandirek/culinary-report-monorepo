// Pure: one feedback theme in a city — its complaints, praise and noticed changes over six
// months, where it came up, and every sentence filed under it.

import _ from 'lodash';

import type { FeedbackUnit } from 'src/modules/feedback/entities/feedback-point.entity.js';
import { ownPostSql } from 'src/modules/social/util/accounts.js';
import type { FeedbackSentiment } from 'src/modules/venues/interfaces/feedback.interface.js';

import { themeDishOf, type ThemeFood, type ThemeSourceKind } from './theme-counts.js';

/** Which of a theme's lists: what guests criticised, praised, or noticed had changed since before */
export type ThemeSide = 'complaints' | 'praise' | 'changes';

/** One point of the theme, as `THEME_REVIEW_DETAIL_SQL` and `THEME_POST_DETAIL_SQL` select it. */
export interface ThemeDetailRow {
	id: string;
	/** YYYY-MM, UTC */
	month: string;
	kind: ThemeSourceKind;
	/** The review's or the post's id */
	source_id: string;
	brand_id: string;
	brand_name: string;
	venue_id: string | null;
	venue_name: string | null;
	sentiment: FeedbackSentiment;
	change: boolean;
	detail: string;
	dish: string | null;
	dish_key: string | null;
	food_topic_key: string | null;
	food_topic_label: string | null;
	amount: number | null;
	unit: FeedbackUnit | null;
	at: Date | string;
	stars: number | null;
	review_platform: string | null;
	text: string | null;
	post_platform: string | null;
	author: string | null;
	summary: string | null;
}

/** A month's sources with any row: what a side's share is of. */
export interface ThemeBaseMonth {
	month: string;
	kind: ThemeSourceKind;
	/** With a praise or complaint point */
	points: number;
	/** With a point or a noticed change */
	rows_any: number;
}

/** One source of the month with any row, and its brand: what a kind of food's share is of. */
export interface ThemeBaseSource {
	kind: ThemeSourceKind;
	source_id: string;
	brand_id: string;
	/** It has a praise or complaint point (else only noticed changes) */
	point: boolean;
}

export interface ThemeMonthFigures {
	month: string;
	reviews: number;
	posts: number;
	/** Of the month's written reviews with any point (a change for `changes`), percent */
	reviewShare: number | null;
	/** Of the month's posts by others with any point, percent */
	postShare: number | null;
}

export interface ThemeDetailFilters {
	side: ThemeSide;
	kind?: ThemeSourceKind;
	brandId?: string;
	/** A `dishes` row's key: `topic:<key>` or `dish:<key>` */
	dish?: string;
	/** A food topic's key: the brands whose food it is */
	food?: string;
	offset: number;
	limit: number;
}

export interface ThemeDetailPoint {
	id: string;
	detail: string;
	sentiment: FeedbackSentiment;
	dish?: string;
	foodTopic?: { key: string; label: string };
	amount?: number;
	unit?: FeedbackUnit;
	kind: ThemeSourceKind;
	sourceId: string;
	at: string;
	brand: { id: string; name: string };
	venue?: { id: string; name: string };
	stars?: number;
	reviewPlatform?: string;
	text?: string;
	postPlatform?: string;
	author?: string;
	summary?: string;
}

export interface ThemeDetail {
	/** Each side's sources this month */
	sides: { side: ThemeSide; reviews: number; posts: number }[];
	/** The picked side over the six months up to the month, oldest first */
	months: ThemeMonthFigures[];
	/** The picked side this month, with the change against the month before in points */
	current: ThemeMonthFigures & {
		reviewShareChange: number | null;
		postShareChange: number | null;
		brands: number;
	};
	/** The ten brands it came up at most */
	brands: { id: string; name: string; sources: number }[];
	/** The ten dishes its points were about most: a food topic's dishes as one */
	dishes: { key: string; label: string; foodTopic?: string; sources: number }[];
	/** The five kinds of food it came up at most, each as a share of its brands' sources */
	foods: { key: string; label: string; sources: number; share: number }[];
	/** The numbers its points state, per unit: a source stating two keeps its largest */
	amounts: { unit: FeedbackUnit; sources: number; median: number; min: number; max: number }[];
	/** The month's points of the side, filtered, newest first, one page */
	points: ThemeDetailPoint[];
	/** Points matching the filters */
	total: number;
	/** The reviews and posts those points come from */
	totalSources: number;
}

export const THEME_MONTHS = 6;
const TOP_BRANDS = 10;
const TOP_DISHES = 10;
const TOP_FOODS = 5;

const percent = (n: number, of: number): number | null =>
	of ? Math.round((n / of) * 1000) / 10 : null;
const pointsChange = (now: number | null, before: number | null): number | null =>
	now === null || before === null ? null : Math.round((now - before) * 10) / 10;

/** The `count` months ending with `month`, oldest first. */
export const monthsUpTo = (month: string, count: number): string[] => {
	const [year, m] = month.split('-').map(Number);
	return _.range(count - 1, -1, -1).map(back =>
		new Date(Date.UTC(year, m - 1 - back, 1)).toISOString().slice(0, 7),
	);
};

export const sideOf = (row: Pick<ThemeDetailRow, 'change' | 'sentiment'>): ThemeSide =>
	row.change ? 'changes'
	: row.sentiment === 'positive' ? 'praise'
	: 'complaints';

const median = (values: number[]): number => {
	const sorted = [...values].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

const pointOf = (r: ThemeDetailRow): ThemeDetailPoint => ({
	id: r.id,
	detail: r.detail,
	sentiment: r.sentiment,
	...(r.dish && { dish: r.dish }),
	...(r.food_topic_key && {
		foodTopic: { key: r.food_topic_key, label: r.food_topic_label ?? r.food_topic_key },
	}),
	...(r.amount != null && r.unit && { amount: r.amount, unit: r.unit }),
	kind: r.kind,
	sourceId: r.source_id,
	at: new Date(r.at).toISOString(),
	brand: { id: r.brand_id, name: r.brand_name },
	...(r.venue_id && { venue: { id: r.venue_id, name: r.venue_name ?? '' } }),
	...(r.stars != null && { stars: r.stars }),
	...(r.review_platform && { reviewPlatform: r.review_platform }),
	...(r.text && { text: r.text }),
	...(r.post_platform && { postPlatform: r.post_platform }),
	...(r.author && { author: r.author }),
	...(r.summary && { summary: r.summary }),
});

/**
 * One theme's page from its points over the six months up to `month`, the months' bases and the
 * month's sources (`baseSources`, for the kinds of food). A review or a post counts once per side,
 * however many points it files there; shares are of the month's sources with any point (any row,
 * changes included, for `changes`), as the Trends tab counts them. The figures are the whole
 * month's side; only `points` follows the filters. `foods` is brand id → its food (`brandFoods`).
 */
export const themeDetail = (input: {
	rows: ThemeDetailRow[];
	bases: ThemeBaseMonth[];
	baseSources: ThemeBaseSource[];
	month: string;
	foods: Map<string, ThemeFood>;
	filters: ThemeDetailFilters;
}): ThemeDetail => {
	const { rows, month, foods, filters } = input;
	const side = filters.side;
	const months = monthsUpTo(month, THEME_MONTHS);
	const baseOf = (m: string, kind: ThemeSourceKind) => {
		const b = input.bases.find(x => x.month === m && x.kind === kind);
		return (side === 'changes' ? b?.rows_any : b?.points) ?? 0;
	};
	const sources = (list: ThemeDetailRow[], kind: ThemeSourceKind) =>
		new Set(list.filter(r => r.kind === kind).map(r => r.source_id)).size;
	const sideRows = rows.filter(r => sideOf(r) === side);
	const figures = (m: string): ThemeMonthFigures => {
		const ofMonth = sideRows.filter(r => r.month === m);
		const reviews = sources(ofMonth, 'review');
		const posts = sources(ofMonth, 'post');
		return {
			month: m,
			reviews,
			posts,
			reviewShare: percent(reviews, baseOf(m, 'review')),
			postShare: percent(posts, baseOf(m, 'post')),
		};
	};
	const series = months.map(figures);
	const now = series[series.length - 1];
	const before = series[series.length - 2];
	const monthRows = sideRows.filter(r => r.month === month);
	const sourceKey = (r: { kind: string; source_id: string }) => `${r.kind}:${r.source_id}`;

	const brands = Object.values(_.groupBy(monthRows, r => r.brand_id))
		.map(list => ({
			id: list[0].brand_id,
			name: list[0].brand_name,
			sources: new Set(list.map(sourceKey)).size,
		}))
		.sort((a, b) => b.sources - a.sources || a.name.localeCompare(b.name));

	const dishGroups = new Map<
		string,
		{ label?: string; topic?: string; spellings: Map<string, number>; sources: Set<string> }
	>();
	for (const r of monthRows) {
		const dish = themeDishOf(r);
		if (!dish) continue;
		const g = dishGroups.get(dish.key) ?? {
			label: dish.topicLabel,
			topic: dish.topic,
			spellings: new Map(),
			sources: new Set(),
		};
		g.spellings.set(dish.spelling, (g.spellings.get(dish.spelling) ?? 0) + 1);
		g.sources.add(sourceKey(r));
		dishGroups.set(dish.key, g);
	}
	const dishes = [...dishGroups.entries()]
		.map(([key, g]) => ({
			key,
			label:
				g.label ??
				[...g.spellings.entries()].sort(
					(a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
				)[0][0],
			...(g.topic && { foodTopic: g.topic }),
			sources: g.sources.size,
		}))
		.sort((a, b) => b.sources - a.sources || a.label.localeCompare(b.label))
		.slice(0, TOP_DISHES);

	const foodBase = new Map<string, Set<string>>();
	for (const s of input.baseSources) {
		const food = foods.get(s.brand_id);
		if (
			!food ||
			(side !== 'changes' && !s.point) ||
			(side === 'changes' && s.kind !== 'review')
		)
			continue;
		foodBase.set(food.key, (foodBase.get(food.key) ?? new Set<string>()).add(sourceKey(s)));
	}
	const foodSources = new Map<string, { food: ThemeFood; sources: Set<string> }>();
	for (const r of monthRows) {
		const food = foods.get(r.brand_id);
		if (!food) continue;
		const f = foodSources.get(food.key) ?? { food, sources: new Set<string>() };
		f.sources.add(sourceKey(r));
		foodSources.set(food.key, f);
	}
	const foodRows = [...foodSources.values()]
		.map(f => ({
			key: f.food.key,
			label: f.food.label,
			sources: f.sources.size,
			share: percent(f.sources.size, foodBase.get(f.food.key)?.size ?? 0) ?? 0,
		}))
		.sort((a, b) => b.sources - a.sources || a.label.localeCompare(b.label))
		.slice(0, TOP_FOODS);

	const stated = monthRows.filter(r => r.amount != null && r.unit);
	const amounts = Object.entries(_.groupBy(stated, r => r.unit))
		.map(([unit, list]) => {
			const perSource = Object.values(_.groupBy(list, r => sourceKey(r))).map(g =>
				_.max(g.map(r => r.amount!))!,
			);
			return {
				unit: unit as FeedbackUnit,
				sources: perSource.length,
				median: median(perSource),
				min: _.min(perSource)!,
				max: _.max(perSource)!,
			};
		})
		.sort((a, b) => b.sources - a.sources);

	const filtered = monthRows
		.filter(
			r =>
				(!filters.kind || r.kind === filters.kind) &&
				(!filters.brandId || r.brand_id === filters.brandId) &&
				(!filters.dish || themeDishOf(r)?.key === filters.dish) &&
				(!filters.food || foods.get(r.brand_id)?.key === filters.food),
		)
		.sort(
			(a, b) =>
				new Date(b.at).getTime() - new Date(a.at).getTime() || a.id.localeCompare(b.id),
		);

	const sideCount = (s: ThemeSide) => {
		const list = rows.filter(r => r.month === month && sideOf(r) === s);
		return { side: s, reviews: sources(list, 'review'), posts: sources(list, 'post') };
	};

	return {
		sides: (['complaints', 'praise', 'changes'] as const).map(sideCount),
		months: series,
		current: {
			...now,
			reviewShareChange: pointsChange(now.reviewShare, before?.reviewShare ?? null),
			postShareChange: pointsChange(now.postShare, before?.postShare ?? null),
			brands: brands.length,
		},
		brands: brands.slice(0, TOP_BRANDS),
		dishes,
		foods: foodRows,
		amounts,
		points: filtered.slice(filters.offset, filters.offset + filters.limit).map(pointOf),
		total: filtered.length,
		totalSources: new Set(filtered.map(sourceKey)).size,
	};
};

const REVIEW_WRITTEN = `r.analysed_at is not null and coalesce(r.text_translated, r.text, '') <> ''`;
const MONTH = (column: string) => `to_char(${column} at time zone 'UTC', 'YYYY-MM')`;
const DISH = `f.dish, f.dish_key, ft.key as food_topic_key, ft.label as food_topic_label, f.amount, f.unit`;

/** `ThemeDetailRow`s of one theme (`?`) in a city's written, analysed reviews in [start, end). */
export const THEME_REVIEW_DETAIL_SQL = `select f.id::text as id, ${MONTH('r.published_at')} as month, 'review' as kind,
		r.id::text as source_id, v.brand_id::text as brand_id, b.name as brand_name, v.id::text as venue_id, v.name as venue_name,
		f.sentiment, f.change, f.detail, ${DISH},
		r.published_at as at, r.stars, r.platform as review_platform, left(coalesce(r.text_translated, r.text), 400) as text,
		null as post_platform, null as author, null as summary
	from feedback_points f
	join reviews r on r.id = f.review_id
	join venues v on v.id = r.venue_id
	join brands b on b.id = v.brand_id
	left join topics ft on ft.id = f.food_topic_id
	where f.theme = ? and f.detail is not null and v.city_id = ? and r.published_at >= ? and r.published_at < ? and ${REVIEW_WRITTEN}`;

/** `ThemeDetailRow`s of one theme (`?`) in a city's mentions matched to a brand in [start, end), own posts out. */
export const THEME_POST_DETAIL_SQL = `select f.id::text as id, ${MONTH('p.posted_at')} as month, 'post' as kind,
		p.id::text as source_id, m.brand_id::text as brand_id, b.name as brand_name, v.id::text as venue_id, v.name as venue_name,
		f.sentiment, f.change, f.detail, ${DISH},
		p.posted_at as at, null as stars, null as review_platform, null as text,
		p.platform as post_platform, p.author, m.summary
	from feedback_points f
	join mentions m on m.id = f.mention_id
	join social_posts p on p.id = m.post_id
	join brands b on b.id = m.brand_id
	left join venues v on v.id = m.venue_id
	left join topics ft on ft.id = f.food_topic_id
	where f.theme = ? and f.detail is not null and p.city_id = ? and p.posted_at >= ? and p.posted_at < ?
		and not ${ownPostSql('p', 'm.brand_id')}`;

/** `ThemeBaseMonth`s of a city's written reviews and posts by others in [start, end): city, start, end twice. */
export const THEME_BASE_SQL = `select ${MONTH('r.published_at')} as month, 'review' as kind,
		(count(distinct r.id) filter (where not f.change))::int as points, count(distinct r.id)::int as rows_any
	from reviews r
	join venues v on v.id = r.venue_id
	join feedback_points f on f.review_id = r.id and f.detail is not null
	where v.city_id = ? and r.published_at >= ? and r.published_at < ? and ${REVIEW_WRITTEN}
	group by 1
	union all
	select ${MONTH('p.posted_at')} as month, 'post' as kind, count(distinct p.id)::int as points, count(distinct p.id)::int as rows_any
	from mentions m
	join social_posts p on p.id = m.post_id
	join feedback_points f on f.mention_id = m.id and f.detail is not null and not f.change
	where p.city_id = ? and p.posted_at >= ? and p.posted_at < ? and m.brand_id is not null
		and not ${ownPostSql('p', 'm.brand_id')}
	group by 1`;

/** `ThemeBaseSource`s of a city's month [start, end): city, start, end twice. */
export const THEME_BASE_SOURCES_SQL = `select 'review' as kind, r.id::text as source_id, v.brand_id::text as brand_id, bool_or(not f.change) as point
	from reviews r
	join venues v on v.id = r.venue_id
	join feedback_points f on f.review_id = r.id and f.detail is not null
	where v.city_id = ? and r.published_at >= ? and r.published_at < ? and ${REVIEW_WRITTEN}
	group by r.id, v.brand_id
	union all
	select 'post' as kind, p.id::text as source_id, m.brand_id::text as brand_id, true as point
	from mentions m
	join social_posts p on p.id = m.post_id
	join feedback_points f on f.mention_id = m.id and f.detail is not null and not f.change
	where p.city_id = ? and p.posted_at >= ? and p.posted_at < ? and m.brand_id is not null
		and not ${ownPostSql('p', 'm.brand_id')}
	group by p.id, m.brand_id`;
