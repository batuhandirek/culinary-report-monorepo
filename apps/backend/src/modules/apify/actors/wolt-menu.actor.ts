import { defineActor } from './actor.js';

/**
 * `needy_hammock/wolt-restaurant-menu-scraper`: one Wolt restaurant and its menu (direct URL mode).
 *
 * - **Price.** ~$0.0015 for the restaurant's detail result, plus the run's start: a run of
 *   $0.05 covers it.
 * - **One restaurant a run.** Each page is its own run.
 * - **A page that is gone** was not tried: the save takes no item, or one without a name, as gone.
 * - **Its other mode** lists a city's restaurants by category, 50 at most on Free: no name search.
 * - **Ratings.** `rating` is the 0–5 band, `ratingScore` the 0–10 score.
 * - **Prices.** In cents.
 */
export interface WoltMenuInput {
	/** The restaurant's Wolt page, `https://wolt.com/<lang>/<country>/<city>/restaurant/<slug>` */
	restaurantUrl: string;
}

/** The actor's item (its output schema), as far as we read it */
export interface WoltItem {
	id?: string;
	name?: string;
	url?: string;
	address?: string | null;
	postCode?: string | null;
	tags?: string[];
	/** Delivery time in minutes, when Wolt estimated one */
	estimateMinutes?: number | null;
	/** 0–5 band; `ratingScore` is the 0–10 score */
	rating?: number | null;
	ratingScore?: number | null;
	reviewCount?: number | null;
	currency?: string;
	deliveryBasePriceInCents?: number | null;
	menuItems?: {
		id?: string;
		name: string;
		description?: string | null;
		priceInCents: number;
		category?: string | null;
	}[];
}

export const WOLT_MENU_ACTOR = defineActor<WoltMenuInput, WoltItem>(
	'needy_hammock/wolt-restaurant-menu-scraper',
);

/** What one restaurant's run may spend: its detail result and the start */
export const WOLT_RUN_USD = 0.05;
