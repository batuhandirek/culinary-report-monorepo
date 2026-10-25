// Pure: the food topic a feedback row's dish points at.

import { FoodTopicKindEnum } from 'src/modules/food-topics/entities/food-topic.entity.js';
import type { FoodTopicIndex } from 'src/modules/food-topics/util/food-topics.js';
import { dishKey } from 'src/modules/venues/util/dishes.js';

const DISH_KINDS = new Set([FoodTopicKindEnum.DISH, FoodTopicKindEnum.DRINK]);

/**
 * What a writer links a row's dish with: its name's decided topic (`DishName`, by `dishKey`), else,
 * for a name not decided yet, the dish or drink topic it names as a whole (`FoodTopicIndex.dishTopic`).
 */
export class DishTopics {
	constructor(
		readonly index: FoodTopicIndex,
		/** Decided names' topic ids by key, null for "none" */
		private readonly decided: ReadonlyMap<string, string | null>,
	) {}

	/** The topic id a dish's rows point at, null for none */
	topicId(dish: string | null | undefined): string | null {
		if (!dish) return null;
		const key = dishKey(dish);
		if (this.decided.has(key)) return this.decided.get(key) ?? null;
		return matchedTopicId(this.index, dish);
	}
}

/** The id of the dish or drink topic a name is as a whole, its key or one of its other names */
export const matchedTopicId = (index: FoodTopicIndex, name: string): string | null => {
	const key = index.dishTopic(name);
	return (key && index.get(key)?.id) || null;
};

/** Whether a topic key is one a dish name can point at: a dish or a drink */
export const isDishTopic = (index: FoodTopicIndex, key: string | null | undefined): boolean => {
	const kind = key ? index.get(key)?.kind : undefined;
	return !!kind && DISH_KINDS.has(kind);
};
