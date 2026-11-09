import { defineActor } from './actor.js';

/**
 * `needy_hammock/wolt-restaurant-menu-scraper`: one Wolt restaurant and its menu (direct URL mode).
 *
 * - **Price.** ~$0.0015 for the restaurant's detail result, plus the run's start: a run of
 *   $0.05 covers it.
 * - **One restaurant a run.** Each venue is its own run.
 * - **Ratings.** `rating` is the 0–5 band, `ratingScore` the 0–10 score.
 * - **Prices.** In cents.
 */
export interface WoltMenuInput {
	/** The restaurant's Wolt page (the link Google lists under "Order online") */
	restaurantUrl: string;
}

/** The actor's item (its output schema), as far as we read it */
export interface WoltItem {
	id?: string;
	name?: string;
	url?: string;
	postCode?: string | null;
	/** 0–5 band; `ratingScore` is the 0–10 score */
	rating?: number | null;
	ratingScore?: number | null;
	reviewCount?: number | null;
	currency?: string;
	deliveryBasePriceInCents?: number | null;
	menuItems?: {
		id?: string;
		name: string;
		priceInCents: number;
		category?: string | null;
	}[];
}

export const WOLT_MENU_ACTOR = defineActor<WoltMenuInput, WoltItem>(
	'needy_hammock/wolt-restaurant-menu-scraper',
);
