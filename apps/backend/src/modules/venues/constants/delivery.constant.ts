// The delivery platforms' pages and menus (`VenueDeliveryService`, the `scrape-delivery` operation).

/**
 * A venue not on every platform is searched for again once its last search is this old: a
 * restaurant joins a platform now and then, and a search is half a cent
 */
export const DELIVERY_SEARCH_RETRY_MONTHS = 3;

/** What one Google result page costs on Free; the actor refuses a cap under `GOOGLE_SEARCH_MIN_CAP_USD` */
export const GOOGLE_SEARCH_PAGE_USD = 0.0045;
export const GOOGLE_SEARCH_MIN_CAP_USD = 0.5;

/**
 * Of a run's budget, what the search for pages may spend; reading the pages takes the rest. A
 * search is cheap and a page read costs about as much, but a search can turn up several pages
 */
export const DELIVERY_SEARCH_BUDGET_SHARE = 0.25;

/**
 * Pages read per brand and platform beyond its branches in the city: a search also returns the
 * brand's branches elsewhere and look-alikes, which only a read (the page's address) tells apart
 */
export const DELIVERY_EXTRA_CANDIDATES = 1;
/** And never more than this per brand and platform, however many branches it has */
export const DELIVERY_MAX_CANDIDATES = 8;

/**
 * A page is the venue's when the platform puts the restaurant this close to it (the platforms'
 * coordinates and Google's differ by a house or two; a namesake branch is streets away)
 */
export const DELIVERY_MATCH_RADIUS_M = 250;

/** A cap leaves room over the plan: the actors charge a start, and a run may retry a page */
export const DELIVERY_CAP_HEADROOM = 1.5;
/** No fetch run is capped under this: a cap under a few cents is refused or cuts a run of one */
export const DELIVERY_MIN_RUN_USD = 0.05;

/** What one brand's "Find menus" may spend when an admin runs it (a few cents spent) */
export const DELIVERY_BRAND_BUDGET_USD = 1;
