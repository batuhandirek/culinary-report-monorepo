import type { Rel } from '@mikro-orm/core';
import { Entity, ManyToOne, Property, Unique } from '@mikro-orm/decorators/legacy';

import { MikroOrmSimpleEntityAbstractClass } from 'src/shared/abstractions/mikro-orm-simple-entity.abstract-class.js';

import { Venue } from './venue.entity.js';

/** A venue's Google rating on one day: the rating trend is these rows. */
@Entity({ tableName: 'venue_snapshots' })
@Unique({ properties: ['venue', 'snapshotDate'] })
export class VenueSnapshot extends MikroOrmSimpleEntityAbstractClass {
	@ManyToOne({ entity: () => Venue, deleteRule: 'cascade' })
	venue: Rel<Venue>;

	// YYYY-MM-DD
	@Property({ type: 'text' })
	snapshotDate: string;

	@Property({ type: 'float', nullable: true })
	rating?: number | null;

	@Property({ type: 'int', nullable: true })
	reviewsCount?: number | null;
}
