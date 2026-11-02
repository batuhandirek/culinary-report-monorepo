import type { Rel } from '@mikro-orm/core';
import { Entity, Index, ManyToOne, Property, Unique } from '@mikro-orm/decorators/legacy';

import { MikroOrmSimpleEntityAbstractClass } from 'src/shared/abstractions/mikro-orm-simple-entity.abstract-class.js';

import { type TermRelation } from '../constants/term-relation.constant.js';

import { Term } from './term.entity.js';
import { Topic } from './topic.entity.js';

/**
 * One topic a term is ("vegan döner" → Döner & kebab at rank 0, Vegan at rank 1). A link, never a
 * copy: deleting the topic deletes the link. Written by `TermService` and `TopicDiscoveryService`.
 */
@Entity({ tableName: 'term_topics' })
@Unique({ properties: ['term', 'topic'] })
@Index({ properties: ['topic'] })
export class TermTopic extends MikroOrmSimpleEntityAbstractClass<'relation'> {
	@ManyToOne({ entity: () => Term, deleteRule: 'cascade' })
	term: Rel<Term>;

	@ManyToOne({ entity: () => Topic, deleteRule: 'cascade' })
	topic: Rel<Topic>;

	/** The order the decision named them, from 0: the first is the one a single-topic reader takes */
	@Property({ type: 'int' })
	rank: number;

	/**
	 * How strongly the wording is the topic (`TERM_RELATIONS`): `same` (a spelling, a translation:
	 * "Pommes" → Fries), `kind_of` (a more specific kind: "garlic parmesan fries" → Fries), `with`
	 * (an attribute or an ingredient: "vegan döner" → Vegan). Readers pick a strength (strict: same;
	 * normal: + kind_of; broad: all).
	 */
	@Property({ type: 'text', default: 'same' })
	relation: TermRelation = 'same';
}
