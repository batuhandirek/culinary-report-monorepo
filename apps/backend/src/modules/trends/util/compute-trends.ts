import _ from 'lodash';

import { FoodTopicKindEnum } from 'src/modules/food-topics/entities/food-topic.entity.js';
import type { FoodTopicIndex } from 'src/modules/food-topics/util/food-topics.js';
import { dishKey } from 'src/modules/reports/util/summarize-report.js';
import type { FeedbackDish } from 'src/modules/venues/interfaces/feedback.interface.js';

import type {
	CityTrends,
	CityTrendsTotals,
	TrendRisingBrandRow,
	TrendShareRow,
} from '../interfaces/city-trends.interface.js';

/**
 * A matched mention in a post by someone other than the brand. Counted per brand: a chain's
 * branches are one; `district` is the branch's, null when the post named the brand only.
 */
export interface TrendMention {
	brandId: string;
	brandName: string;
	district: string | null;
	category: string | null;
	cuisine: string | null;
	dishes: FeedbackDish[];
	postId: string;
	/** The post's creator (`Creator.name`): one person's accounts count as one */
	creator: string | null;
	views: number;
}

/** A Google review that names dishes. */
export interface TrendReview {
	brandId: string;
	brandName: string;
	dishes: FeedbackDish[];
}

export interface TrendMonthInput {
	mentions: TrendMention[];
	reviews: TrendReview[];
}

// Rows per table before the rest folds into "Other"
const TABLE_ROWS = { cuisines: 15, dishes: 20, districts: 12, creators: 15 };
const TOP_VENUES = 50;
const RISING_ROWS = 15;
const SAMPLE_VENUES = 3;

const round1 = (x: number) => Math.round(x * 10) / 10;
const pct = (n: number, total: number) => (total ? round1((n / total) * 100) : 0);

interface Tally {
	count: number;
	views: number;
	venues: Map<string, { name: string; n: number }>;
	labels: Map<string, number>;
}

class Tallies {
	readonly map = new Map<string, Tally>();

	add(
		key: string,
		opts: { views?: number; venue?: { id: string; name: string }; label?: string },
	) {
		const tally = this.map.get(key) ?? {
			count: 0,
			views: 0,
			venues: new Map(),
			labels: new Map(),
		};
		tally.count++;
		tally.views += opts.views ?? 0;
		if (opts.venue) {
			const v = tally.venues.get(opts.venue.id) ?? { name: opts.venue.name, n: 0 };
			v.n++;
			tally.venues.set(opts.venue.id, v);
		}
		if (opts.label) tally.labels.set(opts.label, (tally.labels.get(opts.label) ?? 0) + 1);
		this.map.set(key, tally);
	}

	get count() {
		return _.sumBy([...this.map.values()], t => t.count);
	}

	get views() {
		return _.sumBy([...this.map.values()], t => t.views);
	}
}

/**
 * The month's leading rows with their share now and before, the rest folded into "Other", so
 * both months' shares add up to 100. `by` is what is shared out: the count, or the views.
 */
const shareTable = (
	cur: Tallies,
	prev: Tallies,
	opts: {
		rows: number;
		label: (key: string, tally: Tally) => string;
		by?: 'count' | 'views';
		views: boolean;
		samples: boolean;
	},
): TrendShareRow[] => {
	const by = opts.by ?? 'count';
	const total = by === 'count' ? cur.count : cur.views;
	const prevTotal = by === 'count' ? prev.count : prev.views;
	const [views, prevViews] = [cur.views, prev.views];
	const ranked = _.orderBy(
		[...cur.map.entries()],
		[([, t]) => t[by], ([, t]) => (by === 'count' ? t.views : t.count), ([key]) => key],
		['desc', 'desc', 'asc'],
	);
	const row = (
		base: Pick<TrendShareRow, 'key' | 'label' | 'other'>,
		t: Pick<Tally, 'count' | 'views'>,
		p: Pick<Tally, 'count' | 'views'>,
	): TrendShareRow => {
		const share = pct(t[by], total);
		const prevShare = pct(p[by], prevTotal);
		return {
			...base,
			count: t.count,
			prevCount: p.count,
			share,
			prevShare,
			delta: round1(share - prevShare),
			...(opts.views ? viewShares(t.views, p.views, views, prevViews) : {}),
		};
	};
	const none = { count: 0, views: 0 };

	const rows: TrendShareRow[] = ranked.slice(0, opts.rows).map(([key, t]) => ({
		...row({ key, label: opts.label(key, t) }, t, prev.map.get(key) ?? none),
		...(opts.samples ?
			{
				sampleVenues: _.orderBy([...t.venues.entries()], ([, v]) => v.n, 'desc')
					.slice(0, SAMPLE_VENUES)
					.map(([id, v]) => ({ id, name: v.name })),
			}
		:	{}),
	}));

	const listed = new Set(rows.map(r => r.key));
	const rest = ranked.slice(opts.rows).map(([, t]) => t);
	const prevRest = [...prev.map.entries()].filter(([key]) => !listed.has(key)).map(([, t]) => t);
	if (rest.length || prevRest.length) {
		const sum = (ts: Tally[]) => ({
			count: _.sumBy(ts, t => t.count),
			views: _.sumBy(ts, t => t.views),
		});
		rows.push(row({ key: '__other', label: 'Other', other: true }, sum(rest), sum(prevRest)));
	}
	return rows;
};

