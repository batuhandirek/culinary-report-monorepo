import { Collection, type Rel } from '@mikro-orm/core';
import { Entity, ManyToOne, OneToMany, Property } from '@mikro-orm/decorators/legacy';

import { MikroOrmSimpleEntityAbstractClass } from 'src/shared/abstractions/mikro-orm-simple-entity.abstract-class.js';

import { TermModifier } from './term-modifier.entity.js';
import { Topic, type TopicKindEnum } from './topic.entity.js';

/**
 * Who decided a term: the wording is a topic's key or label as a whole (`match`, free), the
 * `terms` backlog's agent (`ai`), or an admin (`admin`, never changed by anything else).
 */
export type TermDecider = 'match' | 'ai' | 'admin';

/**
 * One wording ever seen, kept as said, across spellings and plurals (`key` = `termKey`): a dish
 * name a review or a post gave ("Pommes", "Spaghetti Vongole"), one of Google's review tags
 * ("waiting time"), a cuisine or category text nothing resolved. It points at **one main topic**
 * (`topic`) or none: `exact` says it is that topic, spelled or translated ("Melemen" is Menemen,
 * "Pommes" is Fries); otherwise it is something narrower under it ("kumpir" under Turkish, "vegan
 * döner" under Döner & kebab), with what else it is or has as `modifiers` (`has` Vegan) and the
 * label and kind it would carry as a topic of its own (`proposedLabel`, `proposedKind`), which
 * promotion reads. Everything else about the thing (Menemen is Turkish, is a breakfast) is an edge
 * of its topic, never repeated per spelling. Decided with no topic and no modifier is "not food,
 * not an aspect" ("food", "plate"); not decided waits for the `terms` backlog. Decided terms are
 * part of `TopicIndex`. `TermService` is the one writer.
 */
@Entity({ tableName: 'terms' })
export class Term extends MikroOrmSimpleEntityAbstractClass<'modifiers' | 'exact'> {
	@Property({ type: 'text', unique: true })
	key: string;

	/** The spelling seen most when first stored, in the source's language: what the agent and the admin read */
	@Property({ type: 'text' })
	name: string;

	/** The one topic it is (`exact`) or is a narrower thing under; null for none or not decided */
	@ManyToOne({ entity: () => Topic, nullable: true, deleteRule: 'set null', index: true })
	topic?: Rel<Topic> | null;

	/** True: a synonym of `topic`. False: a narrower concept under it (or under nothing yet), a candidate for a topic of its own */
	@Property({ type: 'boolean', default: false })
	exact: boolean = false;

	/** The label a narrower wording would have as a topic, one per thing whatever the spelling or language ("Vegan döner"): promotion's grouping key */
	@Property({ type: 'text', nullable: true })
	proposedLabel?: string | null;

	/** The kind that topic would have (`TopicKindEnum`) */
	@Property({ type: 'text', nullable: true })
	proposedKind?: TopicKindEnum | null;

	@Property({ type: 'text', nullable: true })
	decidedBy?: TermDecider | null;

	@Property({ type: 'datetime', nullable: true })
	decidedAt?: Date | null;

	/** What a narrower wording is or has beside its main topic, in the order given; empty for an exact one */
	@OneToMany(() => TermModifier, modifier => modifier.term, {
		orderBy: { rank: 'asc' },
		orphanRemoval: true,
	})
	modifiers = new Collection<TermModifier>(this);
}
