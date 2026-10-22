import { Collection, type Rel } from '@mikro-orm/core';
import { Entity, Enum, Index, OneToMany, OneToOne, Property } from '@mikro-orm/decorators/legacy';

import { Brand } from 'src/modules/venues/entities/brand.entity.js';
import { MikroOrmEntityAbstractClass } from 'src/shared/abstractions/mikro-orm-entity.abstract-class.js';

import { type ProspectLanguage, ProspectStageEnum } from '../constants/outreach.constant.js';

import { OutreachTouch } from './outreach-touch.entity.js';

/** A brand we are trying to sell the monthly report to. One per brand, whatever its cities. */
@Entity({ tableName: 'prospects' })
export class Prospect extends MikroOrmEntityAbstractClass<
	'stage' | 'language' | 'outreachCount'
> {
	@OneToOne({ entity: () => Brand, owner: true, deleteRule: 'cascade' })
	brand: Rel<Brand>;

	@Index()
	@Enum({ items: () => ProspectStageEnum, nativeEnumName: 'prospect_stage' })
	stage: ProspectStageEnum = ProspectStageEnum.TO_CONTACT;

	// The language we write to them in; picks the templates
	@Property({ type: 'text', default: 'en' })
	language: ProspectLanguage = 'en';

	// Who we write to: the owner or a manager, often from the website's imprint
	@Property({ type: 'text', nullable: true })
	contactName?: string | null;

	@Property({ type: 'text', nullable: true })
	contactEmail?: string | null;

	// Their own account's handle, without the @, for a DM
	@Property({ type: 'text', nullable: true })
	instagram?: string | null;

	// When they said we may e-mail them (a visit or call logged with consent, or set by hand).
	// German law (UWG §7) needs it before a cold e-mail; the composer warns without it.
	@Property({ type: 'datetime', nullable: true })
	emailConsentAt?: Date | null;

	// The one finding from their report the first email leads with, in `language`
	@Property({ type: 'text', nullable: true })
	hook?: string | null;

	@Property({ type: 'text', nullable: true })
	notes?: string | null;

	// When to write again if they stay quiet. Empty once they answer or the conversation ends.
	@Index()
	@Property({ type: 'datetime', nullable: true })
	nextFollowUpAt?: Date | null;

	// Kept up to date from the touches, so the list can sort by them
	@Property({ type: 'datetime', nullable: true })
	lastTouchAt?: Date | null;

	// Emails, DMs, calls and visits so far
	@Property({ type: 'int', default: 0 })
	outreachCount: number = 0;

	@OneToMany(() => OutreachTouch, touch => touch.prospect)
	touches = new Collection<OutreachTouch>(this);
}
