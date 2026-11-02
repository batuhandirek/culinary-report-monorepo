import { Collection } from '@mikro-orm/core';
import { Entity, OneToMany, Property } from '@mikro-orm/decorators/legacy';

import { MikroOrmSimpleEntityAbstractClass } from 'src/shared/abstractions/mikro-orm-simple-entity.abstract-class.js';

import { TermTopic } from './term-topic.entity.js';

/**
 * Who decided a term's links: the wording is a topic's key or label as a whole (`match`, free), the
 * `terms` backlog's agent (`ai`), or an admin (`admin`, never changed by anything else).
 */
export type TermDecider = 'match' | 'ai' | 'admin';

/**
 * One wording ever seen, kept as said, across spellings and plurals (`key` = `termKey`): a dish
 * name a review or a post gave ("Pommes", "Spaghetti Vongole"), one of Google's review tags
 * ("waiting time"), an admin's other name for a topic (an alias: "Frühstück" for breakfast), a
 * cuisine word an admin dismissed. Its links (`TermTopic`) say which topics it is, one or many
 * ("vegan döner": Döner & kebab, Vegan) — changeable any time; decided terms are part of
 * `TopicIndex`, so everything that matches text (mention cuisines, Google categories, delivery
 * menus, hashtags, Google's tags) learns every decision. A term with no link and no decision waits
 * for the backlog; one decided with no link is "none" ("meat", a dismissed word). `TermService` is
 * the one writer.
 */
@Entity({ tableName: 'terms' })
export class Term extends MikroOrmSimpleEntityAbstractClass<'topics'> {
	@Property({ type: 'text', unique: true })
	key: string;

	/** The spelling seen most when first stored, in the source's language: what the agent and the admin read */
	@Property({ type: 'text' })
	name: string;

	@Property({ type: 'text', nullable: true })
	decidedBy?: TermDecider | null;

	@Property({ type: 'datetime', nullable: true })
	decidedAt?: Date | null;

	/** The agent's label for a topic that would fit, when none does ("Fries", "Hummus"); null when the wording is too general */
	@Property({ type: 'text', nullable: true })
	suggestion?: string | null;

	/** When topic discovery last grouped it (null = not yet): a wording is grouped once, again only when reopened */
	@Property({ type: 'datetime', nullable: true })
	groupedAt?: Date | null;

	/** The topics it is, in the order given (`rank`); empty for "none" or not decided yet */
	@OneToMany(() => TermTopic, link => link.term, { orderBy: { rank: 'asc' }, orphanRemoval: true })
	topics = new Collection<TermTopic>(this);
}
