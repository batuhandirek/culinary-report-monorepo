import type { Rel } from '@mikro-orm/core';
import { Entity, Index, ManyToOne, Property, Unique } from '@mikro-orm/decorators/legacy';

import { Mention } from 'src/modules/social/entities/mention.entity.js';
import { MikroOrmSimpleEntityAbstractClass } from 'src/shared/abstractions/mikro-orm-simple-entity.abstract-class.js';

import { FoodTopic } from './food-topic.entity.js';

/** Where a mention's topic came from: its own cuisine, else its venue's Google category */
export type MentionTopicSource = 'cuisine' | 'category';

/**
 * A kind of food a mention is about, stored as resolved: its cuisine's topics ("Vegan Döner":
 * vegan, kebab), else, when the cuisine names none, its venue's Google category's (a brand-only
 * mention: its brand's most reviewed branch in the post's city). Without parents: readers expand
 * them (`withParents`). Written by `MentionFoodTopicService` only, kept current by
 * `FoodTopicRelinkJob` and the per-city refresh.
 */
@Entity({ tableName: 'mention_food_topics' })
@Unique({ properties: ['mention', 'topic'] })
@Index({ properties: ['topic'] })
export class MentionFoodTopic extends MikroOrmSimpleEntityAbstractClass {
	@ManyToOne({ entity: () => Mention, deleteRule: 'cascade' })
	mention: Rel<Mention>;

	@ManyToOne({ entity: () => FoodTopic, deleteRule: 'cascade' })
	topic: Rel<FoodTopic>;

	@Property({ type: 'text' })
	source: MentionTopicSource;

	/** The order the text names them, from 0: a mention's trends row is its first cuisine or dish */
	@Property({ type: 'int' })
	rank: number;
}
