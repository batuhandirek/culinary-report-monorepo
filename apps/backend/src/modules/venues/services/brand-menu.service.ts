import { QueryOrder } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import _ from 'lodash';

import { ownPostSql } from 'src/modules/social/util/accounts.js';
import { judgingSql } from 'src/modules/statements/util/statement-sql.js';
import { matchMenuItem, type MenuTermMethod } from 'src/modules/topics/util/menu-terms.js';

import type {
	AdminBrandMenuItemOutputDto,
	AdminBrandMenuListingOutputDto,
	AdminBrandMenuOutputDto,
} from '../dto/admin-brand-menu.dto.js';
import { MenuItem } from '../entities/menu-item.entity.js';
import { MenuItemSnapshot } from '../entities/menu-item-snapshot.entity.js';
import { Venue } from '../entities/venue.entity.js';
import { VenueDeliveryListing } from '../entities/venue-delivery-listing.entity.js';
import { VenueDeliverySnapshot } from '../entities/venue-delivery-snapshot.entity.js';

interface NamingRow {
	menu_item_id: number;
	term_key: string;
	term_name: string;
	method: MenuTermMethod;
	source: string;
	source_kind: string;
	sentiment: string | null;
	judging: boolean;
}

/**
 * A venue's menu items across its listings as one row a thing: the same key, and an item one
 * platform spells a little differently ("Plantain Wahala", "Platain Wahala") joined to the row of
 * the other platforms' when it is that item's name or a close spelling of it (`matchMenuItem`,
 * never a name merely holding another: "Fries" is not "Skinny Fries"). Two items of one listing
 * are never one row.
 */
export const sameItems = <T extends { key: string; listing: { id: string } }>(items: T[]): T[][] => {
	const groups = Object.values(_.groupBy(items, i => i.key));
	const listingsOf = (group: T[]) => new Set(group.map(i => i.listing.id));
	// The rows more platforms agree on stand; the odd spellings look for theirs
	const order = _.sortBy(groups, group => -group.length);
	const kept: T[][] = [];
	for (const group of order) {
		const own = listingsOf(group);
		const others = kept
			.map((other, id) => ({ id, key: other[0].key, other }))
			.filter(({ other }) => ![...listingsOf(other)].some(id => own.has(id)));
		const hit = matchMenuItem(group[0].key, others);
		const target = hit && hit.method !== 'contains' ? kept[hit.item.id] : undefined;
		if (target) target.push(...group);
		else kept.push([...group]);
	}
	return kept;
};

const present = <T extends object>(fields: T) =>
	_.omitBy(fields, value => value === null || value === undefined) as {
		[K in keyof T]?: NonNullable<T[K]>;
	};

/**
 * A brand's menus as its page shows them (read only; `VenueDeliveryService` writes them): each
 * open branch in the city with its pages on the delivery platforms and its menu, one row per item
 * across the platforms listing it (the same `MenuItem.key`), with its food topics and the reviews
 * and posts by others about the brand that name it. Those are joined at read time through the
 * item's wordings (`MenuItemTerm`): a claim of the brand's whose food wording means the item,
 * counted as sources, once each, the brand's own posts out.
 */
@Injectable()
export class BrandMenuService {
	constructor(private readonly em: EntityManager) {}

