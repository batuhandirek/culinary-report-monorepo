import type { Rel } from '@mikro-orm/core';
import { Check, Entity, Index, ManyToOne, Property } from '@mikro-orm/decorators/legacy';

import { Term } from 'src/modules/topics/entities/term.entity.js';
import { Topic } from 'src/modules/topics/entities/topic.entity.js';
import { MikroOrmSimpleEntityAbstractClass } from 'src/shared/abstractions/mikro-orm-simple-entity.abstract-class.js';

import { Statement } from './statement.entity.js';

/** What kind of part: the aspect the claim is about, or a food or drink wording it names */
export type StatementPartRole = 'aspect' | 'food';

/**
 * One thing a statement is about, an atom. An `aspect` part is the `Topic` of kind aspect agent B
 * chose ("waited 50 minutes" → Waiting). A `food` part is a wording as the source spelled it, the
 * `Term` ("Pommes", "vegan döner"); its topics are the term's links (`term_topics`), **joined at
 * read time, never copied**, so an admin's or the agent's decision on a wording moves every statement
 * naming it at once. "Who talked about X" = aspect parts of X or a descendant, plus food parts whose
 * term links X or a descendant. Written by `StatementPartsService` only.
 */
@Entity({ tableName: 'statement_parts' })
@Check({
	name: 'statement_parts_role_check',
	expression:
		"(role = 'aspect' and topic_id is not null and term_id is null) or (role = 'food' and term_id is not null and topic_id is null)",
})
@Index({ properties: ['topic', 'role'] })
@Index({ properties: ['term'] })
export class StatementPart extends MikroOrmSimpleEntityAbstractClass {
	@ManyToOne({ entity: () => Statement, deleteRule: 'cascade', index: true })
	statement: Rel<Statement>;

	@Property({ type: 'text' })
	role: StatementPartRole;

	/** The aspect (`aspect` parts only) */
	@ManyToOne({ entity: () => Topic, nullable: true, deleteRule: 'cascade' })
	topic?: Rel<Topic> | null;

	/** The wording (`food` parts only), whose `topics` are the part's topics */
	@ManyToOne({ entity: () => Term, nullable: true, deleteRule: 'cascade' })
	term?: Rel<Term> | null;

	/** The order answered, from 0 */
	@Property({ type: 'int' })
	rank: number;
}
