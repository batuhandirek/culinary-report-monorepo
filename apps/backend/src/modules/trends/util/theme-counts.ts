// Pure: counting what a city's reviews and posts praise and criticise, per feedback theme, across
// every venue in it.

import { ownPostSql } from 'src/modules/social/util/accounts.js';
import {
	FEEDBACK_THEMES,
	type FeedbackTheme,
	isFeedbackTheme,
} from 'src/modules/venues/constants/feedback-themes.constant.js';
import type { FeedbackTopic } from 'src/modules/venues/interfaces/feedback.interface.js';

export type ThemePolarity = 'praise' | 'complaint';
export type ThemeSourceKind = 'review' | 'post';

/** One praise or complaint point of a review or a post, as `THEME_REVIEW_POINTS_SQL` and `THEME_POST_POINTS_SQL` select it. */
export interface ThemePointRow {
	/** YYYY-MM, UTC */
	month: string;
	kind: ThemeSourceKind;
	/** The review's or the post's id: a source counts once per theme and polarity */
	source_id: string;
	brand_id: string;
	brand_name: string;
	polarity: ThemePolarity;
	/** Null for a point stored before themes and not backfilled yet */
	theme: string | null;
	detail: string | null;
	/** A post by one of the brand's own accounts (`ownPostSql`); false for reviews */
	own: boolean;
	/** The dish the point is about (`FeedbackPoint.dish`), as spelled, and its key */
	dish?: string | null;
	dish_key?: string | null;
	/** The dish's food topic, when it has one: dishes of one topic are one row */
	food_topic_key?: string | null;
	food_topic_label?: string | null;
}

/** A kind of food (a food topic): a brand's is the main one of most of its places (`brandFoods`). */
export interface ThemeFood {
	key: string;
	label: string;
}

/** One kind of food a theme came up at. */
export interface ThemeFoodRow extends ThemeFood {
	/** Reviews and posts of its brands raising the theme */
	sources: number;
	/** Of its brands' reviews and posts with any point this month, percent */
	share: number;
}

/** One kind of food in the month: its brands' reviews and posts with any point. */
export interface ThemeFoodCoverage extends ThemeFood {
	reviews: number;
	posts: number;
	brands: number;
}

/** One dish a theme's sources were about: a food topic ("Döner & kebab") or, without one, the dish itself. */
export interface ThemeDishRow {
	/** `topic:<food topic key>` or `dish:<dish key>` */
	key: string;
	/** The topic's label, else the dish as most often spelled */
	label: string;
	/** The food topic, for a link to its page */
	foodTopic?: string;
	/** Reviews and posts raising the theme about it, each once */
	sources: number;
	/** Of the reviews and posts with a point of this side about it, percent */
	share: number;
}

export interface ThemeBrand {
	id: string;
	name: string;
	/** Its reviews and posts raising the theme */
	sources: number;
}

/** One theme in one polarity, in a city and month. */
export interface ThemeRow {
	key: FeedbackTheme;
	topic: FeedbackTopic;
	label: string;
	/** Written reviews raising it */
	reviews: number;
	/** Posts by others raising it */
	posts: number;
	/** Of the month's written reviews with any point, percent; null without any */
	reviewShare: number | null;
	/** Of the month's posts by others with any point, percent; null without any */
	postShare: number | null;
	/** Against the month before, in percentage points; null when either month has none */
	reviewShareChange: number | null;
	postShareChange: number | null;
	/** Brands it came up at, reviews and posts together */
	venues: number;
	/** The three it came up at most */
	topBrands: ThemeBrand[];
	/** The three kinds of food it came up at most, by the brands' food */
	foods: ThemeFoodRow[];
	/** The five dishes its points were about most (`FeedbackPoint.dish`) */
	dishes: ThemeDishRow[];
	/** Up to five distinct details, in row order (newest first) */
	samples: string[];
}

/** What the counts stand on. */
export interface ThemeCoverage {
	/** The month's written reviews with any praise or complaint point */
	reviews: number;
	/** The brands those reviews are of: reviews are scraped for report venues and their competitors only */
	reviewBrands: number;
	/** The month's posts by others with any point about a matched venue */
	posts: number;
	postBrands: number;
	/** Of those, the ones with a point not filed under a theme yet: counted under no theme */
	unfiledReviews: number;
	unfiledPosts: number;
}

