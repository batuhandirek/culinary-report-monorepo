// The front page's live edition, from rows the service reads. Pure: `LandingEditionService.build`
// feeds it the window's and the window before's mentions in posts by others, their feedback rows
// and the venues of the places involved.

import _ from 'lodash';

import { FoodTopicKindEnum } from 'src/modules/food-topics/entities/food-topic.entity.js';
import type { FoodTopicIndex } from 'src/modules/food-topics/util/food-topics.js';
import { isDeniedCreator, isDeniedVenue } from 'src/modules/highlights/util/highlights.js';
import { SocialPlatformEnum } from 'src/modules/social/entities/social-post.entity.js';
import {
	FEEDBACK_THEMES,
	type FeedbackTheme,
	isFeedbackTheme,
} from 'src/modules/venues/constants/feedback-themes.constant.js';

import {
	LANDING_DISH_MIN_POSTS,
	LANDING_MARQUEE_DISHES,
	LANDING_OPENING_DAYS,
	LANDING_OPENING_MAX_REVIEWS,
	LANDING_OPENINGS,
	LANDING_PLACES,
	LANDING_RANK_DEPTH,
	LANDING_STORY_MIN_POSTS,
	LANDING_STREET_MIN_PLACES,
	LANDING_WINDOW_DAYS,
} from '../constants/landing.constant.js';
import type {
	LandingDish,
	LandingDishRole,
	LandingEditionData,
	LandingNamedDish,
	LandingOpening,
	LandingPlace,
	LandingStory,
} from '../interfaces/landing-edition.interface.js';

const DAY_MS = 24 * 3600 * 1000;

/**
 * One matched mention in a post by someone other than the brand it names, in the city, of a
 * brand with an open branch there; paid and promotional posts are already out.
 */
export interface LandingMentionRow {
	mentionId: number;
	postId: string;
	externalId: string;
	platform: SocialPlatformEnum;
	url: string;
	views: number;
	postedAt: Date;
	/** The post's account handle; null without an account */
	handle: string | null;
	/** The person behind the post: the creator's id, else the author's handle, else the post */
	creatorKey: string;
	brandId: string;
	brandName: string;
	/** The branch the post named; null for a brand-only mention */
	venueId: string | null;
	district: string | null;
	street: string | null;
	sentiment: string | null;
	summary: string | null;
	/** Its stored food topics, in the order its text names them */
	topics: string[];
}

/** One feedback row of such a mention (changes left out). */
export interface LandingFeedbackRow {
	mentionId: number;
	postId: string;
	brandId: string;
	views: number;
	sentiment: string;
	theme: string | null;
	detail: string | null;
	dish: string | null;
	dishKey: string | null;
	/** The dish or drink topic of its dish name, when it has one */
	topicKey: string | null;
	topicLabel: string | null;
	topicKind: FoodTopicKindEnum | null;
}

/** An open venue of a brand the edition names. */
export interface LandingVenueRow {
	venueId: string;
	brandId: string;
	district: string | null;
	street: string | null;
	reviewsCount: number | null;
}

/**
 * The first sign a place is new, ever: the first post by others calling it new (`venueId` null
 * for a brand-only mention), or the first time a city-wide scrape saw the venue open.
 */
export interface LandingOpeningSign {
	brandId: string;
	venueId: string | null;
	at: Date;
}

export interface LandingWindowInput {
	mentions: LandingMentionRow[];
	feedback: LandingFeedbackRow[];
}

export interface LandingInput {
	cityName: string;
	/** The window's end (exclusive): the start of the build day, UTC */
	end: Date;
	current: LandingWindowInput;
	previous: LandingWindowInput;
	/** Open venues of every brand the current window names */
	venues: LandingVenueRow[];
	/** Every place's first sign of being new, from posts and from scrapes, up to the window's end */
	openingSigns: LandingOpeningSign[];
	index: FoodTopicIndex;
	doNotList: { venues: readonly string[]; creators: readonly string[] };
}

/** What the model is shown per place, opening and dish: the posts' own words, positive only. */
export interface LandingPromptMaterial {
	/** Praise phrases and positive summaries, most viewed posts first */
	praise: Map<string, string[]>;
	summaries: Map<string, string[]>;
	/** Praise phrases per dish key */
	dishPraise: Map<string, string[]>;
}

