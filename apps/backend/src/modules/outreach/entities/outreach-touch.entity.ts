import type { Rel } from '@mikro-orm/core';
import { Entity, Enum, ManyToOne, Property } from '@mikro-orm/decorators/legacy';

import { Report } from 'src/modules/reports/entities/report.entity.js';
import { ReportShare } from 'src/modules/reports/entities/report-share.entity.js';
import { MikroOrmEntityAbstractClass } from 'src/shared/abstractions/mikro-orm-entity.abstract-class.js';

import {
	OutreachTouchKindEnum,
	OutreachTouchOutcomeEnum,
	ProspectStageEnum,
} from '../constants/outreach.constant.js';

import { Prospect } from './prospect.entity.js';

/** One entry in a prospect's log: an email we sent, their reply, a call, a visit, a note. */
@Entity({ tableName: 'outreach_touches' })
export class OutreachTouch extends MikroOrmEntityAbstractClass<'emailConsent'> {
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

	// VISIT or CALL: who we got hold of, if anyone
	@Enum({ items: () => OutreachTouchOutcomeEnum, nativeEnumName: 'outreach_touch_outcome', nullable: true })
	outcome?: OutreachTouchOutcomeEnum | null;

	// VISIT or CALL: when to come back ("the owner is in on Tuesdays after 15:00"); becomes the follow-up
	@Property({ type: 'datetime', nullable: true })
	comeBackAt?: Date | null;

	// VISIT or CALL: they said we may e-mail them (UWG §7); stamps `Prospect.emailConsentAt`
	@Property({ type: 'boolean', default: false })
	emailConsent: boolean = false;

	// The report it sent (the brand's own), and the link it used: a share of its own, so the
	// share's opens are this touch's
	@ManyToOne({ entity: () => Report, nullable: true, deleteRule: 'set null', index: true })
	report?: Rel<Report> | null;

	@ManyToOne({ entity: () => ReportShare, nullable: true, deleteRule: 'set null', index: true })
	share?: Rel<ReportShare> | null;
}
