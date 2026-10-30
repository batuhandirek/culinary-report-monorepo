// Pure: the food topic a feedback row's dish points at.

import { TopicKindEnum } from 'src/modules/topics/entities/topic.entity.js';
import type { TopicIndex } from 'src/modules/topics/util/topics.js';
import { dishKey } from 'src/modules/venues/util/dishes.js';

const DISH_KINDS = new Set([TopicKindEnum.DISH, TopicKindEnum.DRINK]);

/**
 * What a writer links a row's dish with: its name's decided topic (`DishName`, by `dishKey`), else,
 * for a name not decided yet, the dish or drink topic it names as a whole (`TopicIndex.dishTopic`).
 */
export class DishTopics {
	constructor(
		readonly index: TopicIndex,
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
export const matchedTopicId = (index: TopicIndex, name: string): string | null => {
	const key = index.dishTopic(name);
	return (key && index.get(key)?.id) || null;
};

/** Whether a topic key is one a dish name can point at: a dish or a drink */
export const isDishTopic = (index: TopicIndex, key: string | null | undefined): boolean => {
	const kind = key ? index.get(key)?.kind : undefined;
	return !!kind && DISH_KINDS.has(kind);
};
