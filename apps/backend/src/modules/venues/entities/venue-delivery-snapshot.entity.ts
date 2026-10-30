import type { Rel } from '@mikro-orm/core';
import { Entity, ManyToOne, Property, Unique } from '@mikro-orm/decorators/legacy';

import { MikroOrmSimpleEntityAbstractClass } from 'src/shared/abstractions/mikro-orm-simple-entity.abstract-class.js';

import { VenueDeliveryListing } from './venue-delivery-listing.entity.js';

/**
 * A delivery listing's figures in one month, as that month's `SCRAPE_DELIVERY` saw them: the
 * listing itself holds only the latest, so its rating trend is these rows. A month's scrape
 * replaces that month's row, like its menu. Fields the platform doesn't give are null.
 */
@Entity({ tableName: 'venue_delivery_snapshots' })
@Unique({ properties: ['listing', 'month'] })
export class VenueDeliverySnapshot extends MikroOrmSimpleEntityAbstractClass {
	@ManyToOne({ entity: () => VenueDeliveryListing, deleteRule: 'cascade' })
	listing: Rel<VenueDeliveryListing>;

	// YYYY-MM, the month the scrape ran for (as `MenuItem.month`)
	@Property({ type: 'text' })
	month: string;

	@Property({ type: 'float', nullable: true })
	rating?: number | null;

	@Property({ type: 'int', nullable: true })
	reviewsCount?: number | null;

	@Property({ type: 'float', nullable: true })
	deliveryFee?: number | null;

	@Property({ type: 'float', nullable: true })
	minOrder?: number | null;

	@Property({ type: 'datetime' })
	fetchedAt: Date;
}
