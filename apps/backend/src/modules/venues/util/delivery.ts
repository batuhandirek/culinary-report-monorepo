import { DeliveryPlatformEnum } from '../entities/venue-delivery-listing.entity.js';

import { plain } from './venue-names.js';

/** The delivery platform an ordering link points to; null for one we don't read. */
export const deliveryPlatformOf = (url: string | null | undefined): DeliveryPlatformEnum | null => {
	if (!url) return null;
	let parsed: URL;
	try {
		parsed = new URL(url);
	} catch {
		return null;
	}
	const host = parsed.hostname.toLowerCase();
	if (/(^|\.)wolt\.com$/.test(host) && /\/restaurant\//.test(parsed.pathname)) return DeliveryPlatformEnum.WOLT;
	if (/(^|\.)lieferando\.(de|at)$/.test(host)) return DeliveryPlatformEnum.LIEFERANDO;
	return null;
};

// Menu sections and items that are not a dish: drinks, desserts, sides, extras, deposits
const NOT_A_MAIN =
	/\b(getranke|drinks?|beverages?|softdrinks?|bier|beer|wein|wine|cocktails?|kaffee|coffee|tee|tea|saft|juice|wasser|water|limonade|lemonade|ayran|cola|fanta|sprite|mate|schorle|desserts?|nachtisch|nachspeisen?|sussspeisen|eis|ice cream|beilagen?|sides?|extras?|zusatze|saucen|sauces?|dips?|dressings?|pfand|deposit|snacks?)\b/;

/** Whether a menu item is a dish worth comparing (not a drink, dessert, side or extra). */
export const isMainCourse = (item: { name: string; category?: string | null }): boolean =>
	!NOT_A_MAIN.test(plain(item.category ?? '')) && !NOT_A_MAIN.test(plain(item.name));

export const median = (values: number[]): number | null => {
	const sorted = values.filter(v => Number.isFinite(v) && v > 0).sort((a, b) => a - b);
	if (sorted.length === 0) return null;
	const mid = Math.floor(sorted.length / 2);
	return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Menu items that are this dish: the dish's words (`dishKey` form) appear in the item's name as
 * a run of whole words, so "döner" finds "Döner im Brot" and not "Dönerteller".
 */
export const itemsForDish = <T extends { name: string }>(items: T[], dish: string): T[] => {
	const key = plain(dish);
	if (!key) return [];
	return items.filter(item => ` ${plain(item.name)} `.includes(` ${key} `));
};

export interface MenuForPricing {
	venueId: string;
	name: string;
	items: { name: string; price: number; category?: string | null }[];
}

export interface DishPrice {
	dish: string;
	/** The venue's median for the dish */
	price: number;
	/** The median of the other menus' medians for it; absent when none has it */
	othersMedian?: number;
	othersWithDish: number;
}

export interface PricePosition {
	/** Median main course on the venue's menu */
	median: number;
	/** Median of the other menus' main-course medians */
	othersMedian: number | null;
	othersWithMenu: number;
	/** `median / othersMedian - 1`, e.g. 0.12 for 12 % above */
	diff: number | null;
	dishes: DishPrice[];
}

/**
 * Where a venue's prices sit among other menus (its competitors, or nearby venues): median main
 * course against the others' medians, and each named dish against the same dish elsewhere.
 * Null when the venue's menu has no main course.
 */
export const pricePosition = (
	venue: MenuForPricing,
	others: MenuForPricing[],
	dishes: string[],
): PricePosition | null => {
	const mains = venue.items.filter(isMainCourse);
	const own = median(mains.map(i => i.price));
	if (own === null) return null;
	const otherMedians = others
		.map(o => median(o.items.filter(isMainCourse).map(i => i.price)))
		.filter((m): m is number => m !== null);
	const othersMedian = median(otherMedians);

	const dishPrices: DishPrice[] = [];
	for (const dish of dishes) {
		const price = median(itemsForDish(venue.items, dish).map(i => i.price));
		if (price === null) continue;
		const elsewhere = others
			.map(o => median(itemsForDish(o.items, dish).map(i => i.price)))
			.filter((m): m is number => m !== null);
		const elsewhereMedian = median(elsewhere);
		dishPrices.push({
			dish,
			price: round2(price),
			...(elsewhereMedian !== null && { othersMedian: round2(elsewhereMedian) }),
			othersWithDish: elsewhere.length,
		});
	}
	return {
		median: round2(own),
		othersMedian: othersMedian === null ? null : round2(othersMedian),
		othersWithMenu: otherMedians.length,
		diff: othersMedian ? Math.round((own / othersMedian - 1) * 1000) / 1000 : null,
		dishes: dishPrices,
	};
};
