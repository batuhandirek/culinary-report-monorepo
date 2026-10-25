// Pure: what a city's delivery menus say per food topic — who sells it, at what price.

import { median } from 'src/modules/venues/util/delivery.js';

import type { FoodTopicIndex } from './food-topics.js';

/** A district's menu price for a topic is shown from this many venues selling it. */
export const MENU_DISTRICT_MIN_VENUES = 5;

/** One menu item as `menuTopicPrices` reads it, with its stored topics (`MenuItemFoodTopic`). */
export interface MenuPriceRow {
	venueId: string;
	district: string | null;
	topics: string[];
	price: number;
}

export interface MenuTopicPrice {
	key: string;
	/** Venues with it (or a child of it) on the menu */
	venues: number;
	/** Their items of it */
	items: number;
	/** Median and quartiles of the venues' own medians, so a long menu weighs as one venue */
	median: number;
	p25: number;
	p75: number;
	/** Districts with `MENU_DISTRICT_MIN_VENUES`+ venues selling it, most venues first */
	districts: { district: string; venues: number; median: number }[];
}

export interface MenuTopicPrices {
	/** Venues with any menu item stored */
	menus: number;
	/** By topic key; a topic no menu has is absent */
	topics: Map<string, MenuTopicPrice>;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** The `q` quantile (0–1) of sorted values, interpolated. */
const quantile = (sorted: number[], q: number): number => {
	const at = (sorted.length - 1) * q;
	const lo = Math.floor(at);
	const hi = Math.ceil(at);
	return sorted[lo] + (sorted[hi] - sorted[lo]) * (at - lo);
};

/**
 * Per topic, the venues whose menu has it and its price: each item's topics are its stored ones
 * (`resolveMenuItem` at the scrape, re-linked when topics change) with their parents (a ramen is
 * Japanese too); each venue's median price
 * for the topic is one value, and the city and its districts read the median of those. Only
 * `topicKeys` when given.
 */
export const menuTopicPrices = (
	rows: MenuPriceRow[],
	index: FoodTopicIndex,
	topicKeys?: string[],
): MenuTopicPrices => {
	const wanted = topicKeys && new Set(topicKeys);
	// topic → venue → prices
	const byTopic = new Map<string, Map<string, number[]>>();
	const districtOf = new Map<string, string | null>();
	for (const row of rows) {
		districtOf.set(row.venueId, row.district);
		if (!(row.price > 0)) continue;
		for (const key of index.withParents(row.topics)) {
			if (wanted && !wanted.has(key)) continue;
			const venues = byTopic.get(key) ?? new Map<string, number[]>();
			venues.set(row.venueId, [...(venues.get(row.venueId) ?? []), row.price]);
			byTopic.set(key, venues);
		}
	}
	const topics = new Map<string, MenuTopicPrice>();
	for (const [key, venues] of byTopic) {
		const medians = [...venues].map(([venueId, prices]) => ({
			venueId,
			median: median(prices)!,
		}));
		const sorted = medians.map(m => m.median).sort((a, b) => a - b);
		const byDistrict = new Map<string, number[]>();
		for (const m of medians) {
			const district = districtOf.get(m.venueId);
			if (district) byDistrict.set(district, [...(byDistrict.get(district) ?? []), m.median]);
		}
		topics.set(key, {
			key,
			venues: venues.size,
			items: [...venues.values()].reduce((n, prices) => n + prices.length, 0),
			median: round2(median(sorted)!),
			p25: round2(quantile(sorted, 0.25)),
			p75: round2(quantile(sorted, 0.75)),
			districts: [...byDistrict]
				.filter(([, values]) => values.length >= MENU_DISTRICT_MIN_VENUES)
				.map(([district, values]) => ({
					district,
					venues: values.length,
					median: round2(median(values)!),
				}))
				.sort((a, b) => b.venues - a.venues || a.district.localeCompare(b.district)),
		});
	}
	return { menus: districtOf.size, topics };
};

/** Which menu items are of `key` or a child of it (`pricePosition`'s topic), by their stored topics. */
export const menuItemsOf =
	(index: FoodTopicIndex, key: string) =>
	(item: { topics?: string[] }): boolean =>
		index.withParents(item.topics ?? []).includes(key);