const viewShares = (v: number, pv: number, total: number, prevTotal: number) => {
	const viewsShare = pct(v, total);
	const prevViewsShare = pct(pv, prevTotal);
	return { viewsShare, prevViewsShare, viewsDelta: round1(viewsShare - prevViewsShare) };
};

/** The most common spelling of a key */
const topLabel = (t: Tally, fallback: string) =>
	_.maxBy([...t.labels.entries()], ([, n]) => n)?.[0] ?? fallback;

/** One month's tallies. */
// What a venue is known for, before a diet or a kind of place
const FOOD_KINDS = new Set([FoodTopicKindEnum.CUISINE, FoodTopicKindEnum.DISH]);

/**
 * The one topic a mention counts for in the trend tables (each sums to 100): the first cuisine or
 * dish its cuisine names ("Vegan Döner": döner), else its first topic of any kind, else the
 * venue's Google category's the same way; null for none.
 */
export const mentionTopic = (
	m: Pick<TrendMention, 'cuisine' | 'category'>,
	index: FoodTopicIndex,
): string | null => {
	const keys = index.resolveMention(m.cuisine, m.category);
	return keys.find(k => FOOD_KINDS.has(index.get(k)!.kind)) ?? keys[0] ?? null;
};

const DISH_KINDS = new Set([FoodTopicKindEnum.DISH, FoodTopicKindEnum.DRINK]);

/** The dish or drink topic a key is, if any: its row is labelled with the topic's label. */
const dishTopic = (key: string, index: FoodTopicIndex) => {
	const topic = index.get(key);
	return topic && DISH_KINDS.has(topic.kind) ? topic : undefined;
};

/**
 * The row a dish name counts in on the city's dish table: the dish or drink topic the name names
 * as a whole, as written or singular ("döner", "doner kebab", "kebabs": kebab), else its
 * `dishKey` ("vegetable kebab" stays apart). A venue's report keeps `dishKey` only.
 */
export const dishRow = (name: string, index: FoodTopicIndex): string => {
	const key = dishKey(name);
	if (!key) return '';
	const topic = index.exact(name) ?? index.exact(key);
	return topic && dishTopic(topic, index) ? topic : key;
};

const tally = ({ mentions, reviews }: TrendMonthInput, index: FoodTopicIndex) => {
	const cuisines = new Tallies();
	const dishes = new Tallies();
	const districts = new Tallies();
	const creators = new Map<string, { posts: Set<string>; views: number; venues: Set<string> }>();
	const venuePosts = new Map<
		string,
		{
			name: string;
			district: string | null;
			category: string | null;
			posts: Set<string>;
			views: number;
		}
	>();
	const posts = new Map<string, number>();
	let dishSources = 0;
	// Each post or review counts a row once, however many of its names fall in it
	const rowsOf = (named: FeedbackDish[] | null | undefined) =>
		_.uniqBy(
			(named ?? []).map(d => [dishRow(d.name, index), d] as const).filter(([row]) => row),
			([row]) => row,
		);

	for (const m of mentions) {
		const venue = { id: m.brandId, name: m.brandName };
		posts.set(m.postId, m.views);
		// What the post says it is, else what Google says the venue is
		const cuisine = mentionTopic(m, index);
		if (cuisine) cuisines.add(cuisine, { views: m.views, venue });
		if (m.district) districts.add(m.district, { views: m.views, venue });

		const named = rowsOf(m.dishes);
		for (const [row, d] of named) dishes.add(row, { venue, label: d.name });
		if (named.length) dishSources++;

		if (m.creator) {
			const c = creators.get(m.creator) ?? { posts: new Set(), views: 0, venues: new Set() };
			if (!c.posts.has(m.postId)) c.views += m.views;
			c.posts.add(m.postId);
			c.venues.add(m.brandId);
			creators.set(m.creator, c);
		}

		const v = venuePosts.get(m.brandId) ?? {
			name: m.brandName,
			district: m.district,
			category: m.category,
			posts: new Set(),
			views: 0,
		};
		if (!v.posts.has(m.postId)) v.views += m.views;
		v.posts.add(m.postId);
		venuePosts.set(m.brandId, v);
	}

	for (const r of reviews) {
		const named = rowsOf(r.dishes);
		for (const [row, d] of named)
			dishes.add(row, {
				venue: { id: r.brandId, name: r.brandName },
				label: d.name,
			});
		if (named.length) dishSources++;
	}

	// Creators count once per post: their reach is the views of their posts
	const creatorTallies = new Tallies();
	for (const [creator, c] of creators) {
		creatorTallies.map.set(creator, {
			count: c.posts.size,
			views: c.views,
			venues: new Map(),
			labels: new Map(),
		});
	}
	const creatorVenues = new Map([...creators].map(([a, c]) => [a, c.venues.size]));

	const ranking = _.orderBy(
		[...venuePosts.entries()],
		[([, v]) => v.posts.size, ([, v]) => v.views],
		['desc', 'desc'],
	).slice(0, TOP_VENUES);

	const totals: CityTrendsTotals = {
		mentions: mentions.length,
		posts: posts.size,
		views: _.sum([...posts.values()]),
		dishSources,
	};
	return {
		cuisines,
		dishes,
		districts,
		creatorTallies,
		creatorVenues,
		ranking,
		totals,
		postCount: posts.size,
	};
};

