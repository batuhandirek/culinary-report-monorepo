import type { Rel } from '@mikro-orm/core';
import { Entity, Index, ManyToOne, Property, Unique } from '@mikro-orm/decorators/legacy';

import { City } from 'src/modules/cities/entities/city.entity.js';
import { MikroOrmEntityAbstractClass } from 'src/shared/abstractions/mikro-orm-entity.abstract-class.js';

import type { LandingCopy, LandingEditionData } from '../interfaces/landing-edition.interface.js';

/**
 * One live edition of a city's front page (`/`): the 30 days before `windowEnd` counted and
 * written up by `LandingEditionService.build`, every five days by the cron. It publishes itself;
 * an admin can take one down, which puts the newest other published edition back. Editions are
 * kept, so a bad one is undone by unpublishing it.
 */
@Entity({ tableName: 'landing_editions' })
@Unique({ properties: ['city', 'windowEnd'] })
@Index({ properties: ['city', 'publishedAt'] })
export class LandingEdition extends MikroOrmEntityAbstractClass<'publishedAt' | 'copyError'> {
	@ManyToOne({ entity: () => City, deleteRule: 'cascade' })
	city: Rel<City>;

	// The counted window [windowStart, windowEnd): whole UTC days
	@Property({ type: 'datetime' })
	windowStart: Date;

	@Property({ type: 'datetime' })
	windowEnd: Date;

	@Property({ type: 'jsonb' })
	data: LandingEditionData;

	// What the model wrote, checked line by line; fallbacks where it failed
	@Property({ type: 'jsonb' })
	copy: LandingCopy;

	// The model's call failed and every line is a fallback: why
	@Property({ type: 'text', nullable: true })
	copyError?: string | null;

	@Property({ type: 'datetime' })
	builtAt: Date;

	// Set at build when the edition has places to show; cleared by an admin's unpublish
	@Property({ type: 'datetime', nullable: true })
	publishedAt?: Date | null;
}