/** The window an edition built at `now` counts: the 30 whole UTC days before today. */
export const landingWindow = (now: Date) => {
	const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
	const start = new Date(end.getTime() - LANDING_WINDOW_DAYS * DAY_MS);
	const previousStart = new Date(start.getTime() - LANDING_WINDOW_DAYS * DAY_MS);
	const openingsSince = new Date(end.getTime() - LANDING_OPENING_DAYS * DAY_MS);
	return { start, end, previousStart, openingsSince };
};

/**
 * "Torstraße 125" → "Torstraße": the street as written, without its house number and what
 * Google appends after it ("Europaplatz 1 Berlin Hauptbahnhof" → "Europaplatz"); a number
 * inside the name stays ("Straße des 17. Juni 112").
 */
export const streetLabel = (street: string | null | undefined): string | undefined => {
	const trimmed = street?.replace(/\s+/g, ' ').trim();
	if (!trimmed) return undefined;
	const name =
		trimmed.match(/^(.*\D)\s\d+\s?[a-z]?(?:\s?[-–/]\s?\d+\s?[a-z]?)?(?:[\s,].*)?$/i)?.[1] ??
		trimmed;
	return /\p{L}/u.test(name) ? name.trim() : undefined;
};

const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 1000) / 10 : 0);
const points = (a: number, b: number) => Math.round((a - b) * 10) / 10;
const fmt = (n: number) => n.toLocaleString('en');
/**
 * Views as people say them ("1.4M", "173k", "5,079"): the model copies what it is given, and
 * `checkCopy` reads "173k" as 173,000.
 */
export const viewsLabel = (n: number): string => {
	if (n < 10_000) return n.toLocaleString('en');
	if (n < 1_000_000) return `${Math.round(n / 1000)}k`;
	return `${(n / 1e6).toFixed(1).replace(/\.0$/, '')}M`;
};

/** "26 October" */
export const dayLabel = (d: Date) =>
	d.toLocaleString('en-GB', { day: 'numeric', month: 'long', timeZone: 'UTC' });

const PLATFORM_NAMES: Record<SocialPlatformEnum, string> = {
	[SocialPlatformEnum.TIKTOK]: 'TikTok',
	[SocialPlatformEnum.INSTAGRAM]: 'Instagram',
	[SocialPlatformEnum.BLOG]: 'blog',
};

interface BrandTally {
	brandId: string;
	name: string;
	posts: Set<string>;
	views: number;
	creators: Set<string>;
}

/** Per brand: its posts once each, their views, the people behind them. */
const tallyBrands = (rows: LandingMentionRow[]): Map<string, BrandTally> => {
	const out = new Map<string, BrandTally>();
	for (const r of rows) {
		const t = out.get(r.brandId) ?? {
			brandId: r.brandId,
			name: r.brandName,
			posts: new Set<string>(),
			views: 0,
			creators: new Set<string>(),
		};
		if (!t.posts.has(r.postId)) t.views += r.views;
		t.posts.add(r.postId);
		t.creators.add(r.creatorKey);
		out.set(r.brandId, t);
	}
	return out;
};

/** The places the most people posted about, then by posts, then views (one voice posting fifteen times is one voice). */
const rankBrands = (
	tallies: Map<string, BrandTally>,
	denied: (name: string) => boolean,
): BrandTally[] =>
	_.orderBy(
		[...tallies.values()].filter(t => !denied(t.name)),
		[t => t.creators.size, t => t.posts.size, t => t.views, t => t.brandId],
		['desc', 'desc', 'desc', 'asc'],
	);

interface DishTally {
	key: string;
	kind: FoodTopicKindEnum | null;
	labels: Map<string, number>;
	topicLabel: string | null;
	posts: Set<string>;
	brands: Map<string, Set<string>>;
}

const DISH_KINDS = new Set([FoodTopicKindEnum.DISH, FoodTopicKindEnum.DRINK]);

/**
 * Each post counts a dish once, however many of its names fall in it: the dish or drink topic
 * of its name ("döner", "doner kebab": Döner & kebab), else its `dishKey`.
 */