export interface ThemeCounts {
	praise: ThemeRow[];
	complaints: ThemeRow[];
	coverage: ThemeCoverage;
}

const SAMPLES = 5;
const TOP_BRANDS = 3;
const TOP_FOODS = 3;
const TOP_DISHES = 5;

/** A point's dish as one row: its food topic when it has one ("döner" and "doner kebab" are kebab), else its key. */
export const themeDishOf = (
	r: Pick<ThemePointRow, 'dish' | 'dish_key' | 'food_topic_key' | 'food_topic_label'>,
): { key: string; topic?: string; topicLabel?: string; spelling: string } | null => {
	if (!r.dish) return null;
	if (r.food_topic_key) return { key: `topic:${r.food_topic_key}`, topic: r.food_topic_key, topicLabel: r.food_topic_label ?? r.food_topic_key, spelling: r.dish };
	const key = r.dish_key || r.dish.trim().toLowerCase();
	return key ? { key: `dish:${key}`, spelling: r.dish } : null;
};

const percent = (n: number, of: number): number | null => (of ? Math.round((n / of) * 1000) / 10 : null);
const pointsChange = (now: number | null, before: number | null): number | null =>
	now === null || before === null ? null : Math.round((now - before) * 10) / 10;

interface Tally {
	reviews: Set<string>;
	posts: Set<string>;
	/** Per brand, its sources (`review:<id>` / `post:<id>`) */
	brands: Map<string, Set<string>>;
	/** Per kind of food, its sources */
	foods: Map<string, Set<string>>;
	/** Per dish row (`themeDishOf`), its sources */
	dishes: Map<string, Set<string>>;
	samples: string[];
	seen: Set<string>;
}

/**
 * Counts the month's themes, praise and complaints apart, over rows of `month` and `previous`
 * (the month before, for the change). A review or a post counts once per theme and polarity,
 * however often it raises it, so "prices went up" and "way more than before" in two reviews are
 * two, in one review one. A brand's own posts are left out. A point without a known theme counts
 * under none: its source is counted in `coverage` as unfiled, never under a catch-all. `foods`
 * (brand id → its food, `brandFoods`) breaks each theme down by kind of food.
 */
