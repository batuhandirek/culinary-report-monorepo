// Pure: counting what a city's reviews and posts praise and criticise, per theme (an aspect),
// across every venue in it, over statements and their parts.

import { ownPostSql } from 'src/modules/social/util/accounts.js';
import { foodRowKey, foodRowsOf, FOODS_SQL, type StatementFood } from 'src/modules/statements/util/statement-foods.js';
import { judgingSql } from 'src/modules/statements/util/statement-sql.js';
import type { TopicIndex } from 'src/modules/topics/util/topics.js';

/** What the counts need of the aspect vocabulary: which keys are aspects, and each one's label and root */
export type ThemeAspects = Pick<TopicIndex, 'isAspect' | 'label' | 'rootOf'>;

export type ThemePolarity = 'praise' | 'complaint';
export type ThemeSourceKind = 'review' | 'post';

/**
 * One praise or complaint claim of a review or a post (a statement with text, judged positive or
 * negative, not a noticed change), as `THEME_REVIEW_CLAIMS_SQL` and `THEME_POST_CLAIMS_SQL` select it.
 */
export interface ThemeClaimRow {
	/** YYYY-MM, UTC */
	month: string;
	kind: ThemeSourceKind;
	/** The review's or the post's id: a source counts once per theme and polarity */
	source_id: string;
	brand_id: string;
	brand_name: string;
	polarity: ThemePolarity;
	/** The aspect's key (its `aspect` part); null for a claim agent B filed under no aspect yet */
	aspect: string | null;
	text: string | null;
	/** A post by one of the brand's own accounts (`ownPostSql`); false for reviews */
	own: boolean;
	/** The foods and drinks it names, each with its dish or drink topics (`FOODS_SQL`) */
	foods?: StatementFood[] | null;
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
	/** Of its brands' reviews and posts with any claim this month, percent */
	share: number;
}

/** One kind of food in the month: its brands' reviews and posts with any claim. */
export interface ThemeFoodCoverage extends ThemeFood {
	reviews: number;
	posts: number;
	brands: number;
}

/** One dish a theme's sources were about: a dish or drink topic ("Döner & kebab") or, without one, the wording itself. */
export interface ThemeDishRow {
	/** `topic:<dish or drink topic key>` or `dish:<term key>` */
	key: string;
	/** The topic's label, else the wording as most often spelled */
	label: string;
	/** The dish or drink topic, for a link to its page */
	foodTopic?: string;
	/** Reviews and posts raising the theme about it, each once */
	sources: number;
	/** Of the reviews and posts with a claim of this side about it, percent */
	share: number;
}

export interface ThemeBrand {
	id: string;
	name: string;
	/** Its reviews and posts raising the theme */
	sources: number;
}

/** One theme (an aspect) in one polarity, in a city and month. */
export interface ThemeRow {
	/** The aspect's key */
	key: string;
	/** Its root's key */
	topic: string;
	label: string;
	/** Written reviews raising it */
	reviews: number;
	/** Posts by others raising it */
	posts: number;
	/** Of the month's written reviews with any claim, percent; null without any */
	reviewShare: number | null;
	/** Of the month's posts by others with any claim, percent; null without any */
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
	/** The five dishes its claims named most (their food parts) */
	dishes: ThemeDishRow[];
	/** Up to five distinct claims, in row order (newest first) */
	samples: string[];
}

/** What the counts stand on. */
export interface ThemeCoverage {
	/** The month's written reviews with any praise or complaint claim */
	reviews: number;
	/** The brands those reviews are of: reviews are scraped for report venues and their competitors only */
	reviewBrands: number;
	/** The month's posts by others with any claim about a matched venue */
	posts: number;
	postBrands: number;
	/** Of those, the ones with a claim under no aspect yet (agent B named none, or one the table lacks): counted under no theme */
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

/** The dish rows a claim's foods fall in (`foodRowsOf`), keyed as the pages name them. */
export const themeDishesOf = (
	foods: StatementFood[] | null | undefined,
): { key: string; topic?: string; topicLabel?: string; spelling: string }[] =>
	foodRowsOf(foods ?? []).map(row => ({
		key: foodRowKey(row),
		...(row.topic && { topic: row.topic.key, topicLabel: row.topic.label }),
		spelling: row.spelling,
	}));

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
	/** Per dish row (`themeDishesOf`), its sources */
	dishes: Map<string, Set<string>>;
	samples: string[];
	seen: Set<string>;
}

/**
 * Counts the month's themes, praise and complaints apart, over rows of `month` and `previous`
 * (the month before, for the change). A review or a post counts once per theme and polarity,
 * however often it raises it, so "prices went up" and "way more than before" in two reviews are
 * two, in one review one. A brand's own posts are left out. A claim whose aspect `aspects` does
 * not know, or that has none, counts under no theme: its source is counted in `coverage` as
 * unfiled, never under a root. `foods` (brand id → its food, `brandFoods`) breaks each theme down
 * by kind of food; a claim's own foods break it down by dish, a source once per dish row.
 */
