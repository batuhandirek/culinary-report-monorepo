import _ from 'lodash';

import type { FoodTopicIndex } from 'src/modules/food-topics/util/food-topics.js';
import type {
	CityTrends,
	TrendShareRow,
} from 'src/modules/trends/interfaces/city-trends.interface.js';
import type { TrendMention } from 'src/modules/trends/util/compute-trends.js';

import type {
	ReportBaselineMetric,
	ReportCitySection,
	ReportCuisinePlacement,
	ReportTrendRow,
} from '../interfaces/report-data.interface.js';

/** Below this many matched mentions in the city, the month says too little: no city section. */
export const CITY_SECTION_MIN_MENTIONS = 200;
/** Rising rows per table */
const RISING_ROWS = 5;
/** A row needs this many sources this month to count as rising: one post is no trend */
const RISING_MIN_COUNT = 3;

/** A report venue's month for the baseline: posts by others, their views, its reviews. */
export interface BaselineVenue {
	brandId: string;
	posts: number;
	views: number;
	avgStars?: number;
	/** 0–1 */
	replyRate?: number;
}

/** A review of a report venue this month, for its average and reply rate. */
export interface BaselineReview {
	brandId: string;
	stars?: number | null;
	replied: boolean;
}

export const median = (values: number[]): number | undefined => {
	if (!values.length) return undefined;
	const sorted = [...values].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

/**
 * The share of `others` that `value` is ahead of, ties counted half, 0–100 rounded. Undefined
 * without others to compare with.
 */
export const percentileAmong = (value: number, others: number[]): number | undefined => {
	if (!others.length) return undefined;
	const below = others.filter(v => v < value).length;
	const ties = others.filter(v => v === value).length;
	return Math.round(((below + ties / 2) / others.length) * 100);
};

const metric = (
	brandId: string,
	rows: BaselineVenue[],
	pick: (row: BaselineVenue) => number | undefined,
): ReportBaselineMetric => {
	const valued = rows.filter(r => pick(r) !== undefined);
	const own = valued.find(r => r.brandId === brandId);
	const values = valued.map(r => pick(r)!);
	const median_ = median(values);
	return {
		venue: own ? pick(own) : undefined,
		median: median_ === undefined ? undefined : Math.round(median_ * 100) / 100,
		percentile:
			own ?
				percentileAmong(
					pick(own)!,
					valued.filter(r => r !== own).map(r => pick(r)!),
				)
			:	undefined,
		venues: valued.length,
	};
};

/** The venue's posts, views, average stars and reply rate against the month's report venues. */
export const cityBaseline = (
	brandId: string,
	rows: BaselineVenue[],
): ReportCitySection['baseline'] => ({
	venues: rows.length,
	posts: metric(brandId, rows, r => r.posts),
	views: metric(brandId, rows, r => r.views),
	avgStars: metric(brandId, rows, r => r.avgStars),
	replyRate: metric(brandId, rows, r => r.replyRate),
});

/**
 * Each report venue's month, from the city's trend mentions (own posts already left out) and its
 * reviews. A venue nobody posted about has zero posts and views; one without reviews has no
 * average or reply rate. Rounded as `summarizeReport` rounds them.
 */
export const baselineVenues = (
	brandIds: string[],
	mentions: TrendMention[],
	reviews: BaselineReview[],
): BaselineVenue[] => {
	const byBrand = _.groupBy(mentions, m => m.brandId);
	const reviewsByBrand = _.groupBy(reviews, r => r.brandId);
	return _.uniq(brandIds).map(brandId => {
		const posts = _.uniqBy(byBrand[brandId] ?? [], m => m.postId);
		const own = reviewsByBrand[brandId] ?? [];
		const rated = own.filter(r => typeof r.stars === 'number');
		return {
			brandId,
			posts: posts.length,
			views: _.sumBy(posts, p => p.views),
			avgStars:
				rated.length ? Math.round(_.meanBy(rated, r => r.stars!) * 10) / 10 : undefined,
			replyRate: own.length ? own.filter(r => r.replied).length / own.length : undefined,
		};
	});
};

/**
 * The venue's kind of food (its primary food topic, `VenueFoodTopicService.tags`) and its place
 * by views among the venues posts named for that food or a kind of it this month (a ramen post
 * counts for Japanese).
 */
export const cuisinePlacement = (
	brandId: string,
	venueTopic: string | null | undefined,
	mentions: TrendMention[],
	cuisines: TrendShareRow[],
	index: FoodTopicIndex,
): ReportCuisinePlacement | undefined => {
	const key = venueTopic;
	if (!key || !index.get(key)) return undefined;

	// Venues posts named for this food, ranked by the views of their posts this month
	const ofKind = new Set(
		mentions
			.filter(m => index.withParents(m.topics).includes(key))
			.map(m => m.brandId),
	);
	const views = (id: string) =>
		_.sumBy(
			_.uniqBy(
				mentions.filter(m => m.brandId === id),
				m => m.postId,
			),
			m => m.views,
		);
	const ranked = _.orderBy(
		[...ofKind].map(id => ({ id, views: views(id) })),
		[r => r.views, r => r.id],
		['desc', 'asc'],
	);
	const rank = ranked.findIndex(r => r.id === brandId);
	const row = cuisines.find(r => r.key === key && !r.other);
	return {
		key,
		label: index.get(key)!.label,
		venues: ranked.length,
		rank: rank >= 0 ? rank + 1 : undefined,
		...(row && { share: row.share, prevShare: row.prevShare, delta: row.delta }),
	};
};

/** The rows that gained the most share, at least `RISING_MIN_COUNT` sources this month. */
export const risingRows = (rows: TrendShareRow[]): ReportTrendRow[] =>
	_.orderBy(
		rows.filter(r => !r.other && r.delta > 0 && r.count >= RISING_MIN_COUNT),
		[r => r.delta, r => r.count],
		['desc', 'desc'],
	)
		.slice(0, RISING_ROWS)
		.map(r => _.pick(r, ['key', 'label', 'count', 'share', 'prevShare', 'delta']));

/**
 * The report's city section, or undefined when the city's month has too few matched mentions
 * to say what it is talking about.
 */
export const citySection = (input: {
	cityName: string;
	brandId: string;
	/** The venue's primary food topic */
	venueTopic?: string | null;
	index: FoodTopicIndex;
	trends: CityTrends;
	mentions: TrendMention[];
	baseline: BaselineVenue[];
}): ReportCitySection | undefined => {
	if (input.trends.totals.mentions < CITY_SECTION_MIN_MENTIONS) return undefined;
	return {
		cityName: input.cityName,
		mentions: input.trends.totals.mentions,
		risingCuisines: risingRows(input.trends.cuisines),
		risingDishes: risingRows(input.trends.dishes),
		cuisine: cuisinePlacement(
			input.brandId,
			input.venueTopic,
			input.mentions,
			input.trends.cuisines,
			input.index,
		),
		baseline: cityBaseline(input.brandId, input.baseline),
	};
};
