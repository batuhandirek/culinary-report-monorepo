import { defineActor } from './actor.js';

/**
 * `studio-amba/takeaway-scraper`: a city's restaurant listing on Takeaway.com's sites (Lieferando
 * in Germany), one row a restaurant.
 *
 * - **Price.** ~$0.002 a restaurant row, about $3 for a city's listing. The actor refuses a cap
 *   under $5 (checked 2026-10-19).
 * - **No restaurant URL.** It only searches a location: a venue is found by matching the
 *   listing's names and postcodes.
 * - **Menus.** Only for a whole search: `scrapeMenus: false`.
 */
export interface TakeawayInput {
	/** Lowercase ISO 3166-1 alpha-2, "de" */
	country: string;
	/** The city searched */
	location: string;
	serviceType?: 'delivery' | 'pickup';
	maxResults?: number;
	scrapeMenus?: boolean;
}

/** A restaurant row of the listing, menus off */
export interface LieferandoItem {
	restaurantId?: string;
	name?: string;
	rating?: number | null;
	ratingCount?: number | null;
	deliveryFee?: number | null;
	minimumOrderValue?: number | null;
	currency?: string;
	postcode?: string | null;
	url?: string | null;
}

export const TAKEAWAY_ACTOR = defineActor<TakeawayInput, LieferandoItem>(
	'studio-amba/takeaway-scraper',
);