const tallyDishes = (rows: LandingFeedbackRow[]) => {
	const dishes = new Map<string, DishTally>();
	const sources = new Set<string>();
	for (const r of rows) {
		if (!r.dish) continue;
		const isTopic = !!r.topicKey && !!r.topicKind && DISH_KINDS.has(r.topicKind);
		const key = isTopic ? r.topicKey! : r.dishKey;
		if (!key) continue;
		const t = dishes.get(key) ?? {
			key,
			kind: isTopic ? r.topicKind : null,
			labels: new Map(),
			topicLabel: isTopic ? r.topicLabel : null,
			posts: new Set(),
			brands: new Map(),
		};
		t.labels.set(r.dish, (t.labels.get(r.dish) ?? 0) + 1);
		t.posts.add(r.postId);
		const brandPosts = t.brands.get(r.brandId) ?? new Set();
		brandPosts.add(r.postId);
		t.brands.set(r.brandId, brandPosts);
		dishes.set(key, t);
		sources.add(r.postId);
	}
	return { dishes, sources: sources.size };
};

const dishLabel = (t: DishTally) =>
	t.topicLabel ?? _.maxBy([...t.labels.entries()], ([label, n]) => n * 1000 - label.length)![0];

/** The dish a set of a brand's posts named most, with 2+ posts. */
const namedMost = (rows: LandingFeedbackRow[], brandId: string): LandingNamedDish | undefined => {
	const { dishes } = tallyDishes(rows.filter(r => r.brandId === brandId));
	const top = _.orderBy(
		[...dishes.values()],
		[t => t.posts.size, t => t.key],
		['desc', 'asc'],
	)[0];
	return top && top.posts.size >= 2 ?
			{ label: dishLabel(top), posts: top.posts.size }
		:	undefined;
};

/** Shares among posts with a key (each post once per key), in percent, and the posts behind each. */
const shareTable = (pairs: { postId: string; key: string }[]) => {
	const byKey = new Map<string, Set<string>>();
	const all = new Set<string>();
	for (const p of pairs) {
		const posts = byKey.get(p.key) ?? new Set();
		posts.add(p.postId);
		byKey.set(p.key, posts);
		all.add(p.postId);
	}
	return {
		posts: (key: string) => byKey.get(key)?.size ?? 0,
		share: (key: string) => pct(byKey.get(key)?.size ?? 0, all.size),
		keys: [...byKey.keys()],
	};
};

// Catch-all themes say nothing a city could decide
const isStoryTheme = (theme: string): theme is FeedbackTheme =>
	isFeedbackTheme(theme) && theme !== 'other' && !theme.endsWith('_other');

/** The first cuisine a mention names (its stored topics, else its venue's category's). */
const cuisineOf = (topics: string[], index: FoodTopicIndex) =>
	topics.find(k => index.get(k)?.kind === FoodTopicKindEnum.CUISINE) ?? null;

/**
 * The edition's numbers and facts. Every list leaves out the venues and creators on the city's
 * do-not-list; totals count every post (a count names nobody).
 */
