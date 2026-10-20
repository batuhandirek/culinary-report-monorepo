import type { Rel } from '@mikro-orm/core';
import { Entity, Enum, Index, ManyToOne, Property } from '@mikro-orm/decorators/legacy';

import { MikroOrmSimpleEntityAbstractClass } from 'src/shared/abstractions/mikro-orm-simple-entity.abstract-class.js';

import {
	VenueScrapeSourceEnum,
	VenueStatusChangeKindEnum,
} from '../constants/venue-status.constant.js';

import { Venue } from './venue.entity.js';

/**
 * A venue opening, closing or reopening, as a Google Maps scrape first saw it
 * (`VenueService.saveGooglePlace`). `at` is the scrape, not the day it happened.
 */
@Entity({ tableName: 'venue_status_changes' })
@Index({ properties: ['kind', 'at'] })
export class VenueStatusChange extends MikroOrmSimpleEntityAbstractClass {
	@ManyToOne({ entity: () => Venue, deleteRule: 'cascade', index: true })
	venue: Rel<Venue>;

	@Property({ type: 'datetime' })
	at: Date;

	@Enum({ items: () => VenueStatusChangeKindEnum, nativeEnumName: 'venue_status_change_kind' })
	kind: VenueStatusChangeKindEnum;

	@Enum({ items: () => VenueScrapeSourceEnum, nativeEnumName: 'venue_scrape_source' })
	source: VenueScrapeSourceEnum;
}
