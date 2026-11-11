import { Collection, helper } from '@mikro-orm/core';
import { Entity, Enum, OneToMany, Property } from '@mikro-orm/decorators/legacy';

import { MikroOrmEntityAbstractClass } from 'src/shared/abstractions/mikro-orm-entity.abstract-class.js';
import { HalfvecType } from 'pgvector/mikro-orm';

import { TopicEdge } from './topic-edge.entity.js';

/** `TOPIC_EMBEDDING_DIMENSIONS`, a literal here: the constants file imports this one's enum */
const EMBEDDING_DIMENSIONS = 1024;

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
	// What a dish is made with: beef, cheese, avocado, mushrooms (a dish `has` it)
	INGREDIENT = 'ingredient',
	// What is said about a place or its food rather than a kind of food: waiting, price increase,
	// friendliness. Nine roots (food, drinks, service, vibe, price, payment, wait, cleanliness,
	// other) and their children; a point "about price, nothing finer" is filed at the root itself
	ASPECT = 'aspect',
}

/**
 * One thing people talk about, in every city: a node of the topic graph. A kind of food (what a
 * mention's cuisine or a Google category resolves to (`TopicIndex`), and what Google Trends is
 * searched for) or an aspect (what a claim is about). A food topic's `key` is a `normalizeCuisine`
 * key; its other names are terms pointing at it (`Term.topic`, `exact`); an aspect's key is a
 * snake_case code key (`wait_for_food`), never in the cuisine lookup, and its `hint` is what the
 * agents are told it covers. What a topic is or has is its `edges` (`TopicEdge`): Menemen `is_a`
 * Turkish and `is_a` Breakfast, Vegan döner `has` Vegan; it counts for each of them and for theirs
 * (`topic_closure`). The first `is_a` is its display parent (`parent`). Google Trends searches the
 * topic id when set (language independent, one meaning), else `trendsQuery`; with neither it is not
 * searched. Seeds: `TOPIC_SEED` (food), `ASPECT_SEED`. `TopicService` is the one writer.
 */
@Entity({ tableName: 'topics' })
export class Topic extends MikroOrmEntityAbstractClass<'parent'> {
	@Property({ type: 'text', unique: true })
	key: string;

	@Property({ type: 'text' })
	label: string;

	@Enum({ items: () => TopicKindEnum, nativeEnumName: 'topic_kind' })
	kind: TopicKindEnum;

	/** What it is (`is_a`, the first its display parent) and has (`has`): its outgoing edges, `is_a` first, each type by rank */
	@OneToMany(() => TopicEdge, edge => edge.from, { orderBy: { type: 'desc', rank: 'asc' } })
	edges = new Collection<TopicEdge>(this);

	/**
	 * The display parent: the topic its first `is_a` edge points at (a dish's cuisine, an aspect's
	 * root), as `{ key, label }`; undefined for a topic with none, and whenever `edges.to` is not
	 * loaded. Never stored: the tree, "Dish under Turkish" and an aspect's root read it.
	 */
	@Property({ type: 'json', persist: false })
	get parent(): { key: string; label: string } | undefined {
		if (!this.edges?.isInitialized()) return undefined;
		const first = this.edges
			.getItems()
			.filter(e => e.type === 'is_a')
			.sort((a, b) => a.rank - b.rank)[0];
		const to = first?.to;
		return to && helper(to).__initialized ? { key: to.key, label: to.label } : undefined;
	}

	// Google's Knowledge Graph id as Trends takes it, e.g. "/m/01xw9" (Chinese cuisine)
	@Property({ type: 'text', nullable: true })
	trendsTopicId?: string | null;

	// A search phrase for a topic Google has no id for
	@Property({ type: 'text', nullable: true })
	trendsQuery?: string | null;

	/** What it covers, told to the agents that file a point under it ("the line to get in or to order"); aspects */
	@Property({ type: 'text', nullable: true })
	hint?: string | null;

	/**
	 * When promotion (`TermService.promote`) created it from wordings people used ("Smash burger"
	 * from "smash burger" + "smashburger"): provenance only; it is a topic like any other. Null for
	 * the seed's and an admin's.
	 */
	@Property({ type: 'datetime', nullable: true })
	discoveredAt?: Date | null;

	/**
	 * `embeddedText` as a vector (`text-embedding-3-large` at 1024 values, the claims' model): what
	 * a wording's vector is compared with to pick the topics agent C is offered (`topicShortlist`).
	 * Lazy and hidden: no other read selects it. `TopicService.embedPending` is the one writer.
	 */
	@Property({
		type: HalfvecType,
		length: EMBEDDING_DIMENSIONS,
		nullable: true,
		hidden: true,
		lazy: true,
	})
	embedding?: number[] | null;

	/** The text `embedding` was made from (`topicEmbeddingText`); a topic whose text differs now is embedded again */
	@Property({ type: 'text', nullable: true, hidden: true })
	embeddedText?: string | null;
}