export const computeLanding = (input: LandingInput): LandingEditionData => {
	const { current, previous } = input;
	const deniedVenue = (name: string) => isDeniedVenue(name, input.doNotList.venues);
	const deniedCreator = (handle: string | null) =>
		isDeniedCreator([handle], input.doNotList.creators);
	const openingsSince = new Date(input.end.getTime() - LANDING_OPENING_DAYS * DAY_MS);

	const posts = _.uniqBy(current.mentions, r => r.postId);
	const totals = {
		posts: posts.length,
		views: _.sumBy(posts, r => r.views),
		creators: new Set(posts.map(r => r.creatorKey)).size,
		places: new Set(current.mentions.map(r => r.brandId)).size,
	};

	// Where a place is: the branch its posts named most, else its most reviewed open one
	const venuesByBrand = _.groupBy(input.venues, v => v.brandId);
	const brandNames = new Map(current.mentions.map(r => [r.brandId, r.brandName]));
	const namedVenues = _.countBy(
		_.uniqBy(
			current.mentions.filter(r => r.venueId),
			r => `${r.postId} ${r.venueId}`,
		),
		r => r.venueId!,
	);
	const homeOf = (brandId: string) => {
		const venues = venuesByBrand[brandId] ?? [];
		const home = _.orderBy(
			venues,
			[v => namedVenues[v.venueId] ?? 0, v => v.reviewsCount ?? -1, v => v.venueId],
			['desc', 'desc', 'asc'],
		)[0];
		return {
			branches: venues.length,
			...(home?.district && { district: home.district }),
			...(streetLabel(home?.street) && { street: streetLabel(home!.street) }),
		};
	};

	// The list and its movement: both windows ranked by the same rule, denied places out of both
	const ranked = rankBrands(tallyBrands(current.mentions), deniedVenue);
	const prevRanked = rankBrands(tallyBrands(previous.mentions), deniedVenue).slice(
		0,
		LANDING_RANK_DEPTH,
	);
	const prevRank = new Map(prevRanked.map((t, i) => [t.brandId, i + 1]));
	const firstSeen = openingsOf(input, venuesByBrand, deniedVenue, openingsSince);
	const places: LandingPlace[] = ranked.slice(0, LANDING_PLACES).map((t, i) => {
		const rank = i + 1;
		const before = prevRank.get(t.brandId);
		const dish = namedMost(current.feedback, t.brandId);
		const move =
			before === undefined ? ('new' as const)
			: before > rank ? ('up' as const)
			: before === rank ? ('held' as const)
			: ('none' as const);
		return {
			rank,
			brandId: t.brandId,
			name: t.name,
			...homeOf(t.brandId),
			posts: t.posts.size,
			views: t.views,
			creators: t.creators.size,
			move,
			...(move === 'up' && { climb: before! - rank }),
			...(before !== undefined && { prevRank: before }),
			...(dish && { dish }),
			...(firstSeen.has(t.brandId) && { isNew: true }),
		};
	});

	// Dishes: shares of the posts naming a dish, against the window before
	const cur = tallyDishes(current.feedback);
	const prev = tallyDishes(previous.feedback);
	const dishShare = (t: DishTally | undefined, sources: number) =>
		pct(t?.posts.size ?? 0, sources);
	const dishRows = [...cur.dishes.values()].map(t => {
		const share = dishShare(t, cur.sources);
		return { t, share, delta: points(share, dishShare(prev.dishes.get(t.key), prev.sources)) };
	});
	const marquee = _.orderBy(dishRows, [d => d.t.posts.size, d => d.t.key], ['desc', 'asc'])
		.slice(0, LANDING_MARQUEE_DISHES)
		.map(d => dishLabel(d.t));

	const eligible = dishRows.filter(d => d.t.posts.size >= LANDING_DISH_MIN_POSTS);
	const isDrink = (d: (typeof dishRows)[number]) => d.t.kind === FoodTopicKindEnum.DRINK;
	const picked = new Set<string>();
	const pick = (role: LandingDishRole, rows: typeof dishRows, order: 'delta' | 'posts') => {
		const candidates = rows.filter(
			d => !picked.has(d.t.key) && (order === 'posts' || d.delta > 0),
		);
		const best = _.orderBy(
			candidates,
			order === 'delta' ?
				[d => d.delta, d => d.t.posts.size, d => d.t.key]
			:	[d => d.t.posts.size, d => d.delta, d => d.t.key],
			['desc', 'desc', 'asc'],
		)[0];
		if (!best) return null;
		picked.add(best.t.key);
		const topPlaces = _.orderBy(
			[...best.t.brands.entries()]
				.map(([brandId, ps]) => ({
					brandId,
					posts: ps.size,
					name: brandNames.get(brandId) ?? '',
				}))
				.filter(b => b.name && !deniedVenue(b.name)),
			[b => b.posts, b => b.brandId],
			['desc', 'asc'],
		)
			.slice(0, 3)
			.map(b => {
				const home = homeOf(b.brandId);
				return {
					brandId: b.brandId,
					name: b.name,
					...(home.district && { district: home.district }),
					posts: b.posts,
				};
			});
		return {
			role,
			key: best.t.key,
			label: dishLabel(best.t),
			posts: best.t.posts.size,
			places: best.t.brands.size,
			share: best.share,
			delta: best.delta,
			topPlaces,
		} satisfies LandingDish;
	};
	const food = eligible.filter(d => !isDrink(d));
	const drinks = eligible.filter(isDrink);
	const dishes = [
		pick('dish_of_the_month', food, 'delta'),
		pick('rising', food, 'delta'),
		pick('most_named', food, 'posts'),
		pick('drink', drinks, 'delta') ?? pick('drink', drinks, 'posts'),
	].filter((d): d is LandingDish => !!d);

	const brandTallies = tallyBrands(current.mentions);
	const openingRows = _.orderBy(
		[...firstSeen.entries()]
			.map(([brandId, seen]) => ({ seen, t: brandTallies.get(brandId) }))
			.filter((o): o is { seen: Date; t: BrandTally } => !!o.t && !deniedVenue(o.t.name)),
		[o => o.t.creators.size, o => o.t.posts.size, o => o.t.views, o => o.t.brandId],
		['desc', 'desc', 'desc', 'asc'],
	);
	const openings: LandingOpening[] = openingRows.slice(0, LANDING_OPENINGS).map(({ seen, t }) => {
		const home = homeOf(t.brandId);
		const dish = namedMost(current.feedback, t.brandId);
		return {
			brandId: t.brandId,
			name: t.name,
			...(home.district && { district: home.district }),
			...(home.street && { street: home.street }),
			firstSeen: seen.toISOString().slice(0, 10),
			posts: t.posts.size,
			views: t.views,
			creators: t.creators.size,
			...(dish && { dish }),
		};
	});

	const stories = computeStories({
		input,
		totals,
		ranked,
		prevRank,
		places,
		dishes,
		openingsCount: openingRows.length,
		openingDistricts: openingRows.map(o => homeOf(o.t.brandId).district),
		deniedVenue,
		deniedCreator,
	});

	return {
		totals,
		places,
		marquee,
		dishes,
		openings,
		openingsCount: openingRows.length,
		stories,
	};
};

