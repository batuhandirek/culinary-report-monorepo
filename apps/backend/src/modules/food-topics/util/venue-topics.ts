// Pure: a venue's food topics from its Google categories, what posts call its food, and an
// admin's tags.

import { FoodTopicKindEnum } from '../entities/food-topic.entity.js';

import type { FoodTopicIndex } from './food-topics.js';

// A kind of food posts give a venue counts when this many of its posts and this share of those
// with a kind of food say so: one post calling a ramen bar "Thai" is noise
export const MIN_TAG_MENTIONS = 2;
export const MIN_TAG_SHARE = 0.25;

export type VenueTopicSource = 'category' | 'mentions' | 'manual';

export interface VenueTopicTag {
	key: string;
	source: VenueTopicSource;
	/** 1 for its main Google category or an admin's tag, 0.5 for another category, else the share of its posts */
	score: number;
	/** The one kind of food it is known for */
	primary: boolean;
}

export interface VenueTopicInput {
	/** Google's main category */
	category: string | null | undefined;
	/** Google's other categories */
	categories?: string[] | null;
	/** Its posts by others, by the cuisine extraction gave, with how many */
	mentionCuisines: { cuisine: string | null; n: number }[];
	/** An admin's tags and exclusions */
	manual: { key: string; excluded: boolean }[];
}

// What a venue is known for: a cuisine or a dish ("ramen"), not "vegan" or "café" while one exists
const FOOD_KINDS = new Set([FoodTopicKindEnum.CUISINE, FoodTopicKindEnum.DISH]);

/**
 * The venue's topics, its primary one first, then by score. Its main category's topics score 1,
 * its other categories' 0.5, a kind of food its posts give `MIN_TAG_MENTIONS`+ times and on
 * `MIN_TAG_SHARE`+ of its posts with one its share; an admin's tag scores 1 and an admin's
 * exclusion removes the topic whatever gives it. The primary is the first cuisine or dish of: an
 * admin's tags, the main category, the posts' (most first); else the first of any kind in that
 * order ("Cocktail bar": cocktails), else the best tag.
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

	const counts = new Map<string, number>();
	let withTopic = 0;
	for (const { cuisine, n } of input.mentionCuisines) {
		const keys = index.resolve(cuisine);
		if (!keys.length) continue;
		withTopic += n;
		for (const key of keys) counts.set(key, (counts.get(key) ?? 0) + n);
	}
	const fromPosts = [...counts]
		.filter(([, n]) => n >= MIN_TAG_MENTIONS && n / withTopic >= MIN_TAG_SHARE)
		.sort(([a, x], [b, y]) => y - x || a.localeCompare(b));
	for (const [key, n] of fromPosts) add(key, 'mentions', Math.round((n / withTopic) * 100) / 100);

	const manual = input.manual.filter(m => index.get(m.key));
	for (const m of manual.filter(m => !m.excluded))
		tags.set(m.key, { source: 'manual', score: 1 });
	for (const m of manual.filter(m => m.excluded)) tags.delete(m.key);

	const isFood = (key: string) => FOOD_KINDS.has(index.get(key)!.kind);
	const ranked = [...tags].sort(([a, x], [b, y]) => y.score - x.score || a.localeCompare(b));
	const candidates = [
		...manual.filter(m => !m.excluded).map(m => m.key),
		...main,
		...fromPosts.map(([key]) => key),
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
