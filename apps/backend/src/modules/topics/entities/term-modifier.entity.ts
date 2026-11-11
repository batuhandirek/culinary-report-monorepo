import { PrimaryKeyProp, type Rel } from '@mikro-orm/core';
import { Entity, Index, ManyToOne, Property } from '@mikro-orm/decorators/legacy';

import type { EdgeType } from '../constants/topic-edge.constant.js';

import { Term } from './term.entity.js';
import { Topic } from './topic.entity.js';

/**
 * What a narrower wording says beyond its main topic, until it is promoted to a topic of its own:
 * "vegan döner" is Döner & kebab (`Term.topic`) and `has` Vegan; "Turkish breakfast plate" is
 * Breakfast and `is_a` Turkish. Counted like an edge of that type. Empty for an exact wording
 * (`Term.exact`): a synonym says nothing its topic's edges don't. `TermService` is the one writer;
 * promotion moves what holds for the whole thing onto the new topic's edges.
 */
@Entity({ tableName: 'term_modifiers' })
@Index({ properties: ['topic'] })
export class TermModifier {
	[PrimaryKeyProp]?: ['term', 'topic'];

	@ManyToOne({ entity: () => Term, primary: true, deleteRule: 'cascade' })
	term: Rel<Term>;

	@ManyToOne({ entity: () => Topic, primary: true, deleteRule: 'cascade' })
	topic: Rel<Topic>;

	@Property({ type: 'text' })
	type: EdgeType;

	/** The order the decision named them, from 0 */
	@Property({ type: 'int', default: 0 })
	rank: number = 0;
}
