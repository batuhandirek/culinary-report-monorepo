import { defineActor } from './actor.js';

/**
 * `borderline/uber-eats-scraper-ppr`: Uber Eats stores with their menus, here read by their own
 * pages (`urls`), one item a store.
 *
 * - **Price.** $0.005 a store, no start fee (checked 2026-11-14 on Free).
 * - **Prices.** In cents.
 * - **Ratings.** `rating.ratingValue` is 0–5; `ratingCount` is text and rounded ("170+").
 * - **Delivery time.** By URL the store is read from no delivery address, so `etaMinutes` is
 *   meaningless and `storeAvailablityStatus` (the actor's spelling) says `TOO_FAR_TO_DELIVER`.
 * - **Sections.** The first, "Empfohlene Artikel" / "Featured items", repeats items of the others.
 * - **Its own search** (`query` + `address`) returns stores in no order of relevance (the store
 *   asked for by name came third of three), so pages are found elsewhere and read by URL.
 */
export interface UberEatsInput {
	/** Store pages, `https://www.ubereats.com/de/store/<slug>/<id>` */
	urls: string[];
	/** "de-DE" */
	locale?: string;
}

/** One item of a store's menu section */
export interface UberEatsMenuItem {
	uuid?: string;
	title?: string;
	itemDescription?: string | null;
	/** Cents */
	price?: number | null;
	isSoldOut?: boolean;
	/** The share of raters who liked it, as text: "91%" */
	rating?: string | null;
	numRatings?: number | null;
}

/** The actor's item for a store, as far as we read it */
export interface UberEatsItem {
	uuid?: string;
	slug?: string;
	url?: string;
	title?: string;
	cuisineList?: string[];
	location?: {
		streetAddress?: string | null;
		city?: string | null;
		postalCode?: string | null;
		latitude?: number | null;
		longitude?: number | null;
	};
	currencyCode?: string;
	rating?: { ratingValue?: number | null; ratingCount?: string | null } | null;
	etaMinutes?: { min?: number | null; max?: number | null } | null;
	storeAvailablityStatus?: string;
	/** The store left the platform */
	isLost?: boolean;
	menu?: { catalogName?: string | null; catalogItems?: UberEatsMenuItem[] }[];
}

export const UBER_EATS_ACTOR = defineActor<UberEatsInput, UberEatsItem>(
	'borderline/uber-eats-scraper-ppr',
);

/** What each store read by its page costs */
export const UBER_EATS_PAGE_USD = 0.005;