/**
 * New in Town: places whose first sign of being new (the first post by others calling them
 * new, or the first city-wide scrape that saw them open) falls in the last 14 days. Never a
 * place with many reviews (an old place a post calls "new"), and a brand-only mention counts
 * only for a brand with one place. Each with the day of that first sign.
 */
const openingsOf = (
	input: LandingInput,
	venuesByBrand: Record<string, LandingVenueRow[]>,
	deniedVenue: (name: string) => boolean,
	since: Date,
): Map<string, Date> => {
	const venueById = new Map(input.venues.map(v => [v.venueId, v]));
	const isFresh = (v: LandingVenueRow | undefined) =>
		!!v && (v.reviewsCount ?? 0) <= LANDING_OPENING_MAX_REVIEWS;
	const names = new Map(input.current.mentions.map(r => [r.brandId, r.brandName]));
	const first = new Map<string, Date>();
	for (const sign of input.openingSigns) {
		const venue =
			sign.venueId ? venueById.get(sign.venueId)
			: venuesByBrand[sign.brandId]?.length === 1 ? venuesByBrand[sign.brandId][0]
			: undefined;
		if (!isFresh(venue)) continue;
		const seen = first.get(sign.brandId);
		if (!seen || sign.at < seen) first.set(sign.brandId, sign.at);
	}
	// Talked about in the window, first called new inside the last 14 days
	return new Map(
		[...first].filter(
			([brandId, at]) =>
				at >= since && names.has(brandId) && !deniedVenue(names.get(brandId)!),
		),
	);
};

