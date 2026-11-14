import type { Rel } from '@mikro-orm/core';
import { Entity, Index, ManyToOne, Property, Unique } from '@mikro-orm/decorators/legacy';

import { MikroOrmSimpleEntityAbstractClass } from 'src/shared/abstractions/mikro-orm-simple-entity.abstract-class.js';

import { VenueDeliveryListing } from './venue-delivery-listing.entity.js';

/**
 * One item of a venue's menu on one delivery platform, kept for good: a read of the menu updates
 * the items it lists, adds the new ones and marks the ones it no longer lists `removedAt` (an item
 * back on the menu loses the mark), so a dish a venue stopped selling stays with its history and
 * its links. One row per listing and `key` (`menuKey` of its name): an item the platform lists in
 * several sections is one row, under the last of them.
 *
 * `price` and the rating are the latest; each month a read saw it is a `MenuItemSnapshot` row with
 * that month's, which is also how a month's menu is read. Its food topics are `MenuItemTopic`, the
 * wordings reviews and posts use for it `MenuItemTerm`. `VenueDeliveryService` is the one writer.
 */
@Entity({ tableName: 'menu_items' })
@Unique({ properties: ['listing', 'key'] })
@Index({ properties: ['listing', 'removedAt'] })
export class MenuItem extends MikroOrmSimpleEntityAbstractClass<
	'description' | 'category' | 'externalId' | 'likedShare' | 'ratingsCount' | 'removedAt'
> {
	@ManyToOne({ entity: () => VenueDeliveryListing, deleteRule: 'cascade' })
	listing: Rel<VenueDeliveryListing>;

	// `menuKey(name)`: the name as wordings are keyed (`termKey`), so a review's "Banging Bangkok"
	// and the menu's "Banging Bangkok 🌶️🌶️" are one key
	@Property({ type: 'text' })
	key: string;

	// As the platform lists it
	@Property({ type: 'text' })
	name: string;

	@Property({ type: 'text', nullable: true })
	description?: string | null;

	// The menu section it is listed under
	@Property({ type: 'text', nullable: true })
	category?: string | null;

	// The latest price, in the listing's currency
	@Property({ type: 'float' })
	price: number;

	// The platform's own id for the item
	@Property({ type: 'text', nullable: true })
	externalId?: string | null;

	// The share of raters who liked it (0–1) and how many rated it, where the platform says
	// (Uber Eats), as last read
	@Property({ type: 'float', nullable: true })
	likedShare?: number | null;

	@Property({ type: 'int', nullable: true })
	ratingsCount?: number | null;

	// When a read of the menu first and last listed it
	@Property({ type: 'datetime' })
	firstSeenAt: Date;

	@Property({ type: 'datetime' })
	lastSeenAt: Date;

	// When a read of the menu first came back without it; null while it is on the menu
	@Property({ type: 'datetime', nullable: true })
	removedAt?: Date | null;
}
