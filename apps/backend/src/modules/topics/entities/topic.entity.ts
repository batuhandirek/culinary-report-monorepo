import type { Rel } from '@mikro-orm/core';
import { Entity, Enum, ManyToOne, Property } from '@mikro-orm/decorators/legacy';

import { MikroOrmEntityAbstractClass } from 'src/shared/abstractions/mikro-orm-entity.abstract-class.js';

export enum TopicKindEnum {
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
	// What is said about a place or its food rather than a kind of food: waiting, price increase,
	// friendliness. Nine roots (food, drinks, service, vibe, price, payment, wait, cleanliness,
	// other) and their children; a point "about price, nothing finer" is filed at the root itself
	ASPECT = 'aspect',
}

/**
 * One thing people talk about, in every city, in one tree: a kind of food (what a mention's cuisine
 * or a Google category resolves to (`TopicIndex`), and what Google Trends is searched for) or an
 * aspect (what a praise or complaint point is about). A food topic's `key` is a `normalizeCuisine`
 * key and its `aliases` other spellings, normalized the same way when looked up; an aspect's key is
 * a snake_case code key (`wait_for_food`), never in the cuisine lookup, and its `hint` is what the
 * agents are told it covers. A child counts for its parent too (ramen for Japanese, a queue for
 * Waiting). Google Trends searches the topic id when set (language independent, one meaning), else
 * `trendsQuery`; with neither it is not searched. Seeds: `TOPIC_SEED` (food), `ASPECT_SEED`.
 */
@Entity({ tableName: 'topics' })
export class Topic extends MikroOrmEntityAbstractClass<'aliases'> {
	@Property({ type: 'text', unique: true })
	key: string;

	@Property({ type: 'text' })
	label: string;

	@Enum({ items: () => TopicKindEnum, nativeEnumName: 'topic_kind' })
	kind: TopicKindEnum;

	@ManyToOne({ entity: () => Topic, nullable: true, deleteRule: 'set null' })
	parent?: Rel<Topic> | null;

	@Property({ type: 'jsonb' })
	aliases: string[] = [];

	// Google's Knowledge Graph id as Trends takes it, e.g. "/m/01xw9" (Chinese cuisine)
	@Property({ type: 'text', nullable: true })
	trendsTopicId?: string | null;

	// A search phrase for a topic Google has no id for
	@Property({ type: 'text', nullable: true })
	trendsQuery?: string | null;

	/** What it covers, told to the agents that file a point under it ("the line to get in or to order"); aspects */
	@Property({ type: 'text', nullable: true })
	hint?: string | null;
}
