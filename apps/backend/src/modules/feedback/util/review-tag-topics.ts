// Pure: the food topic one of Google's "people often mention" review tags names.

import { TopicKindEnum } from 'src/modules/topics/entities/topic.entity.js';
import type { TopicIndex } from 'src/modules/topics/util/topics.js';
import { dishKey } from 'src/modules/venues/util/dishes.js';

const DISH_KINDS = new Set([TopicKindEnum.DISH, TopicKindEnum.DRINK]);

/**
 * The food topic a review tag names, as the feedback rows would link the same dish: the dish
 * name's decided topic (`DishName`, by `dishKey`; `decided` maps a key to a topic key, null for
 * "none"), else the dish or drink topic the tag names as a whole ("Dürüm": kebab), else another
 * kind of food it names as a whole ("vegan"). Never a kind of place, never split into words
 * ("cheese counter" is no cheese), and never a dish topic for a name decided as none. Undefined
 * for what is no food ("waiting time", "cash only").
 */
export const reviewTagTopic = (
	index: TopicIndex,
	decided: ReadonlyMap<string, string | null>,
	title: string,
): string | undefined => {
	const key = dishKey(title);
	const linked = decided.get(key);
	if (linked && index.get(linked)) return linked;
	const match = (decided.has(key) ? undefined : index.dishTopic(title)) ?? index.exact(title);
	const kind = match ? index.get(match)?.kind : undefined;
	if (!match || !kind || kind === TopicKindEnum.FORMAT) return undefined;
	if (decided.has(key) && DISH_KINDS.has(kind)) return undefined;
	return match;
};