	async menu(brandId: string, cityId: string): Promise<AdminBrandMenuOutputDto> {
		const venues = await this.em.find(
			Venue,
			{ brand: brandId, city: cityId, closed: false },
			{ orderBy: { reviewsCount: QueryOrder.DESC_NULLS_LAST, id: QueryOrder.ASC } },
		);
		if (!venues.length) return { branches: [] };
		const listings = await this.em.find(
			VenueDeliveryListing,
			{ venue: { $in: venues.map(v => v.id) } },
			{ orderBy: { platform: QueryOrder.ASC } },
		);
		const listingIds = listings.map(l => l.id);
		const [items, snapshots] =
			listingIds.length ?
				await Promise.all([
					this.em.find(MenuItem, { listing: { $in: listingIds } }, { orderBy: { id: QueryOrder.ASC } }),
					this.em.find(
						VenueDeliverySnapshot,
						{ listing: { $in: listingIds } },
						{ orderBy: { month: QueryOrder.ASC } },
					),
				])
			:	[[], []];
		const itemIds = items.map(i => i.id);
		const [topics, namings, months] = await Promise.all([
			this.topicsOf(itemIds),
			this.namings(brandId, itemIds),
			this.monthsOf(itemIds),
		]);
		const itemsOf = _.groupBy(items, i => i.listing.id);
		const snapshotsOf = _.groupBy(snapshots, s => s.listing.id);
		const namingsOf = _.groupBy(namings, n => n.menu_item_id);
		const iso = (date: Date | null | undefined) => date?.toISOString();

		return {
			branches: venues.map(venue => {
				const own = listings.filter(l => l.venue.id === venue.id);
				const platformOf = new Map(own.map(l => [l.id, l.platform]));
				const menu = own.flatMap(l => itemsOf[l.id] ?? []);
				const rows = sameItems(menu).map((group): AdminBrandMenuItemOutputDto => {
					// What the item is called and filed under, as a listing that still has it says
					const shown = group.find(i => !i.removedAt) ?? group[0];
					const named = group.flatMap(i => namingsOf[i.id] ?? []);
					const sources = _.uniqBy(named, n => n.source);
					const side = (sentiment: string) =>
						_.uniq(
							named
								.filter(n => n.judging && (n.sentiment === sentiment || n.sentiment === 'mixed'))
								.map(n => n.source),
						).length;
					return {
						key: shown.key,
						name: shown.name,
						...present({
							category: group.find(i => i.category)?.category,
							description: group.find(i => i.description)?.description,
						}),
						removed: group.every(i => !!i.removedAt),
						topics: _.uniqBy(
							group.flatMap(i => topics.get(i.id) ?? []),
							t => t.key,
						),
						offers: group.map(i => ({
							platform: platformOf.get(i.listing.id)!,
							price: i.price,
							...present({
								likedShare: i.likedShare,
								ratingsCount: i.ratingsCount,
								removedAt: iso(i.removedAt),
							}),
							firstSeenAt: i.firstSeenAt.toISOString(),
							lastSeenAt: i.lastSeenAt.toISOString(),
							prices: (months.get(i.id) ?? []).map(row => ({
								month: row.month,
								price: row.price,
								...present({ likedShare: row.likedShare, ratingsCount: row.ratingsCount }),
							})),
						})),
						sources: sources.length,
						reviews: sources.filter(n => n.source_kind === 'review').length,
						posts: sources.filter(n => n.source_kind === 'post').length,
						praise: side('positive'),
						complaints: side('negative'),
						wordings: _.sortBy(
							Object.values(_.groupBy(named, n => n.term_key)).map(uses => ({
								key: uses[0].term_key,
								name: uses[0].term_name,
								method: uses[0].method,
								sources: _.uniq(uses.map(n => n.source)).length,
							})),
							w => -w.sources,
						),
					};
				});
				return {
					venueId: venue.id,
					name: venue.name,
					...present({ street: venue.street, searchedAt: iso(venue.deliverySearchedAt) }),
					listings: own.map((l): AdminBrandMenuListingOutputDto => {
						const menuItems = itemsOf[l.id] ?? [];
						return {
							id: l.id,
							platform: l.platform,
							url: l.url,
							...present({
								name: l.name,
								address: l.address,
								cuisines: l.cuisines,
								rating: l.rating,
								reviewsCount: l.reviewsCount,
								deliveryFee: l.deliveryFee,
								minOrder: l.minOrder,
								etaMin: l.etaMin,
								etaMax: l.etaMax,
								currency: l.currency,
								menuFetchedAt: iso(l.menuFetchedAt),
								removedAt: iso(l.removedAt),
							}),
							fetchedAt: l.fetchedAt.toISOString(),
							items: menuItems.filter(i => !i.removedAt).length,
							removedItems: menuItems.filter(i => i.removedAt).length,
							snapshots: (snapshotsOf[l.id] ?? []).map(s => ({
								month: s.month,
								...present({
									rating: s.rating,
									reviewsCount: s.reviewsCount,
									deliveryFee: s.deliveryFee,
									minOrder: s.minOrder,
									etaMin: s.etaMin,
									etaMax: s.etaMax,
									menuItems: s.menuItems,
								}),
							})),
						};
					}),
					// On the menu first, the most named first, then as the menu lists them
					items: _.orderBy(rows, [r => r.removed, r => -r.sources], ['asc', 'asc']),
				};
			}),
		};
	}

