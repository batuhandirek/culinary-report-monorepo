import type { EntityManager } from '@mikro-orm/core';

import { FOOD_TOPIC_SEED, FoodTopicSeed } from '../../constants/food-topic-seed.constant.js';
import { FoodTopic } from '../../entities/food-topic.entity.js';
import { FoodTopicIndex } from '../../util/food-topics.js';

/** The seeded topics as the index takes them, without a database. */
export const seedIndex = (seed: FoodTopicSeed[] = FOOD_TOPIC_SEED): FoodTopicIndex =>
	new FoodTopicIndex(
		seed.map(s => ({
			key: s.key,
			label: s.label,
			kind: s.kind,
			parentKey: s.parent ?? null,
			aliases: s.aliases ?? [],
		})),
	);

/**
 * The seed's topics in this entity manager, not flushed, as the seed migration inserts them:
 * `keys` picks some (their parents come along), all of them otherwise. Returns them by key.
 */
export const seedFoodTopics = (em: EntityManager, keys?: string[]): Map<string, FoodTopic> => {
	const byKey = new Map(FOOD_TOPIC_SEED.map(s => [s.key, s]));
	const wanted = new Set<string>();
	const want = (key: string) => {
		const seed = byKey.get(key);
		if (!seed) throw new Error(`No seeded food topic "${key}"`);
		wanted.add(key);
		if (seed.parent) want(seed.parent);
	};
	(keys ?? [...byKey.keys()]).forEach(want);
	const created = new Map<string, FoodTopic>();
	// The seed lists parents before their children
	for (const seed of FOOD_TOPIC_SEED.filter(s => wanted.has(s.key))) {
		created.set(
			seed.key,
			em.create(FoodTopic, {
				key: seed.key,
				label: seed.label,
				kind: seed.kind,
				parent: seed.parent ? created.get(seed.parent) : null,
				aliases: seed.aliases ?? [],
				trendsTopicId: seed.mid ?? null,
			}),
		);
	}
	return created;
};
