import { Collection, type Rel } from '@mikro-orm/core';
import { Entity, Enum, ManyToOne, OneToMany, Property, Unique } from '@mikro-orm/decorators/legacy';

import { MikroOrmEntityAbstractClass } from 'src/shared/abstractions/mikro-orm-entity.abstract-class.js';

import { MenuItem } from './menu-item.entity.js';
import { Venue } from './venue.entity.js';

export enum DeliveryPlatformEnum {
	WOLT = 'wolt',
	LIEFERANDO = 'lieferando',
}

/**
 * A venue's page on a delivery platform, as of the last `SCRAPE_DELIVERY`: the platform's own
 * rating (0–5), review count, delivery fee and minimum order (in `currency`). One per venue and
 * platform; its menu is `MenuItem` rows per month.
 */
@Entity({ tableName: 'venue_delivery_listings' })
@Unique({ properties: ['venue', 'platform'] })
export class VenueDeliveryListing extends MikroOrmEntityAbstractClass {
	@ManyToOne({ entity: () => Venue, deleteRule: 'cascade' })
	venue: Rel<Venue>;

	@Enum({ items: () => DeliveryPlatformEnum, nativeEnumName: 'delivery_platform' })
	platform: DeliveryPlatformEnum;

	@Property({ type: 'text' })
	url: string;

	// The platform's own id for the restaurant
	@Property({ type: 'text', nullable: true })
	externalId?: string | null;

	@Property({ type: 'float', nullable: true })
	rating?: number | null;

	@Property({ type: 'int', nullable: true })
	reviewsCount?: number | null;

	@Property({ type: 'float', nullable: true })
	deliveryFee?: number | null;

	@Property({ type: 'float', nullable: true })
	minOrder?: number | null;

	@Property({ type: 'text', nullable: true })
	currency?: string | null;

	@Property({ type: 'datetime' })
	fetchedAt: Date;

	@OneToMany(() => MenuItem, item => item.listing)
	menuItems = new Collection<MenuItem>(this);
}
