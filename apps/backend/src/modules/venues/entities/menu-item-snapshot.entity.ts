import type { Rel } from '@mikro-orm/core';
import { Entity, Index, ManyToOne, Property, Unique } from '@mikro-orm/decorators/legacy';

import { MikroOrmSimpleEntityAbstractClass } from 'src/shared/abstractions/mikro-orm-simple-entity.abstract-class.js';

import { MenuItem } from './menu-item.entity.js';

/**
 * A menu item in one month, as that month's last read of its menu saw it: its price and, where the
 * platform says, how raters liked it. A row means the month's menu had the item, so a month's menu
 * is its rows (`VenueDeliveryService.menus`), an item's price over time is its rows in order, and
 * "who raised prices" is a join of two months. A later read in the same month replaces the month's
 * row, as a listing's `VenueDeliverySnapshot`. `VenueDeliveryService` is the one writer.
 */
@Entity({ tableName: 'menu_item_snapshots' })
@Unique({ properties: ['menuItem', 'month'] })
@Index({ properties: ['month'] })
export class MenuItemSnapshot extends MikroOrmSimpleEntityAbstractClass<'likedShare' | 'ratingsCount'> {
	@ManyToOne({ entity: () => MenuItem, deleteRule: 'cascade' })
	menuItem: Rel<MenuItem>;

	// YYYY-MM, the month the read ran for (as `VenueDeliverySnapshot.month`)
	@Property({ type: 'text' })
	month: string;

	// In the listing's currency
	@Property({ type: 'float' })
	price: number;

	// The share of raters who liked it (0–1) and how many rated it (Uber Eats)
	@Property({ type: 'float', nullable: true })
	likedShare?: number | null;

	@Property({ type: 'int', nullable: true })
	ratingsCount?: number | null;

	@Property({ type: 'datetime' })
	seenAt: Date;
}
