import { Collection, type Rel } from '@mikro-orm/core';
import { Entity, Enum, ManyToOne, OneToMany, Property, Unique } from '@mikro-orm/decorators/legacy';

import { MikroOrmEntityAbstractClass } from 'src/shared/abstractions/mikro-orm-entity.abstract-class.js';

import { MenuItem } from './menu-item.entity.js';
import { Venue } from './venue.entity.js';

export enum DeliveryPlatformEnum {
	WOLT = 'wolt',
	LIEFERANDO = 'lieferando',
	UBER_EATS = 'uber_eats',
}

/**
 * A venue's page on a delivery platform, as of the last read of it (`SCRAPE_DELIVERY`): what the
 * platform calls it and where it says it is, its own rating (0–5), review count, delivery fee,
 * minimum order (in `currency`) and delivery time. One per venue and platform; its figures per
 * month are `VenueDeliverySnapshot`, its menu `MenuItem`. A field the platform doesn't give is
 * null: unknown, never zero. `VenueDeliveryService` is the one writer.
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

	// The restaurant's name and address as the platform has them: what it was matched to the venue by
	@Property({ type: 'text', nullable: true })
	name?: string | null;

	@Property({ type: 'text', nullable: true })
	address?: string | null;

	// The platform's own cuisine tags ("Burger", "Hühnchen")
	@Property({ type: 'jsonb', nullable: true })
	cuisines?: string[] | null;

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

	// Delivery time in minutes, as the platform estimated it at the read
	@Property({ type: 'int', nullable: true })
	etaMin?: number | null;

	@Property({ type: 'int', nullable: true })
	etaMax?: number | null;

	@Property({ type: 'datetime' })
	fetchedAt: Date;

	// When a read last came back with its menu; null for a listing whose menu was never read
	@Property({ type: 'datetime', nullable: true })
	menuFetchedAt?: Date | null;

	// When a read of its page first came back empty (the restaurant left the platform, or its page
	// moved); null while the page answers. Its menu and snapshots stay
	@Property({ type: 'datetime', nullable: true })
	removedAt?: Date | null;

	@OneToMany(() => MenuItem, item => item.listing)
	menuItems = new Collection<MenuItem>(this);
}
