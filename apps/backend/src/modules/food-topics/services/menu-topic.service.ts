import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import _ from 'lodash';

import type { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { pricePosition, type PricePosition } from 'src/modules/venues/util/delivery.js';

import { type MenuPriceRow, menuItemsOf, type MenuTopicPrices, menuTopicPrices } from '../util/menu-topics.js';

import { FoodTopicService } from './food-topic.service.js';
import { VenueFoodTopicService } from './venue-food-topic.service.js';

/**
 * Delivery menus (`MenuItem`, written by `VenueDeliveryService`) read by food topic: who sells a
 * kind of food and at what price, and a venue's own kind of food against the others'. Every
 * link to a topic is resolved on read (`resolveMenuItem`), so a new alias reprices at once.
 * Menus are scraped for the report venues and their competitors only, so the figures lean to them.
 */
@Injectable()
export class MenuTopicService {
	constructor(
		private readonly em: EntityManager,
		private readonly foodTopicService: FoodTopicService,
		private readonly venueFoodTopicService: VenueFoodTopicService,
	) {}

	/** Per topic, the city's open venues with it on the month's menu and its price (`menuTopicPrices`). */
	async prices(cityId: string, month: string, topicKeys?: string[]): Promise<MenuTopicPrices> {
		const [index, rows] = await Promise.all([
			this.foodTopicService.index(),
			this.em.getConnection().execute<
				{ venue_id: string; district: string | null; name: string; category: string | null; price: number }[]
			>(
				`select l.venue_id, v.district, mi.name, mi.category, mi.price from menu_items mi
					join venue_delivery_listings l on l.id = mi.listing_id
					join venues v on v.id = l.venue_id
					where v.city_id = ? and not v.closed and mi.month = ?`,
				[cityId, month],
			),
		]);
		return menuTopicPrices(
			rows.map(
				(r): MenuPriceRow => ({
					venueId: r.venue_id,
					district: r.district,
					name: r.name,
					category: r.category,
					price: Number(r.price),
				}),
			),
			index,
			topicKeys,
		);
	}

	/**
	 * `pricePosition` of the venue's latest menu up to `month` against the others' (competitors,
	 * or the district's), its primary food topic first ("your ramen against their ramen"). Null
	 * when its menu has no main course.
	 */
	async pricePosition(
		venue: Venue,
		otherVenueIds: string[],
		month: string,
		dishes: string[],
	): Promise<PricePosition | null> {
		const ids = _.uniq([venue.id, ...otherVenueIds]);
		const [index, tags, rows] = await Promise.all([
			this.foodTopicService.index(),
			this.venueFoodTopicService.tags([venue]),
			this.em.getConnection().execute<{ venue_id: string; name: string; category: string | null; price: number }[]>(
				`select l.venue_id, mi.name, mi.category, mi.price from menu_items mi
					join venue_delivery_listings l on l.id = mi.listing_id
					where l.venue_id in (${ids.map(() => '?').join(', ')})
					and mi.month = (select max(x.month) from menu_items x where x.listing_id = mi.listing_id and x.month <= ?)`,
				[...ids, month],
			),
		]);
		const items = _.groupBy(
			rows.map(r => ({ venueId: r.venue_id, name: r.name, category: r.category, price: Number(r.price) })),
			r => r.venueId,
		);
		const primary = tags.get(venue.id)?.find(t => t.primary)?.key;
		return pricePosition(
			{ venueId: venue.id, name: venue.name, items: items[venue.id] ?? [] },
			otherVenueIds
				.filter(id => id !== venue.id && items[id]?.length)
				.map(id => ({ venueId: id, name: '', items: items[id] })),
			dishes,
			primary ?
				{ key: primary, label: index.get(primary)?.label ?? primary, matches: menuItemsOf(index, primary) }
			:	undefined,
		);
	}
}