/** The facts the trend tiles and the ticker may tell, each a plain sentence with its numbers. */
const computeStories = (ctx: {
	input: LandingInput;
	totals: LandingEditionData['totals'];
	ranked: BrandTally[];
	prevRank: Map<string, number>;
	places: LandingPlace[];
	dishes: LandingDish[];
	openingsCount: number;
	openingDistricts: (string | undefined)[];
	deniedVenue: (name: string) => boolean;
	deniedCreator: (handle: string | null) => boolean;
}): LandingStory[] => {
	const { input, totals, places } = ctx;
	const { current, previous, index } = input;
	const city = input.cityName;
	const trends: LandingStory[] = [];
	const ticker: LandingStory[] = [];

	// A street: the most places posted about on one street (the branches posts named)
	const onStreets = current.mentions
		.filter(r => r.venueId && streetLabel(r.street) && !ctx.deniedVenue(r.brandName))
		.map(r => ({ ...r, streetName: streetLabel(r.street)! }));
	const streets = _.orderBy(
		Object.entries(_.groupBy(onStreets, r => r.streetName.toLowerCase())).map(([, rows]) => ({
			name: rows[0].streetName,
			places: new Set(rows.map(r => r.brandId)).size,
			posts: new Set(rows.map(r => r.postId)).size,
			district: _.maxBy(
				Object.entries(
					_.countBy(
						rows.filter(r => r.district),
						r => r.district!,
					),
				),
				([, n]) => n,
			)?.[0],
		})),
		[s => s.places, s => s.posts, s => s.name],
		['desc', 'desc', 'asc'],
	);
	const street = streets[0];
	if (street && street.places >= LANDING_STREET_MIN_PLACES) {
		trends.push({
			id: 'street',
			kind: 'street',
			trend: true,
			title: `${street.name} is the street.`,
			fact: `${street.places} places on ${street.name} were posted about in the last 30 days, ${fmt(street.posts)} posts in all.`,
			...(street.district && { district: street.district }),
		});
	}

	// A praise theme on the rise: share of the posts praising anything
	const praisePairs = (rows: LandingFeedbackRow[]) =>
		rows
			.filter(r => r.sentiment === 'positive' && r.theme && isStoryTheme(r.theme))
			.map(r => ({ postId: r.postId, key: r.theme! }));
	const praiseNow = shareTable(praisePairs(current.feedback));
	const praiseBefore = shareTable(praisePairs(previous.feedback));
	const praise = _.orderBy(
		praiseNow.keys
			.filter(k => praiseNow.posts(k) >= LANDING_STORY_MIN_POSTS)
			.map(k => ({
				key: k,
				posts: praiseNow.posts(k),
				share: praiseNow.share(k),
				delta: points(praiseNow.share(k), praiseBefore.share(k)),
			}))
			.filter(t => t.delta > 0),
		[t => t.delta, t => t.posts, t => t.key],
		['desc', 'desc', 'asc'],
	)[0];
	if (praise) {
		const label = FEEDBACK_THEMES[praise.key as FeedbackTheme].label;
		trends.push({
			id: 'praise',
			kind: 'praise',
			trend: true,
			title: `${label} won ${city} over.`,
			fact: `${label} came up as praise in ${fmt(praise.posts)} posts: ${praise.share}% of the posts praising anything, up ${praise.delta} points on the 30 days before.`,
		});
	}

	// A cuisine on the rise: share of the posts naming one
	const cuisinePairs = (rows: LandingMentionRow[]) =>
		_.uniqBy(
			rows
				.map(r => ({ postId: r.postId, key: cuisineOf(r.topics, index) }))
				.filter((p): p is { postId: string; key: string } => !!p.key),
			p => `${p.postId} ${p.key}`,
		);
	const cuisineNow = shareTable(cuisinePairs(current.mentions));
	const cuisineBefore = shareTable(cuisinePairs(previous.mentions));
	const cuisine = _.orderBy(
		cuisineNow.keys
			.filter(k => cuisineNow.posts(k) >= LANDING_STORY_MIN_POSTS)
			.map(k => ({
				key: k,
				posts: cuisineNow.posts(k),
				share: cuisineNow.share(k),
				delta: points(cuisineNow.share(k), cuisineBefore.share(k)),
			}))
			.filter(c => c.delta > 0),
		[c => c.delta, c => c.posts, c => c.key],
		['desc', 'desc', 'asc'],
	)[0];
	if (cuisine) {
		const label = index.get(cuisine.key)?.label ?? cuisine.key;
		trends.push({
			id: 'cuisine',
			kind: 'cuisine',
			trend: true,
			title: `${label} had a moment.`,
			fact: `${label} food was in ${cuisine.share}% of the posts naming a cuisine (${fmt(cuisine.posts)} posts), up ${cuisine.delta} points on the 30 days before.`,
		});
	}

	// The district most posts naming a branch named
	const districtPairs = (rows: LandingMentionRow[]) =>
		_.uniqBy(
			rows
				.filter(r => r.venueId && r.district)
				.map(r => ({ postId: r.postId, key: r.district! })),
			p => `${p.postId} ${p.key}`,
		);
	const districtNow = shareTable(districtPairs(current.mentions));
	const districtBefore = shareTable(districtPairs(previous.mentions));
	const district = _.orderBy(
		districtNow.keys,
		[k => districtNow.posts(k), k => k],
		['desc', 'asc'],
	)[0];
	if (district && districtNow.posts(district) >= LANDING_STORY_MIN_POSTS) {
		const share = districtNow.share(district);
		const delta = points(share, districtBefore.share(district));
		trends.push({
			id: 'district',
			kind: 'district',
			trend: true,
			title: `${district} talked loudest.`,
			fact: `${Math.round(share)}% of the posts naming a place's address named one in ${district} (${fmt(districtNow.posts(district))} posts)${delta >= 1 ? `, up ${delta} points on the 30 days before` : ''}.`,
			district,
		});
	}

	// Openings, as a count
	if (ctx.openingsCount >= 2) {
		const top = _.maxBy(
			Object.entries(_.countBy(ctx.openingDistricts.filter(Boolean))),
			([, n]) => n,
		);
		const most = top && top[1] >= 2 ? top[0] : undefined;
		trends.push({
			id: 'openings',
			kind: 'openings',
			trend: true,
			title: `${city} found its new places early.`,
			fact: `${ctx.openingsCount} places got posts calling them new in the last 14 days${most ? `, ${top![1]} of them in ${most}` : ''}.`,
			...(most && { district: most }),
		});
	}

	// The crowd, always there
	trends.push({
		id: 'crowd',
		kind: 'crowd',
		trend: true,
		title: `${fmt(totals.creators)} people, one conversation.`,
		fact: `${fmt(totals.creators)} people posted about ${fmt(totals.places)} places in the last 30 days, ${fmt(totals.posts)} posts in all.`,
	});

	// The ticker: places, the dish, the post everyone saw, a climber
	const placeStory = (p: LandingPlace): LandingStory => ({
		id: `place:${p.brandId}`,
		kind: 'place',
		trend: false,
		title: p.name,
		fact: `${fmt(p.creators)} people posted about ${p.name} in the last 30 days${p.dish ? `; the dish they named most: ${p.dish.label}` : ''}.`,
		...(p.district && { district: p.district }),
	});
	if (places[0]) ticker.push(placeStory(places[0]));

	const dish = ctx.dishes.find(d => d.role === 'dish_of_the_month');
	if (dish) {
		ticker.push({
			id: 'dish',
			kind: 'dish',
			trend: false,
			title: dish.label,
			fact: `${dish.label} was named in ${fmt(dish.posts)} posts about ${fmt(dish.places)} places${dish.topPlaces[0] ? `, ${dish.topPlaces[0].name} most of all` : ''}.`,
			...(dish.topPlaces[0]?.district && { district: dish.topPlaces[0].district }),
		});
	}

	// The most viewed post, credited: by a creator not on the do-not-list, naming listed places
	const byPost = _.groupBy(current.mentions, r => r.postId);
	const topPost = _.orderBy(
		_.uniqBy(current.mentions, r => r.postId).filter(
			r =>
				r.handle &&
				r.views > 0 &&
				!ctx.deniedCreator(r.handle) &&
				r.platform !== SocialPlatformEnum.BLOG,
		),
		[r => r.views, r => r.postId],
		['desc', 'asc'],
	).find(r => byPost[r.postId].some(m => !ctx.deniedVenue(m.brandName)));
	if (topPost) {
		const place = byPost[topPost.postId].find(m => !ctx.deniedVenue(m.brandName))!;
		ticker.push({
			id: 'top_post',
			kind: 'top_post',
			trend: false,
			title: place.brandName,
			fact: `@${topPost.handle}'s ${PLATFORM_NAMES[topPost.platform]} post about ${place.brandName} reached ${viewsLabel(topPost.views)} views.`,
			...(place.district && { district: place.district }),
			handle: topPost.handle!,
			platform: topPost.platform,
			url: topPost.url,
		});
	}

	// The biggest climb into the top 50 (a public list never shows a fall)
	const climber = _.orderBy(
		ctx.ranked
			.slice(0, LANDING_RANK_DEPTH)
			.map((t, i) => ({ t, rank: i + 1, before: ctx.prevRank.get(t.brandId) }))
			.filter(c => c.before !== undefined && c.before - c.rank >= 3),
		[c => c.before! - c.rank, c => c.rank],
		['desc', 'asc'],
	)[0];
	if (climber) {
		const place = places.find(p => p.brandId === climber.t.brandId);
		ticker.push({
			id: `climber:${climber.t.brandId}`,
			kind: 'climber',
			trend: false,
			title: climber.t.name,
			fact: `${climber.t.name} climbed ${climber.before! - climber.rank} places to No. ${climber.rank} on the list of places ${city} posted about.`,
			...(place?.district && { district: place.district }),
		});
	}
	for (const p of places.slice(1, 3)) ticker.push(placeStory(p));

	return [...trends, ...ticker];
};

