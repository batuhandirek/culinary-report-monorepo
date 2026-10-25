// Pure: a venue's food topics from its Google categories, what posts call its food, its delivery
// menu, Google's review tags, and an admin's tags.

import { FoodTopicKindEnum } from '../entities/food-topic.entity.js';

import type { FoodTopicIndex } from './food-topics.js';

// A kind of food posts give a venue counts when this many of its posts and this share of those
// with a kind of food say so: one post calling a ramen bar "Thai" is noise
export const MIN_TAG_MENTIONS = 2;
export const MIN_TAG_SHARE = 0.25;

// A kind of food its menu gives counts when this many of its items with a kind of food, and this
// share of them, are of it: one pho on a burger menu is no pho place
export const MIN_MENU_ITEMS = 3;
export const MIN_MENU_SHARE = 0.25;

export type VenueTopicSource = 'category' | 'mentions' | 'menu' | 'reviews' | 'manual';

export interface VenueTopicTag {
	key: string;
	source: VenueTopicSource;
	/**
	 * 1 for its main Google category or an admin's tag, 0.5 for another category, else the share
	 * of its posts, menu items or review tags with a kind of food that are of it
	 */
	score: number;
	/** The one kind of food it is known for */
	primary: boolean;
}

export interface VenueTopicInput {
	/** Google's main category */
	category: string | null | undefined;
	/** Google's other categories */
	categories?: string[] | null;
	/** Its posts by others: each mention's stored cuisine topics (`MentionFoodTopic`, source `cuisine`) */
	mentionTopics: { keys: string[]; n: number }[];
	/** Its latest delivery menu: each item's stored topics (`MenuItemFoodTopic`) */
	menuItems?: { keys: string[] }[];
	/** Google's "people often mention" (`VenueDetails.reviewsTags`), all-time counts */
	reviewTags?: { title: string; count: number }[] | null;
	/** An admin's tags and exclusions */
	manual: { key: string; excluded: boolean }[];
}

// What a venue is known for: a cuisine or a dish ("ramen"), not "vegan" or "café" while one exists
const FOOD_KINDS = new Set([FoodTopicKindEnum.CUISINE, FoodTopicKindEnum.DISH]);

/**
 * Topics given `min`+ times and on `share`+ of what has a kind of food, most first, with their share.
 */
const counted = (
	entries: { keys: string[]; n: number }[],
	min: number,
	share: number,
): [string, number][] => {
	const counts = new Map<string, number>();
	let withTopic = 0;
	for (const { keys, n } of entries) {
		if (!keys.length) continue;
		withTopic += n;
		for (const key of keys) counts.set(key, (counts.get(key) ?? 0) + n);
	}
	return [...counts]
		.filter(([, n]) => n >= min && n / withTopic >= share)
		.sort(([a, x], [b, y]) => y - x || a.localeCompare(b))
		.map(([key, n]) => [key, Math.round((n / withTopic) * 100) / 100]);
};

/**
 * The venue's topics, its primary one first, then by score. Its main category's topics score 1,
 * its other categories' 0.5, a kind of food its posts give `MIN_TAG_MENTIONS`+ times and on
 * `MIN_TAG_SHARE`+ of its posts with one its share, the same for Google's review tags (weighted
 * by their counts), and a kind of food on `MIN_MENU_ITEMS`+ and `MIN_MENU_SHARE`+ of its menu's
 * items with one its share; menus and review tags never give a kind of place (Google's category
 * says that). An admin's tag scores 1 and an admin's exclusion removes the topic whatever gives
 * it. The primary is the first cuisine or dish of: an admin's tags, the main category, the
 * posts', the menu's, the review tags' (most first); else the first of any kind in that order
 * ("Cocktail bar": cocktails), else the best tag.
 */
