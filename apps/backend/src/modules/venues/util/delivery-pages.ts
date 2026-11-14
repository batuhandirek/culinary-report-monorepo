// Pure: a restaurant's page on a delivery platform, from its URL to what a read of it says.
// The three actors' items are mapped to one shape here, so the save knows no platform.

import type { LieferandoItem } from 'src/modules/apify/actors/lieferando.actor.js';
import type { UberEatsItem } from 'src/modules/apify/actors/uber-eats.actor.js';
import type { WoltItem } from 'src/modules/apify/actors/wolt-menu.actor.js';

import { DELIVERY_MATCH_RADIUS_M } from '../constants/delivery.constant.js';
import type { MenuItem } from '../entities/menu-item.entity.js';
import { DeliveryPlatformEnum } from '../entities/venue-delivery-listing.entity.js';

import { termKey } from './dishes.js';
import { distanceM } from './osm-places.js';
import { isSameVenue, streetKey } from './venue-names.js';

/** A restaurant's page on a platform, by its address */
export interface DeliveryPageRef {
	platform: DeliveryPlatformEnum;
	/** The platform and its own handle for the restaurant: one page whatever the URL's language or tracking */
	key: string;
	/** The page's address in one spelling */
	url: string;
}

const pathOf = (url: string): { host: string; path: string } | null => {
	try {
		const parsed = new URL(url);
		return { host: parsed.hostname.toLowerCase(), path: parsed.pathname };
	} catch {
		return null;
	}
};

/**
 * The restaurant page a URL is, on a platform we read: Wolt's `/restaurant/<slug>`, Lieferando's
 * `/speisekarte/<slug>` (`/menu/<slug>` in English) and Uber Eats' `/store/<slug>/<id>`. Null for
 * anything else those sites serve: a brand, category, district or dish page, the press site.
 */
export const deliveryPageOf = (url: string | null | undefined): DeliveryPageRef | null => {
	const at = url ? pathOf(url) : null;
	if (!at) return null;
	if (/^(www\.)?wolt\.com$/.test(at.host)) {
		const m = /^\/[a-z]{2}\/([a-z]{3})\/([^/]+)\/restaurant\/([^/]+)\/?$/.exec(at.path);
		if (!m) return null;
		return {
			platform: DeliveryPlatformEnum.WOLT,
			key: `wolt:${m[3].toLowerCase()}`,
			url: `https://wolt.com/en/${m[1]}/${m[2]}/restaurant/${m[3]}`,
		};
	}
	const lieferando = /^(?:www\.)?lieferando\.(de|at)$/.exec(at.host);
	if (lieferando) {
		const m = /^\/(?:[a-z]{2}\/)?(?:speisekarte|menu)\/([^/]+)\/?$/.exec(at.path);
		if (!m) return null;
		return {
			platform: DeliveryPlatformEnum.LIEFERANDO,
			key: `lieferando:${m[1].toLowerCase()}`,
			url: `https://www.lieferando.${lieferando[1]}/speisekarte/${m[1]}`,
		};
	}
	if (/^(www\.)?ubereats\.com$/.test(at.host)) {
		const m = /^\/(?:([a-z]{2})(?:-[a-z]{2})?\/)?store\/([^/]+)\/([^/]+)\/?$/.exec(at.path);
		if (!m) return null;
		return {
			platform: DeliveryPlatformEnum.UBER_EATS,
			key: `uber_eats:${m[3]}`,
			url: `https://www.ubereats.com/${m[1] ? `${m[1]}/` : ''}store/${m[2]}/${m[3]}`,
		};
	}
	return null;
};

/** The delivery platform an ordering link points to; null for one we don't read. */
export const deliveryPlatformOf = (url: string | null | undefined): DeliveryPlatformEnum | null =>
	deliveryPageOf(url)?.platform ?? null;

/**
 * The key a menu item is kept under (`MenuItem.key`): its name as a wording is keyed (`termKey`:
 * accents, punctuation, emoji and plurals folded), so the menu's "Bussin' Bulgogi 🌶️" and a
 * review's "bussin bulgogi" are one key.
 */
