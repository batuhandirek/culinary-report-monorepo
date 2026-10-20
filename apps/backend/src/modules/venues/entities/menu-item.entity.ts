import type { Rel } from '@mikro-orm/core';
import { Entity, Index, ManyToOne, Property } from '@mikro-orm/decorators/legacy';

import { MikroOrmSimpleEntityAbstractClass } from 'src/shared/abstractions/mikro-orm-simple-entity.abstract-class.js';

import { VenueDeliveryListing } from './venue-delivery-listing.entity.js';

/**
 * One dish on a delivery menu in a month, price in the listing's currency (Wolt's cents
 * divided by 100). A month's scrape replaces that month's rows, so months stay comparable.
 */
@Entity({ tableName: 'menu_items' })
@Index({ properties: ['listing', 'month'] })
export class MenuItem extends MikroOrmSimpleEntityAbstractClass {
	@ManyToOne({ entity: () => VenueDeliveryListing, deleteRule: 'cascade' })
	listing: Rel<VenueDeliveryListing>;

	// YYYY-MM
	@Property({ type: 'text' })
	month: string;

	@Property({ type: 'text' })
	name: string;

	@Property({ type: 'float' })
	price: number;

	@Property({ type: 'text', nullable: true })
	category?: string | null;
}