export const countThemes = (
	rows: ThemePointRow[],
	month: string,
	previous: string,
	foods: Map<string, ThemeFood> = new Map(),
): ThemeCounts => {
	const base = { [month]: { review: new Set<string>(), post: new Set<string>() }, [previous]: { review: new Set<string>(), post: new Set<string>() } };
	const unfiled = { review: new Set<string>(), post: new Set<string>() };
	const brandsWithPoints = { review: new Set<string>(), post: new Set<string>() };
	const tallies = new Map<string, Tally>();
	const before = new Map<string, { review: Set<string>; post: Set<string> }>();
	const names = new Map<string, string>();
	/** Per kind of food, the month's sources with any point */
	const foodBase = new Map<string, Set<string>>();
	/** Per side and dish row, the month's sources with a point of that side about it */
	const dishBase = new Map<string, Set<string>>();
	/** Per dish row, its topic and how it is spelled */
	const dishNames = new Map<string, { topic?: string; topicLabel?: string; spellings: Map<string, number> }>();

	for (const r of rows) {
		if (r.own || !base[r.month]) continue;
		base[r.month][r.kind].add(r.source_id);
		const known = r.theme !== null && isFeedbackTheme(r.theme);
		if (r.month === previous) {
			if (!known) continue;
			const key = `${r.polarity}:${r.theme}`;
			const prev = before.get(key) ?? { review: new Set<string>(), post: new Set<string>() };
			prev[r.kind].add(r.source_id);
			before.set(key, prev);
			continue;
		}
		brandsWithPoints[r.kind].add(r.brand_id);
		const food = foods.get(r.brand_id);
		const source = `${r.kind}:${r.source_id}`;
		if (food) foodBase.set(food.key, (foodBase.get(food.key) ?? new Set<string>()).add(source));
		const dish = themeDishOf(r);
		if (dish) {
			const side = `${r.polarity}:${dish.key}`;
			dishBase.set(side, (dishBase.get(side) ?? new Set<string>()).add(source));
			const names = dishNames.get(dish.key) ?? { topic: dish.topic, topicLabel: dish.topicLabel, spellings: new Map<string, number>() };
			names.spellings.set(dish.spelling, (names.spellings.get(dish.spelling) ?? 0) + 1);
			dishNames.set(dish.key, names);
		}
		if (!known) {
			unfiled[r.kind].add(r.source_id);
			continue;
		}
		names.set(r.brand_id, r.brand_name);
		const key = `${r.polarity}:${r.theme}`;
		const t: Tally = tallies.get(key) ?? {
			reviews: new Set(),
			posts: new Set(),
			brands: new Map(),
			foods: new Map(),
			dishes: new Map(),
			samples: [],
			seen: new Set(),
		};
		(r.kind === 'review' ? t.reviews : t.posts).add(r.source_id);
		t.brands.set(r.brand_id, (t.brands.get(r.brand_id) ?? new Set<string>()).add(source));
		if (food) t.foods.set(food.key, (t.foods.get(food.key) ?? new Set<string>()).add(source));
		if (dish) t.dishes.set(dish.key, (t.dishes.get(dish.key) ?? new Set<string>()).add(source));
		const detail = r.detail?.trim();
		if (detail && t.samples.length < SAMPLES && !t.seen.has(detail.toLowerCase())) {
			t.seen.add(detail.toLowerCase());
			t.samples.push(detail);
		}
		tallies.set(key, t);
	}

	const foodLabels = new Map([...foods.values()].map(f => [f.key, f.label]));
	const dishLabel = (key: string) => {
		const names = dishNames.get(key);
		if (!names) return key;
		if (names.topicLabel) return names.topicLabel;
		return [...names.spellings.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
	};
	const now = base[month];
	const then = base[previous];
	const rowsOf = (polarity: ThemePolarity): ThemeRow[] =>
		[...tallies.entries()]
			.filter(([key]) => key.startsWith(`${polarity}:`))
			.map(([key, t]) => {
				const theme = key.slice(polarity.length + 1) as FeedbackTheme;
				const prev = before.get(key);
				const reviewShare = percent(t.reviews.size, now.review.size);
				const postShare = percent(t.posts.size, now.post.size);
				return {
					key: theme,
					topic: FEEDBACK_THEMES[theme].topic,
					label: FEEDBACK_THEMES[theme].label,
					reviews: t.reviews.size,
					posts: t.posts.size,
					reviewShare,
					postShare,
					reviewShareChange: pointsChange(reviewShare, percent(prev?.review.size ?? 0, then.review.size)),
					postShareChange: pointsChange(postShare, percent(prev?.post.size ?? 0, then.post.size)),
					venues: t.brands.size,
					topBrands: [...t.brands.entries()]
						.map(([id, sources]) => ({ id, name: names.get(id) ?? id, sources: sources.size }))
						.sort((a, b) => b.sources - a.sources || a.name.localeCompare(b.name))
						.slice(0, TOP_BRANDS),
					foods: [...t.foods.entries()]
						.map(([food, sources]) => ({
							key: food,
							label: foodLabels.get(food) ?? food,
							sources: sources.size,
							share: percent(sources.size, foodBase.get(food)?.size ?? 0) ?? 0,
						}))
						.sort((a, b) => b.sources - a.sources || a.label.localeCompare(b.label))
						.slice(0, TOP_FOODS),
					dishes: [...t.dishes.entries()]
						.map(([key, sources]) => ({
							key,
							label: dishLabel(key),
							...(dishNames.get(key)?.topic && { foodTopic: dishNames.get(key)!.topic }),
							sources: sources.size,
							share: percent(sources.size, dishBase.get(`${polarity}:${key}`)?.size ?? 0) ?? 0,
						}))
						.sort((a, b) => b.sources - a.sources || a.label.localeCompare(b.label))
						.slice(0, TOP_DISHES),
					samples: t.samples,
				};
			})
			.sort((a, b) => b.reviews + b.posts - (a.reviews + a.posts) || a.label.localeCompare(b.label));

	return {
		praise: rowsOf('praise'),
		complaints: rowsOf('complaint'),
		coverage: {
			reviews: now.review.size,
			reviewBrands: brandsWithPoints.review.size,
			posts: now.post.size,
			postBrands: brandsWithPoints.post.size,
			unfiledReviews: unfiled.review.size,
			unfiledPosts: unfiled.post.size,
		},
	};
};

/**
 * The month's kinds of food, by the brands' food: their reviews and posts with any point, own
 * posts out, the most first. What the theme counts can be narrowed to.
 */
export const themeFoods = (rows: ThemePointRow[], month: string, foods: Map<string, ThemeFood>): ThemeFoodCoverage[] => {
	const byFood = new Map<string, { food: ThemeFood; review: Set<string>; post: Set<string>; brands: Set<string> }>();
	for (const r of rows) {
		const food = foods.get(r.brand_id);
		if (r.own || r.month !== month || !food) continue;
		const f = byFood.get(food.key) ?? { food, review: new Set(), post: new Set(), brands: new Set() };
		f[r.kind].add(r.source_id);
		f.brands.add(r.brand_id);
		byFood.set(food.key, f);
	}
	return [...byFood.values()]
		.map(f => ({ ...f.food, reviews: f.review.size, posts: f.post.size, brands: f.brands.size }))
		.sort((a, b) => b.reviews + b.posts - (a.reviews + a.posts) || a.label.localeCompare(b.label));
};

/** One place of a brand, with its main food (`VenueTopicTag.primary`). */
export interface BrandPlaceFood {
	brandId: string;
	food?: ThemeFood;
	/** Its review count: a tie goes to the food of the brand's most reviewed places */
	reviews: number;
}

/**
 * A brand's food: the main food of most of its places, a tie to the one whose places have the
 * most reviews. A brand with no place of a known food has none.
 */
export const brandFoods = (places: BrandPlaceFood[]): Map<string, ThemeFood> => {
	const tally = new Map<string, Map<string, { food: ThemeFood; places: number; reviews: number }>>();
	for (const p of places) {
		if (!p.food) continue;
		const ofBrand = tally.get(p.brandId) ?? new Map<string, { food: ThemeFood; places: number; reviews: number }>();
		const t = ofBrand.get(p.food.key) ?? { food: p.food, places: 0, reviews: 0 };
		t.places++;
		t.reviews += p.reviews;
		ofBrand.set(p.food.key, t);
		tally.set(p.brandId, ofBrand);
	}
	const out = new Map<string, ThemeFood>();
	for (const [brandId, ofBrand] of tally) {
		const [best] = [...ofBrand.values()].sort(
			(a, b) => b.places - a.places || b.reviews - a.reviews || a.food.key.localeCompare(b.food.key),
		);
		out.set(brandId, best.food);
	}
	return out;
};

/** A source's points (`f`, joined on `on`): praise and complaints, dish-only and change rows left out; their dish's food topic (`ft`). */
const pointsOf = (on: string) =>
	`join feedback_points f on ${on} and f.detail is not null and not f.change left join food_topics ft on ft.id = f.food_topic_id`;
const DISH_FIELDS = `f.dish, f.dish_key, ft.key as food_topic_key, ft.label as food_topic_label`;
const POLARITY = `case when f.sentiment = 'positive' then 'praise' else 'complaint' end as polarity`;

/** `ThemePointRow`s of a city's written, analysed reviews in [start, end), newest first. */
export const THEME_REVIEW_POINTS_SQL = `select to_char(r.published_at at time zone 'UTC', 'YYYY-MM') as month, 'review' as kind,
		r.id::text as source_id, v.brand_id, b.name as brand_name, ${POLARITY},
		f.theme, f.detail, false as own, ${DISH_FIELDS}
	from reviews r
	join venues v on v.id = r.venue_id
	join brands b on b.id = v.brand_id
	${pointsOf('f.review_id = r.id')}
	where v.city_id = ? and r.published_at >= ? and r.published_at < ?
		and r.analysed_at is not null and coalesce(r.text_translated, r.text, '') <> ''
	order by r.published_at desc, r.id, f.id`;

/** `ThemePointRow`s of a city's mentions matched to a brand in [start, end), newest post first. */
export const THEME_POST_POINTS_SQL = `select to_char(p.posted_at at time zone 'UTC', 'YYYY-MM') as month, 'post' as kind,
		p.id::text as source_id, m.brand_id, b.name as brand_name, ${POLARITY},
		f.theme, f.detail, ${ownPostSql('p', 'm.brand_id')} as own, ${DISH_FIELDS}
	from mentions m
	join social_posts p on p.id = m.post_id
	join brands b on b.id = m.brand_id
	${pointsOf('f.mention_id = m.id')}
	where p.city_id = ? and p.posted_at >= ? and p.posted_at < ?
	order by p.posted_at desc, p.id, m.id, f.id`;