/** Creators by reach: their share of the month's views; `count` is their posts. */
const creatorTable = (
	cur: ReturnType<typeof tally>,
	prev: ReturnType<typeof tally>,
): TrendShareRow[] =>
	shareTable(cur.creatorTallies, prev.creatorTallies, {
		rows: TABLE_ROWS.creators,
		label: key => `@${key}`,
		by: 'views',
		views: false,
		samples: false,
	}).map(row =>
		row.other ? row : (
			{
				...row,
				views: cur.creatorTallies.map.get(row.key)?.views,
				venues: cur.creatorVenues.get(row.key),
			}
		),
	);

const risingTable = (
	cur: ReturnType<typeof tally>,
	prev: ReturnType<typeof tally>,
): TrendRisingBrandRow[] => {
	const prevRank = new Map(prev.ranking.map(([id], i) => [id, i + 1]));
	const prevPosts = new Map(prev.ranking.map(([id, v]) => [id, v.posts.size]));
	const rows = cur.ranking.map(([id, v], i): TrendRisingBrandRow => {
		const share = pct(v.posts.size, cur.postCount);
		const pp = prevPosts.get(id) ?? 0;
		const prevShare = pct(pp, prev.postCount);
		return {
			brandId: id,
			name: v.name,
			district: v.district ?? undefined,
			category: v.category ?? undefined,
			posts: v.posts.size,
			prevPosts: pp,
			rank: i + 1,
			prevRank: prevRank.get(id),
			share,
			prevShare,
			delta: round1(share - prevShare),
		};
	});
	// New in the top 50 or climbing, the biggest climb first
	const climb = (r: TrendRisingBrandRow) => (r.prevRank ?? TOP_VENUES + 1) - r.rank;
	return _.orderBy(
		rows.filter(r => climb(r) > 0),
		[climb, r => r.posts],
		['desc', 'desc'],
	).slice(0, RISING_ROWS);
};

/** The month's trend tables against the month before. Pure: the service feeds it rows and the topics. */
export const computeTrends = (
	month: string,
	previousMonth: string,
	current: TrendMonthInput,
	previous: TrendMonthInput,
	index: FoodTopicIndex,
): CityTrends => {
	const cur = tally(current, index);
	const prev = tally(previous, index);
	return {
		month,
		previousMonth,
		totals: cur.totals,
		prevTotals: prev.totals,
		cuisines: shareTable(cur.cuisines, prev.cuisines, {
			rows: TABLE_ROWS.cuisines,
			label: key => index.get(key)?.label ?? key,
			views: true,
			samples: true,
		}),
		dishes: shareTable(cur.dishes, prev.dishes, {
			rows: TABLE_ROWS.dishes,
			label: (key, t) => dishTopic(key, index)?.label ?? topLabel(t, key),
			views: false,
			samples: true,
		}),
		districts: shareTable(cur.districts, prev.districts, {
			rows: TABLE_ROWS.districts,
			label: key => key,
			views: true,
			samples: false,
		}),
		creators: creatorTable(cur, prev),
		risingBrands: risingTable(cur, prev),
	};
};
