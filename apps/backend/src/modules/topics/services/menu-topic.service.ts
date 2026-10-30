import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable, OnModuleInit } from '@nestjs/common';

import _ from 'lodash';

import type { MenuItem } from 'src/modules/venues/entities/menu-item.entity.js';
import type { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { pricePosition, type PricePosition } from 'src/modules/venues/util/delivery.js';

import { Topic } from '../entities/topic.entity.js';
import { MenuItemTopic } from '../entities/menu-item-topic.entity.js';
import type { TopicIndex } from '../util/topics.js';
import { type MenuPriceRow, menuItemsOf, type MenuTopicPrices, menuTopicPrices } from '../util/menu-topics.js';

import { TopicService } from './topic.service.js';
import { TopicRelinkService } from './topic-relink.service.js';
import { VenueTopicService } from './venue-topic.service.js';

const CHUNK = 500;

/** SQL: a menu item's (`mi`) stored topic keys */
const ITEM_TOPICS_SQL = `(select coalesce(array_agg(t.key), '{}') from menu_item_topics it
	join topics t on t.id = it.topic_id where it.menu_item_id = mi.id) as topics`;

/**
 * Delivery menus (`MenuItem`, written by `VenueDeliveryService`) read by food topic: who sells a
 * kind of food and at what price, and a venue's own kind of food against the others'. Each item's
 * topics are stored (`MenuItemTopic`, this service the one writer: `linkItems` with the scrape,
 * `relink` from `TopicRelinkJob`), so a new alias reprices once the job ran. Menus are scraped
 * for the report venues and their competitors only, so the figures lean to them.
 */
@Injectable()
export class MenuTopicService implements OnModuleInit {
	constructor(
		private readonly em: EntityManager,
		private readonly topicService: TopicService,
		private readonly venueTopicService: VenueTopicService,
		private readonly topicRelinkService: TopicRelinkService,
	) {}

	onModuleInit() {
		this.topicRelinkService.register({ key: 'menu-item-topics', relink: index => this.relink(index) });
	}

	/**
	 * Gives new menu items their topics (`resolveMenuItem`: the name, else the menu section), in the
	 * caller's unit of work: they flush with the items.
	 */
	linkItems(items: MenuItem[], index: TopicIndex): void {
		for (const item of items)
			for (const key of index.resolveMenuItem(item)) {
				const id = index.get(key)?.id;
				if (id) this.em.create(MenuItemTopic, { menuItem: item, topic: this.em.getReference(Topic, id) });
			}
	}

	/** Every stored item's topics against the index as it is now, writing only what changed. */
	async relink(index: TopicIndex): Promise<{ items: number; changed: number }> {
		const conn = this.em.getConnection();
		const rows: { id: number; name: string; category: string | null; keys: string[] }[] = await conn.execute(
			`select mi.id, mi.name, mi.category, ${ITEM_TOPICS_SQL.replace(' as topics', '')} as keys from menu_items mi`,
		);
		const changed = rows
			.map(r => ({ id: r.id, keys: index.resolveMenuItem(r).filter(key => index.get(key)?.id), had: r.keys }))
			.filter(r => [...r.keys].sort().join('|') !== [...r.had].sort().join('|'));
		for (const chunk of _.chunk(changed, CHUNK)) {
			await conn.execute(
				`delete from menu_item_topics where menu_item_id in (${chunk.map(() => '?').join(', ')})`,
				chunk.map(r => r.id),
			);
			const links = chunk.flatMap(r => r.keys.map(key => [r.id, index.get(key)!.id!] as const));
			if (links.length)
				await conn.execute(
					`insert into menu_item_topics (menu_item_id, topic_id) values ${links.map(() => '(?, ?::uuid)').join(', ')}
					on conflict do nothing`,
					links.flat(),
				);
		}
		return { items: rows.length, changed: changed.length };
	}

	/** Per topic, the city's open venues with it on the month's menu and its price (`menuTopicPrices`). */
	async prices(cityId: string, month: string, topicKeys?: string[]): Promise<MenuTopicPrices> {
		const [index, rows] = await Promise.all([
			this.topicService.index(),
			this.em.getConnection().execute<{ venue_id: string; district: string | null; topics: string[]; price: number }[]>(
				`select l.venue_id, v.district, mi.price, ${ITEM_TOPICS_SQL} from menu_items mi
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
					topics: r.topics,
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
			this.topicService.index(),
			this.venueTopicService.tags([venue]),
			this.em.getConnection().execute<
				{ venue_id: string; name: string; category: string | null; price: number; topics: string[] }[]
			>(
				`select l.venue_id, mi.name, mi.category, mi.price, ${ITEM_TOPICS_SQL} from menu_items mi
					join venue_delivery_listings l on l.id = mi.listing_id
					where l.venue_id in (${ids.map(() => '?').join(', ')})
					and mi.month = (select max(x.month) from menu_items x where x.listing_id = mi.listing_id and x.month <= ?)`,
				[...ids, month],
			),
		]);
		const items = _.groupBy(
			rows.map(r => ({ venueId: r.venue_id, name: r.name, category: r.category, price: Number(r.price), topics: r.topics })),
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