	/** Each item's monthly rows, oldest first */
	private async monthsOf(itemIds: number[]): Promise<Map<number, MenuItemSnapshot[]>> {
		const out = new Map<number, MenuItemSnapshot[]>();
		for (const ids of _.chunk(itemIds, 2000))
			for (const row of await this.em.find(
				MenuItemSnapshot,
				{ menuItem: { $in: ids } },
				{ orderBy: { month: QueryOrder.ASC } },
			))
				out.set(row.menuItem.id, [...(out.get(row.menuItem.id) ?? []), row]);
		return out;
	}

	/** Each item's stored food topics */
	private async topicsOf(itemIds: number[]): Promise<Map<number, { key: string; label: string; kind: string }[]>> {
		const out = new Map<number, { key: string; label: string; kind: string }[]>();
		for (const ids of _.chunk(itemIds, 2000)) {
			const rows: { menu_item_id: number; key: string; label: string; kind: string }[] = await this.em
				.getConnection()
				.execute(
					`select it.menu_item_id, t.key, t.label, t.kind from menu_item_topics it
						join topics t on t.id = it.topic_id
						where it.menu_item_id in (${ids.map(() => '?').join(', ')}) order by it.id`,
					ids,
				);
			for (const row of rows)
				out.set(row.menu_item_id, [
					...(out.get(row.menu_item_id) ?? []),
					{ key: row.key, label: row.label, kind: row.kind },
				]);
		}
		return out;
	}

	/**
	 * The brand's claims naming these items: a claim in a review of one of its venues, or about a
	 * place a post matched to it (never the brand's own post), whose food wording is linked to the item
	 */
	private async namings(brandId: string, itemIds: number[]): Promise<NamingRow[]> {
		const out: NamingRow[] = [];
		for (const ids of _.chunk(itemIds, 2000)) {
			const marks = ids.map(() => '?').join(', ');
			const select = `mit.menu_item_id, t.key as term_key, t.name as term_name, mit.method, s.source_kind, s.sentiment,
				(s.text is not null and ${judgingSql('s')}) as judging`;
			const rows: NamingRow[] = await this.em.getConnection().execute(
				`select ${select}, s.review_id::text as source from menu_item_terms mit
					join terms t on t.id = mit.term_id
					join statement_parts p on p.term_id = mit.term_id and p.role = 'food'
					join statements s on s.id = p.statement_id
					join reviews r on r.id = s.review_id
					join venues rv on rv.id = r.venue_id
					where mit.menu_item_id in (${marks}) and rv.brand_id = ?
				union all
				select ${select}, s.post_id::text as source from menu_item_terms mit
					join terms t on t.id = mit.term_id
					join statement_parts p on p.term_id = mit.term_id and p.role = 'food'
					join statements s on s.id = p.statement_id
					join mentions m on m.id = s.mention_id
					join social_posts sp on sp.id = s.post_id
					where mit.menu_item_id in (${marks}) and m.brand_id = ? and not ${ownPostSql('sp', 'm.brand_id')}`,
				[...ids, brandId, ...ids, brandId],
			);
			out.push(...rows);
		}
		return out;
	}
}
