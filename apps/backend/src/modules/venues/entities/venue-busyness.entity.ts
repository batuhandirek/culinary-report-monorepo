import type { Rel } from '@mikro-orm/core';
import { Entity, Index, ManyToOne, Property } from '@mikro-orm/decorators/legacy';

import { MikroOrmSimpleEntityAbstractClass } from 'src/shared/abstractions/mikro-orm-simple-entity.abstract-class.js';

import type { PopularTimesHistogram } from '../interfaces/venue-details.interface.js';

import { Venue } from './venue.entity.js';

/**
 * One sample of a venue's Google popular times (the `busyness-sample` cron, twice a week):
 * the 7×24 histogram as Google showed it and, when present, the live percent at sampling time.
 * `histogram` is null when Google showed no popular times; a venue the scrape returned nothing
 * for gets no row.
 */
@Entity({ tableName: 'venue_busyness' })
@Index({ properties: ['venue', 'sampledAt'] })
export class VenueBusyness extends MikroOrmSimpleEntityAbstractClass {
	@ManyToOne({ entity: () => Venue, deleteRule: 'cascade' })
	venue: Rel<Venue>;

	@Property({ type: 'datetime' })
	sampledAt: Date;

	@Property({ type: 'jsonb', nullable: true })
	histogram?: PopularTimesHistogram | null;

	// The histogram's busynessIndex (mean of its ten busiest hours, 0–100), null without one
	@Property({ type: 'float', nullable: true })
	busynessIndex?: number | null;

	@Property({ type: 'int', nullable: true })
	livePercent?: number | null;

	@Property({ type: 'text', nullable: true })
	liveText?: string | null;
}