/** Lines the page shows when the model's line is missing or fails its checks. */
export const fallbackLines = (data: LandingEditionData) => {
	const top = data.places[0];
	const dish = data.dishes.find(d => d.role === 'dish_of_the_month');
	const parts = [
		top && `${fmt(top.creators)} people posted about ${top.name}`,
		dish && `${dish.label} was named in ${fmt(dish.posts)} posts`,
		data.openingsCount > 0 &&
			`${data.openingsCount} ${data.openingsCount === 1 ? 'place' : 'places'} got posts calling them new`,
	].filter(Boolean) as string[];
	const list =
		parts.length > 1 ?
			`${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}`
		:	(parts[0] ?? '');
	return {
		lede:
			list ?
				`The last 30 days in one breath: ${list}. This is what the whole city is talking about, not what one critic thinks.`
			:	'What the whole city is talking about when it talks about food, not what one critic thinks.',
		place: (p: LandingPlace) => ({
			said: `${fmt(p.creators)} people posted about ${p.name} in the last 30 days, ${fmt(p.posts)} posts in all.${p.dish ? ` The dish they named most: ${p.dish.label}.` : ''}`,
			tagline:
				p.dish ?
					`${p.dish.label}, named in ${fmt(p.dish.posts)} posts`
				:	`${fmt(p.posts)} posts in 30 days`,
		}),
		dish: (d: LandingDish) => ({
			text: `Named in ${fmt(d.posts)} posts about ${fmt(d.places)} places${d.delta > 0 ? `, up ${d.delta} points on the 30 days before` : ''}.${d.topPlaces.length ? ` Most posted at ${listNames(d.topPlaces.map(p => p.name))}.` : ''}`,
			sticker:
				d.role === 'dish_of_the_month' || d.role === 'rising' ? 'Rising' : 'Everywhere',
		}),
		opening: (o: LandingOpening) => ({
			text: `First called new on ${dayLabel(new Date(`${o.firstSeen}T00:00:00Z`))}; ${fmt(o.posts)} ${o.posts === 1 ? 'post' : 'posts'} by ${fmt(o.creators)} ${o.creators === 1 ? 'person' : 'people'} since.`,
		}),
	};
};

