import { defineActor } from './actor.js';

/**
 * `lukass/just-eat-takeaway-scraper`: restaurants on Just Eat Takeaway.com's sites (Lieferando in
 * Germany and Austria), here read by their own pages (`startUrls`), one item a restaurant with its
 * details and menu.
 *
 * - **Price.** $0.005 a run's start, then $0.005 a restaurant ($0.001 the result, $0.004 its
 *   details and menu); checked 2026-11-14 on Free, one restaurant $0.01.
 * - **Proxy.** `proxy` is required; residential, included in the price (it ran on Free).
 * - **A page that is gone** was not tried: the save takes a page that returned no item as gone.
 * - **No name search.** Lieferando searches by delivery address only, so a restaurant's page is
 *   found elsewhere (a web search) and read here.
 */
export interface LieferandoInput {
	/** Lowercase ISO 3166-1 alpha-2, "de" */
	country: string;
	/** Restaurant pages, `https://www.lieferando.de/speisekarte/<slug>` */
	startUrls: { url: string }[];
	outputMode: 'restaurants';
	fetchMenu: boolean;
	includeMenuItems: boolean;
	includeModifiers: boolean;
	proxy: { useApifyProxy: boolean; apifyProxyGroups?: string[] };
}

/** The actor's item for a restaurant page, as far as we read it */
export interface LieferandoItem {
	restaurantId?: string;
	name?: string;
	/** The page's slug: `…/speisekarte/<seoName>` */
	seoName?: string;
	url?: string;
	cuisines?: string[];
	/** 0–5 */
	rating?: number | null;
	ratingCount?: number | null;
	address?: string | null;
	postcode?: string | null;
	city?: string | null;
	latitude?: number | null;
	longitude?: number | null;
	currency?: string;
	isTemporarilyOffline?: boolean;
	/** Minutes */
	deliveryTimeMin?: number | null;
	deliveryTimeMax?: number | null;
	deliveryFee?: number | null;
	minimumOrder?: number | null;
	menuItems?: {
		itemId?: string;
		name: string;
		description?: string | null;
		category?: string | null;
		/** In `currency`, not cents */
		price?: number | null;
		isAvailable?: boolean;
	}[];
}

export const LIEFERANDO_ACTOR = defineActor<LieferandoInput, LieferandoItem>(
	'lukass/just-eat-takeaway-scraper',
);

/** What a run's start and each restaurant read by its page cost */
export const LIEFERANDO_START_USD = 0.005;
export const LIEFERANDO_PAGE_USD = 0.005;