export const countThemes = (
	rows: ThemeClaimRow[],
	month: string,
	previous: string,
	aspects: ThemeAspects,
	foods: Map<string, ThemeFood> = new Map(),
): ThemeCounts => {
	const base = { [month]: { review: new Set<string>(), post: new Set<string>() }, [previous]: { review: new Set<string>(), post: new Set<string>() } };
	const unfiled = { review: new Set<string>(), post: new Set<string>() };
	const brandsWithClaims = { review: new Set<string>(), post: new Set<string>() };
	const tallies = new Map<string, Tally>();
	const before = new Map<string, { review: Set<string>; post: Set<string> }>();
	const names = new Map<string, string>();
	/** Per kind of food, the month's sources with any claim */
	const foodBase = new Map<string, Set<string>>();
	/** Per side and dish row, the month's sources with a claim of that side about it */
	const dishBase = new Map<string, Set<string>>();
	/** Per dish row, its topic and how it is spelled */
	const dishNames = new Map<string, { topic?: string; topicLabel?: string; spellings: Map<string, number> }>();

	for (const r of rows) {
		if (r.own || !base[r.month]) continue;
		base[r.month][r.kind].add(r.source_id);
		const known = r.aspect !== null && aspects.isAspect(r.aspect);
		if (r.month === previous) {
			if (!known) continue;
			const key = `${r.polarity}:${r.aspect}`;
			const prev = before.get(key) ?? { review: new Set<string>(), post: new Set<string>() };
			prev[r.kind].add(r.source_id);
			before.set(key, prev);
			continue;
		}
		brandsWithClaims[r.kind].add(r.brand_id);
		const food = foods.get(r.brand_id);
		const source = `${r.kind}:${r.source_id}`;
		if (food) foodBase.set(food.key, (foodBase.get(food.key) ?? new Set<string>()).add(source));
		const dishes = themeDishesOf(r.foods);
		for (const dish of dishes) {
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
		const key = `${r.polarity}:${r.aspect}`;
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
		for (const dish of dishes) t.dishes.set(dish.key, (t.dishes.get(dish.key) ?? new Set<string>()).add(source));
		const text = r.text?.trim();
		if (text && t.samples.length < SAMPLES && !t.seen.has(text.toLowerCase())) {
			t.seen.add(text.toLowerCase());
			t.samples.push(text);
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
				const theme = key.slice(polarity.length + 1);
				const prev = before.get(key);
				const reviewShare = percent(t.reviews.size, now.review.size);
				const postShare = percent(t.posts.size, now.post.size);
				return {
					key: theme,
					topic: aspects.rootOf(theme) ?? theme,
					label: aspects.label(theme),
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
			reviewBrands: brandsWithClaims.review.size,
			posts: now.post.size,
			postBrands: brandsWithClaims.post.size,
			unfiledReviews: unfiled.review.size,
			unfiledPosts: unfiled.post.size,
		},
	};
};

/**
 * The month's kinds of food, by the brands' food: their reviews and posts with any claim, own
 * posts out, the most first. What the theme counts can be narrowed to.
 */
export const themeFoods = (rows: ThemeClaimRow[], month: string, foods: Map<string, ThemeFood>): ThemeFoodCoverage[] => {
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

/**
 * A source's praise and complaint claims (`s`, joined on `on`): statements with text, judged
 * positive or negative, not a noticed change; neutral and mixed claims and claims agent B has not
 * judged count as nothing. With the aspect part's key (`a`, null while unfiled) and the foods named.
 */
const claimsOf = (on: string) =>
	`join statements s on ${on} and s.text is not null and ${judgingSql('s')} and s.sentiment in ('positive', 'negative')
	left join statement_parts ap on ap.statement_id = s.id and ap.role = 'aspect'
	left join topics a on a.id = ap.topic_id`;
const CLAIM_FIELDS = `a.key as aspect, s.text, ${FOODS_SQL('st.id = s.id')} as foods`;
const POLARITY = `case when s.sentiment = 'positive' then 'praise' else 'complaint' end as polarity`;

/** `ThemeClaimRow`s of a city's written, analysed reviews in [start, end), newest first. */
export const THEME_REVIEW_CLAIMS_SQL = `select s.month, 'review' as kind,
		r.id::text as source_id, v.brand_id, b.name as brand_name, ${POLARITY},
		false as own, ${CLAIM_FIELDS}
	from reviews r
	join venues v on v.id = r.venue_id
	join brands b on b.id = v.brand_id
	${claimsOf('s.review_id = r.id')}
	where v.city_id = ? and r.published_at >= ? and r.published_at < ?
		and r.analysed_at is not null and coalesce(r.text_translated, r.text, '') <> ''
	order by r.published_at desc, r.id, s.id`;

/** `ThemeClaimRow`s of a city's mentions matched to a brand in [start, end), newest post first. */
export const THEME_POST_CLAIMS_SQL = `select s.month, 'post' as kind,
		p.id::text as source_id, m.brand_id, b.name as brand_name, ${POLARITY},
		${ownPostSql('p', 'm.brand_id')} as own, ${CLAIM_FIELDS}
	from mentions m
	join social_posts p on p.id = m.post_id
	join brands b on b.id = m.brand_id
	${claimsOf('s.mention_id = m.id')}
	where p.city_id = ? and p.posted_at >= ? and p.posted_at < ?
	order by p.posted_at desc, p.id, m.id, s.id`;
