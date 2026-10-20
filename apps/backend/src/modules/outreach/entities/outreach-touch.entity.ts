import type { Rel } from '@mikro-orm/core';
import { Entity, Enum, ManyToOne, Property } from '@mikro-orm/decorators/legacy';

import { MikroOrmEntityAbstractClass } from 'src/shared/abstractions/mikro-orm-entity.abstract-class.js';

import { OutreachTouchKindEnum, ProspectStageEnum } from '../constants/outreach.constant.js';

import { Prospect } from './prospect.entity.js';

/** One entry in a prospect's log: an email we sent, their reply, a call, a note. */
@Entity({ tableName: 'outreach_touches' })
export class OutreachTouch extends MikroOrmEntityAbstractClass {
	@ManyToOne({ entity: () => Prospect, deleteRule: 'cascade', index: true })
	prospect: Rel<Prospect>;

	@Enum({ items: () => OutreachTouchKindEnum, nativeEnumName: 'outreach_touch_kind' })
	kind: OutreachTouchKindEnum;

	// When it happened, which may be before it was logged
	@Property({ type: 'datetime' })
	at: Date;

	@Property({ type: 'text', nullable: true })
	subject?: string | null;

	// What was sent or said, or the note itself
	@Property({ type: 'text', nullable: true })
	body?: string | null;

	// The template it started from (`intro`, `follow-up`…), to compare which copy gets answers
	@Property({ type: 'text', nullable: true })
	template?: string | null;

	// STAGE: the stage the prospect moved to
	@Enum({ items: () => ProspectStageEnum, nullable: true })
	stage?: ProspectStageEnum | null;
}
