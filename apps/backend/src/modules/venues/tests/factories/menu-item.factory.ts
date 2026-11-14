import type { EntityManager } from '@mikro-orm/postgresql';

import { MenuItem } from '../../entities/menu-item.entity.js';
import { MenuItemSnapshot } from '../../entities/menu-item-snapshot.entity.js';
import type { VenueDeliveryListing } from '../../entities/venue-delivery-listing.entity.js';
import { menuKey } from '../../util/delivery-pages.js';

/** The item's row for a month: its price as that month's read saw it. Not flushed. */
export const seedMenuMonth = (
	em: EntityManager,
	menuItem: MenuItem,
	month: string,
	price: number,
): MenuItemSnapshot =>
	em.create(MenuItemSnapshot, {
		menuItem,
		month,
		price,
		seenAt: new Date(`${month}-15T12:00:00Z`),
	});

/**
 * A menu item as a read in `month` would have stored it: on the menu, at `price` that month, with
 * that month's row. Persisted into the unit of work, not flushed.
 */
export const seedMenuItem = (
	em: EntityManager,
	listing: VenueDeliveryListing,
	item: { name: string; price: number; month: string; category?: string | null; removedAt?: Date | null },
): MenuItem => {
	const seenAt = new Date(`${item.month}-15T12:00:00Z`);
	const menuItem = em.create(MenuItem, {
		listing,
		key: menuKey(item.name),
		name: item.name,
		category: item.category ?? null,
		price: item.price,
		firstSeenAt: seenAt,
		lastSeenAt: seenAt,
		removedAt: item.removedAt ?? null,
	});
	seedMenuMonth(em, menuItem, item.month, item.price);
	return menuItem;
};
