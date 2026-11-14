import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable, Logger } from '@nestjs/common';

import _ from 'lodash';

import { matchMenuItem, type MenuTermMethod } from '../util/menu-terms.js';

const CHUNK = 200;

interface MenuRow {
	id: number;
	key: string;
	listing_id: string;
	brand_id: string;
}

interface LinkRow {
	menu_item_id: number;
	term_id: number;
	method: MenuTermMethod;
}

/**
 * The one writer of `MenuItemTerm`: which wordings mean which menu items. For each brand with a
 * stored menu, every food wording its claims name (its venues' reviews, the posts matched to it)
 * is matched against each of its venues' menus, one listing at a time (`matchMenuItem`: the same
 * name, a wording holding the item's name, a close spelling), and the links are rewritten to what
 * the match says now. Pure matching over stored rows, no LLM: run after a menu is saved
 * (`relinkVenues`) and with a city's topic refresh, which follows every reading and matching
 * (`relinkCity`), so a new review's wording finds its item.
 *
 * Read through raw SQL on the menus, reviews and statements: venues and statements import topics.
 */
@Injectable()
export class MenuTermService {
	private readonly logger = new Logger(MenuTermService.name);

	constructor(private readonly em: EntityManager) {}

	/** The menus of a city's venues against their brands' wordings */
	async relinkCity(cityId: string): Promise<{ items: number; links: number; changed: number }> {
		const rows: { id: string }[] = await this.em.getConnection().execute(
			`select distinct l.venue_id as id from venue_delivery_listings l
				join venues v on v.id = l.venue_id
				where v.city_id = ? and l.deleted_at is null and exists (select 1 from menu_items mi where mi.listing_id = l.id)`,
			[cityId],
		);
		return this.relinkVenues(rows.map(r => r.id));
	}

	/**
	 * These venues' menu items against the wordings their brands' claims name: the links written to
	 * what matches now, a link that no longer holds deleted, one whose method changed updated.
	 */
	async relinkVenues(venueIds: string[]): Promise<{ items: number; links: number; changed: number }> {
		const total = { items: 0, links: 0, changed: 0 };
		const conn = this.em.getConnection();
		for (const ids of _.chunk(_.uniq(venueIds), CHUNK)) {
			const marks = ids.map(() => '?').join(', ');
			const items: MenuRow[] = await conn.execute(
				`select mi.id, mi.key, mi.listing_id, v.brand_id from menu_items mi
					join venue_delivery_listings l on l.id = mi.listing_id
					join venues v on v.id = l.venue_id
					where l.venue_id in (${marks})`,
				ids,
			);
			if (!items.length) continue;
			const brandIds = _.uniq(items.map(i => i.brand_id));
			const brandMarks = brandIds.map(() => '?').join(', ');
			const [terms, stored] = await Promise.all([
				conn.execute<{ brand_id: string; id: number; key: string }[]>(
					`select distinct x.brand_id, t.id, t.key from (
						select v.brand_id, p.term_id from venues v
							join reviews r on r.venue_id = v.id
							join statements s on s.review_id = r.id
							join statement_parts p on p.statement_id = s.id and p.role = 'food'
							where v.brand_id in (${brandMarks})
						union
						select m.brand_id, p.term_id from mentions m
							join statements s on s.mention_id = m.id
							join statement_parts p on p.statement_id = s.id and p.role = 'food'
							where m.brand_id in (${brandMarks})
					) x join terms t on t.id = x.term_id`,
					[...brandIds, ...brandIds],
				),
				conn.execute<LinkRow[]>(
					`select menu_item_id, term_id, method from menu_item_terms where menu_item_id in (${items.map(() => '?').join(', ')})`,
					items.map(i => i.id),
				),
			]);
			const termsOf = _.groupBy(terms, t => t.brand_id);
			const wanted = new Map<string, LinkRow>();
			for (const menu of Object.values(_.groupBy(items, i => i.listing_id)))
				for (const term of termsOf[menu[0].brand_id] ?? []) {
					const hit = matchMenuItem(term.key, menu);
					if (hit)
						wanted.set(`${hit.item.id}:${term.id}`, {
							menu_item_id: hit.item.id,
							term_id: term.id,
							method: hit.method,
						});
				}
			const had = new Map(stored.map(l => [`${l.menu_item_id}:${l.term_id}`, l]));
			const gone = stored.filter(l => wanted.get(`${l.menu_item_id}:${l.term_id}`)?.method !== l.method);
			const fresh = [...wanted.values()].filter(l => had.get(`${l.menu_item_id}:${l.term_id}`)?.method !== l.method);
			for (const chunk of _.chunk(gone, 500))
				await conn.execute(
					`delete from menu_item_terms where (menu_item_id, term_id) in (${chunk.map(() => '(?, ?)').join(', ')})`,
					chunk.flatMap(l => [l.menu_item_id, l.term_id]),
				);
			for (const chunk of _.chunk(fresh, 500))
				await conn.execute(
					`insert into menu_item_terms (menu_item_id, term_id, method) values ${chunk.map(() => '(?, ?, ?)').join(', ')}
					on conflict (menu_item_id, term_id) do update set method = excluded.method`,
					chunk.flatMap(l => [l.menu_item_id, l.term_id, l.method]),
				);
			total.items += items.length;
			total.links += wanted.size;
			total.changed += gone.length + fresh.length;
		}
		if (total.changed)
			this.logger.log(`Menu wordings: ${total.links} links on ${total.items} items, ${total.changed} changed`);
		return total;
	}
}