export const venueTopics = (input: VenueTopicInput, index: FoodTopicIndex): VenueTopicTag[] => {
	const tags = new Map<string, { source: VenueTopicSource; score: number }>();
	const add = (key: string, source: VenueTopicSource, score: number) => {
		const current = tags.get(key);
		if (!current || score > current.score) tags.set(key, { source, score });
	};

	const main = index.resolve(input.category);
	main.forEach(key => add(key, 'category', 1));
	for (const category of input.categories ?? [])
		index.resolve(category).forEach(key => add(key, 'category', 0.5));

	// A stored key of a topic since deleted counts for nothing
	const known = (keys: string[]) => keys.filter(key => index.get(key));
	const fromPosts = counted(
		input.mentionTopics.map(({ keys, n }) => ({ keys: known(keys), n })),
		MIN_TAG_MENTIONS,
		MIN_TAG_SHARE,
	);
	const notPlace = (key: string) => index.get(key)!.kind !== FoodTopicKindEnum.FORMAT;
	const fromMenu = counted(
		(input.menuItems ?? []).map(item => ({ keys: known(item.keys), n: 1 })),
		MIN_MENU_ITEMS,
		MIN_MENU_SHARE,
	);
	const fromReviews = counted(
		(input.reviewTags ?? []).map(t => ({
			keys: index.resolve(t.title).filter(notPlace),
			n: t.count,
		})),
		MIN_TAG_MENTIONS,
		MIN_TAG_SHARE,
	);
	for (const [key, share] of fromPosts) add(key, 'mentions', share);
	for (const [key, share] of fromMenu) add(key, 'menu', share);
	for (const [key, share] of fromReviews) add(key, 'reviews', share);

	const manual = input.manual.filter(m => index.get(m.key));
	for (const m of manual.filter(m => !m.excluded))
		tags.set(m.key, { source: 'manual', score: 1 });
	for (const m of manual.filter(m => m.excluded)) tags.delete(m.key);

	const isFood = (key: string) => FOOD_KINDS.has(index.get(key)!.kind);
	const ranked = [...tags].sort(([a, x], [b, y]) => y.score - x.score || a.localeCompare(b));
	const candidates = [
		...manual.filter(m => !m.excluded).map(m => m.key),
		...main,
		...[...fromPosts, ...fromMenu, ...fromReviews].map(([key]) => key),
	].filter(key => tags.has(key));
	const primary = candidates.find(isFood) ?? candidates[0] ?? ranked[0]?.[0];

	return ranked
		.map(([key, t]) => ({ key, source: t.source, score: t.score, primary: key === primary }))
		.sort((a, b) => Number(b.primary) - Number(a.primary));
};

/**
 * What two venues have in common to eat, for competitor suggestions: 3 when their primary topics
 * match, 2 when one's primary is among the other's food tags or they share a parent cuisine
 * (ramen and sushi are both Japanese), 1 when any cuisine or dish tag overlaps after parents;
 * 0 when none does. Two bars or two cafés (a place's primary when it has no food tag) match on it.
 */
export const sharedFood = (
	a: VenueTopicTag[],
	b: VenueTopicTag[],
	index: FoodTopicIndex,
): { points: number; reason: string | null } => {
	const primaryA = a.find(t => t.primary)?.key;
	const primaryB = b.find(t => t.primary)?.key;
	const label = (key: string) => index.get(key)?.label ?? key;
	if (primaryA && primaryA === primaryB)
		return { points: 3, reason: `same food (${label(primaryA)})` };

	const food = (tags: VenueTopicTag[]) =>
		new Set(
			index.withParents(tags.map(t => t.key)).filter(k => FOOD_KINDS.has(index.get(k)!.kind)),
		);
	const foodA = food(a);
	const foodB = food(b);
	const parentOf = (key?: string) => (key ? index.get(key)?.parentKey : null);
	if (primaryA && foodB.has(primaryA))
		return { points: 2, reason: `related food (${label(primaryA)})` };
	if (primaryB && foodA.has(primaryB))
		return { points: 2, reason: `related food (${label(primaryB)})` };
	const parentA = parentOf(primaryA);
	if (parentA && parentA === parentOf(primaryB))
		return { points: 2, reason: `related food (${label(parentA)})` };
	const shared = [...foodA].find(k => foodB.has(k));
	if (shared) return { points: 1, reason: `overlapping food (${label(shared)})` };
	return { points: 0, reason: null };
};