export const menuKey = (name: string): string => termKey(name);

/** A menu item as a read of a page gives it */
export interface DeliveryMenuItem {
	key: string;
	name: string;
	description?: string;
	category?: string;
	/** In the page's currency */
	price: number;
	externalId?: string;
	likedShare?: number;
	ratingsCount?: number;
}

/** What a read of a restaurant's page says, whatever the platform. An absent field is unknown. */
export interface DeliveryPage extends DeliveryPageRef {
	externalId?: string;
	name: string;
	street?: string;
	postalCode?: string;
	lat?: number;
	lng?: number;
	cuisines: string[];
	/** 0–5 */
	rating?: number;
	reviewsCount?: number;
	deliveryFee?: number;
	minOrder?: number;
	etaMin?: number;
	etaMax?: number;
	currency: string;
	items: DeliveryMenuItem[];
}

const text = (value: string | null | undefined): string | undefined => value?.trim() || undefined;
const num = (value: number | null | undefined): number | undefined =>
	typeof value === 'number' && Number.isFinite(value) ? value : undefined;
const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * A page's items as one menu: an item without a name or a price is no item, and one listed in
 * several sections (the platforms' "featured" section repeats the others) is kept once, as its
 * last listing has it, in the order first listed.
 */
export const menuOf = (
	items: (Omit<DeliveryMenuItem, 'key'> | null | undefined)[],
): DeliveryMenuItem[] => {
	const byKey = new Map<string, DeliveryMenuItem>();
	for (const item of items) {
		if (!item?.name?.trim() || !(item.price > 0)) continue;
		const key = menuKey(item.name);
		if (!key) continue;
		byKey.set(key, { ...item, name: item.name.trim(), key, price: round2(item.price) });
	}
	return [...byKey.values()];
};

/** Wolt's item for a restaurant read by its page; null for a page that gave none */
export const woltPage = (item: WoltItem | null | undefined, url: string): DeliveryPage | null => {
	const ref = deliveryPageOf(item?.url ?? url) ?? deliveryPageOf(url);
	if (!item?.name || !ref) return null;
	return {
		...ref,
		...(item.id && { externalId: item.id }),
		name: item.name.trim(),
		...(text(item.address) && { street: text(item.address) }),
		...(text(item.postCode) && { postalCode: text(item.postCode) }),
		cuisines: (item.tags ?? []).filter(Boolean),
		// The 0–10 score halved is finer than the 0–5 band
		...((num(item.ratingScore) !== undefined || num(item.rating) !== undefined) && {
			rating: item.ratingScore != null ? item.ratingScore / 2 : item.rating!,
		}),
		...(num(item.reviewCount) !== undefined && { reviewsCount: item.reviewCount! }),
		...(num(item.deliveryBasePriceInCents) !== undefined && {
			deliveryFee: item.deliveryBasePriceInCents! / 100,
		}),
		...(num(item.estimateMinutes) !== undefined && {
			etaMin: item.estimateMinutes!,
			etaMax: item.estimateMinutes!,
		}),
		currency: item.currency ?? 'EUR',
		items: menuOf(
			(item.menuItems ?? []).map(i => ({
				name: i.name,
				...(text(i.description) && { description: text(i.description) }),
				...(text(i.category) && { category: text(i.category) }),
				price: i.priceInCents / 100,
				...(i.id && { externalId: i.id }),
			})),
		),
	};
};

/** "91%" → 0.91 */
const share = (value: string | null | undefined): number | undefined => {
	const m = /^(\d+(?:[.,]\d+)?)\s*%$/.exec(value?.trim() ?? '');
	return m ? Number(m[1].replace(',', '.')) / 100 : undefined;
};

/** Uber Eats' item for a store; null for one without a name or a page */
export const uberEatsPage = (item: UberEatsItem | null | undefined): DeliveryPage | null => {
	const ref = deliveryPageOf(item?.url);
	if (!item?.title?.trim() || !ref) return null;
	const count = /\d[\d.,]*/.exec(item.rating?.ratingCount ?? '')?.[0].replace(/[.,]/g, '');
	// Read by its URL the store is asked from no delivery address: its delivery time means nothing
	const placed = item.storeAvailablityStatus !== 'TOO_FAR_TO_DELIVER';
	return {
		...ref,
		...(item.uuid && { externalId: item.uuid }),
		name: item.title.trim(),
		...(text(item.location?.streetAddress) && { street: text(item.location?.streetAddress) }),
		...(text(item.location?.postalCode) && { postalCode: text(item.location?.postalCode) }),
		...(num(item.location?.latitude) !== undefined &&
			num(item.location?.longitude) !== undefined && {
				lat: item.location!.latitude!,
				lng: item.location!.longitude!,
			}),
		cuisines: (item.cuisineList ?? []).filter(Boolean),
		...(num(item.rating?.ratingValue) !== undefined && { rating: item.rating!.ratingValue! }),
		...(count && { reviewsCount: Number(count) }),
		...(placed &&
			num(item.etaMinutes?.min) !== undefined && {
				etaMin: item.etaMinutes!.min!,
				etaMax: num(item.etaMinutes?.max) ?? item.etaMinutes!.min!,
			}),
		currency: item.currencyCode ?? 'EUR',
		items: menuOf(
			(item.menu ?? []).flatMap(section =>
				(section.catalogItems ?? []).map(i => ({
					name: i.title ?? '',
					...(text(i.itemDescription) && { description: text(i.itemDescription) }),
					...(text(section.catalogName) && { category: text(section.catalogName) }),
					price: (i.price ?? 0) / 100,
					...(i.uuid && { externalId: i.uuid }),
					...(share(i.rating) !== undefined && { likedShare: share(i.rating) }),
					...(num(i.numRatings) !== undefined && { ratingsCount: i.numRatings! }),
				})),
			),
		),
	};
};

/** Lieferando's item for a restaurant page; null for one without a name or a page */
export const lieferandoPage = (item: LieferandoItem | null | undefined): DeliveryPage | null => {
	const ref = deliveryPageOf(
		item?.url ?? (item?.seoName ? `https://www.lieferando.de/speisekarte/${item.seoName}` : null),
	);
	if (!item?.name?.trim() || !ref) return null;
	return {
		...ref,
		...(item.restaurantId && { externalId: item.restaurantId }),
		name: item.name.trim(),
		...(text(item.address) && { street: text(item.address) }),
		...(text(item.postcode) && { postalCode: text(item.postcode) }),
		...(num(item.latitude) !== undefined &&
			num(item.longitude) !== undefined && { lat: item.latitude!, lng: item.longitude! }),
		cuisines: (item.cuisines ?? []).filter(Boolean),
		// A restaurant nobody rated yet shows 0 stars from 0 ratings: unknown, not zero
		...(num(item.rating) !== undefined && (item.ratingCount ?? 0) > 0 && { rating: item.rating! }),
		...(num(item.ratingCount) !== undefined && { reviewsCount: item.ratingCount! }),
		...(num(item.deliveryFee) !== undefined && { deliveryFee: item.deliveryFee! }),
		...(num(item.minimumOrder) !== undefined && { minOrder: item.minimumOrder! }),
		...(num(item.deliveryTimeMin) !== undefined && {
			etaMin: item.deliveryTimeMin!,
			etaMax: num(item.deliveryTimeMax) ?? item.deliveryTimeMin!,
		}),
		currency: item.currency ?? 'EUR',
		items: menuOf(
			(item.menuItems ?? []).map(i => ({
				name: i.name,
				...(text(i.description) && { description: text(i.description) }),
				...(text(i.category) && { category: text(i.category) }),
				price: i.price ?? 0,
				...(i.itemId && { externalId: i.itemId }),
			})),
		),
	};
};

/** A venue as a page is matched to it */
export interface DeliveryVenue {
	id: string;
	name: string;
	brandName?: string | null;
	street?: string | null;
	postalCode?: string | null;
	lat?: number | null;
	lng?: number | null;
}

/**
 * The venue a page is, among a brand's (`venues`): the page is named like the venue or its brand
 * (`isSameVenue`) and stands where the venue does: within `DELIVERY_MATCH_RADIUS_M` when both have
 * coordinates (the nearest wins), else on the same street in the same postcode. A page that says
 * nothing of where it is can only be a one-branch brand's. A name alone never matches a chain's
 * page to a branch: a search returns the branches of other districts and cities too.
 */
export const matchDeliveryVenue = <V extends DeliveryVenue>(
	page: Pick<DeliveryPage, 'name' | 'street' | 'postalCode' | 'lat' | 'lng'>,
	venues: V[],
): V | undefined => {
	const named = venues.filter(
		v => isSameVenue(page.name, v.name) || (!!v.brandName && isSameVenue(page.name, v.brandName)),
	);
	if (!named.length) return undefined;
	const placed = page.lat != null && page.lng != null;
	const street = page.street ? streetKey(page.street) : '';
	if (!placed && !street && !page.postalCode) return named.length === 1 ? named[0] : undefined;
	const near = named
		.map(venue => {
			if (placed && venue.lat != null && venue.lng != null) {
				const metres = distanceM(
					{ lat: page.lat!, lng: page.lng! },
					{ lat: venue.lat, lng: venue.lng },
				);
				return metres <= DELIVERY_MATCH_RADIUS_M ? { venue, metres } : null;
			}
			const sameStreet = !!street && !!venue.street && streetKey(venue.street) === street;
			const samePostcode =
				!page.postalCode || !venue.postalCode || page.postalCode === venue.postalCode;
			return sameStreet && samePostcode ? { venue, metres: 0 } : null;
		})
		.filter((hit): hit is { venue: V; metres: number } => hit !== null)
		.sort((a, b) => a.metres - b.metres);
	return near[0]?.venue;
};

/** A stored item as a menu read changes it */
export type StoredMenuItem = Pick<
	MenuItem,
	| 'key'
	| 'name'
	| 'description'
	| 'category'
	| 'price'
	| 'externalId'
	| 'likedShare'
	| 'ratingsCount'
	| 'firstSeenAt'
	| 'lastSeenAt'
	| 'removedAt'
>;

export interface MenuChange<T> {
	/** Items the read lists that the menu didn't have */
	added: StoredMenuItem[];
	/** Stored items the read lists again, with what it says now (one back on the menu loses `removedAt`) */
	seen: { item: T; fields: StoredMenuItem }[];
	/** Stored items on the menu the read no longer lists */
	removed: T[];
}

/**
 * What a read of a listing's menu changes: the items it lists are added or updated (name, section,
 * price, rating, `lastSeenAt`, back on the menu), the stored ones it doesn't list are removed as of
 * `now`. Every listed item also gets the month's snapshot, which the caller writes. A read with no
 * item changes nothing: an empty menu is a failed read, never a restaurant that stopped selling
 * everything.
 */
export const menuChange = <T extends Pick<MenuItem, 'key' | 'firstSeenAt' | 'removedAt'>>(
	stored: T[],
	read: DeliveryMenuItem[],
	now: Date,
): MenuChange<T> => {
	const change: MenuChange<T> = { added: [], seen: [], removed: [] };
	if (!read.length) return change;
	const byKey = new Map(stored.map(item => [item.key, item]));
	const listed = new Set<string>();
	for (const item of read) {
		listed.add(item.key);
		const had = byKey.get(item.key);
		const fields: StoredMenuItem = {
			key: item.key,
			name: item.name,
			description: item.description ?? null,
			category: item.category ?? null,
			price: item.price,
			externalId: item.externalId ?? null,
			likedShare: item.likedShare ?? null,
			ratingsCount: item.ratingsCount ?? null,
			firstSeenAt: had?.firstSeenAt ?? now,
			lastSeenAt: now,
			removedAt: null,
		};
		if (had) change.seen.push({ item: had, fields });
		else change.added.push(fields);
	}
	change.removed = stored.filter(item => !listed.has(item.key) && !item.removedAt);
	return change;
};
