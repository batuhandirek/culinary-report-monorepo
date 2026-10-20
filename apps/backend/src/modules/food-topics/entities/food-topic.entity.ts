import type { Rel } from '@mikro-orm/core';
import { Entity, Enum, ManyToOne, Property } from '@mikro-orm/decorators/legacy';

import { MikroOrmEntityAbstractClass } from 'src/shared/abstractions/mikro-orm-entity.abstract-class.js';

export enum FoodTopicKindEnum {
	// A country's or region's food: Vietnamese, Middle Eastern
	CUISINE = 'cuisine',
	// One dish or kind of dish: pizza, ramen, döner
	DISH = 'dish',
	DRINK = 'drink',
	// A way of eating: vegan, halal
	DIET = 'diet',
	// A kind of place: café, bar, street food, fine dining
	FORMAT = 'format',
	// A time of day: brunch, breakfast
	MEAL = 'meal',
}

/**
 * One kind of food the product groups by, in every city: what a mention's cuisine or a Google
 * category resolves to (`FoodTopicIndex`), and what Google Trends is searched for. `key` is a
 * `normalizeCuisine` key; `aliases` are other spellings, normalized the same way when looked up.
 * A child counts for its parent too (ramen for Japanese). Google Trends searches the topic id when
 * set (language independent, one meaning), else `trendsQuery`; with neither it is not searched.
 */
@Entity({ tableName: 'food_topics' })
export class FoodTopic extends MikroOrmEntityAbstractClass<'aliases'> {
	@Property({ type: 'text', unique: true })
	key: string;

	@Property({ type: 'text' })
	label: string;

	@Enum({ items: () => FoodTopicKindEnum, nativeEnumName: 'food_topic_kind' })
	kind: FoodTopicKindEnum;

	@ManyToOne({ entity: () => FoodTopic, nullable: true, deleteRule: 'set null' })
	parent?: Rel<FoodTopic> | null;

	@Property({ type: 'jsonb' })
	aliases: string[] = [];

	// Google's Knowledge Graph id as Trends takes it, e.g. "/m/01xw9" (Chinese cuisine)
	@Property({ type: 'text', nullable: true })
	trendsTopicId?: string | null;

	// A search phrase for a topic Google has no id for
	@Property({ type: 'text', nullable: true })
	trendsQuery?: string | null;
}
