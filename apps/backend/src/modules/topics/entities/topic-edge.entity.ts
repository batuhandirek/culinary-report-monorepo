import type { Rel } from '@mikro-orm/core';
import { Entity, Index, ManyToOne, Property, Unique } from '@mikro-orm/decorators/legacy';

import { MikroOrmSimpleEntityAbstractClass } from 'src/shared/abstractions/mikro-orm-simple-entity.abstract-class.js';

import type { EdgeDecider, EdgeType } from '../constants/topic-edge.constant.js';

import { Topic } from './topic.entity.js';

/**
 * One relation between two topics, stated once on the topic so every wording of it follows:
 * `from` is a kind of `to` (`is_a`: Menemen → Turkish, Menemen → Breakfast, Queue → Waiting) or has
 * it (`has`: Vegan döner → Vegan). The parent is an edge like any other: a topic's first `is_a`
 * (`rank` 0) is its display parent. Food to food, aspect to aspect, never a cycle; an aspect has
 * one `is_a` at most and no `has` (`TopicService` refuses the rest, and is the one writer).
 * `topic_closure` is derived from these rows.
 */
@Entity({ tableName: 'topic_edges' })
@Unique({ properties: ['from', 'to', 'type'] })
@Index({ properties: ['to'] })
export class TopicEdge extends MikroOrmSimpleEntityAbstractClass<'decidedAt'> {
	/** The topic the edge is about */
	@ManyToOne({ entity: () => Topic, deleteRule: 'cascade' })
	from: Rel<Topic>;

	@ManyToOne({ entity: () => Topic, deleteRule: 'cascade' })
	to: Rel<Topic>;

	@Property({ type: 'text' })
	type: EdgeType;

	/** The order among `from`'s edges of one type, from 0: the first `is_a` is the display parent */
	@Property({ type: 'int', default: 0 })
	rank: number = 0;

	@Property({ type: 'text' })
	decidedBy: EdgeDecider;

	@Property({ type: 'datetime', defaultRaw: 'now()' })
	decidedAt!: Date;
}