const listNames = (names: string[]) =>
	names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : (names[0] ?? '');

/**
 * The praise phrases and positive summaries the model may draw on, per brand and per dish, most
 * viewed posts first. Negative and neutral posts never reach it: the page says nothing bad about
 * a named place.
 */
export const promptMaterial = (
	current: LandingWindowInput,
	opts: { phrases: number; summaries: number },
): LandingPromptMaterial => {
	const praise = new Map<string, string[]>();
	const dishPraise = new Map<string, string[]>();
	const positive = _.orderBy(
		current.feedback.filter(r => r.sentiment === 'positive' && r.detail),
		[r => r.views, r => r.mentionId],
		['desc', 'asc'],
	);
	for (const r of positive) {
		const list = praise.get(r.brandId) ?? [];
		if (list.length < opts.phrases && !list.includes(r.detail!)) list.push(r.detail!);
		praise.set(r.brandId, list);
		const isTopic = !!r.topicKey && !!r.topicKind && DISH_KINDS.has(r.topicKind);
		const key =
			r.dish ?
				isTopic ? r.topicKey!
				:	r.dishKey
			:	null;
		if (key) {
			const dishList = dishPraise.get(key) ?? [];
			if (dishList.length < opts.phrases && !dishList.includes(r.detail!))
				dishList.push(r.detail!);
			dishPraise.set(key, dishList);
		}
	}
	const summaries = new Map<string, string[]>();
	for (const r of _.orderBy(
		_.uniqBy(
			current.mentions.filter(m => m.sentiment === 'positive' && m.summary),
			m => `${m.postId} ${m.brandId}`,
		),
		[m => m.views, m => m.mentionId],
		['desc', 'asc'],
	)) {
		const list = summaries.get(r.brandId) ?? [];
		if (list.length < opts.summaries && !list.includes(r.summary!)) list.push(r.summary!);
		summaries.set(r.brandId, list);
	}
	return { praise, summaries, dishPraise };
};
