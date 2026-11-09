import { defineActor } from './actor.js';

/**
 * `compass/crawler-google-places`: Google Maps places, one item a place.
 *
 * - **Price.** ~$0.004 a place, plus a share of the run's start (`GOOGLE_PLACE_USD` 0.0042). A
 *   place page bills `place-scraped` + `place-details-scraped` (~$0.006), even without
 *   `scrapePlaceDetailPage`. A run's cap must reach $0.50 or Apify refuses the start.
 * - **One output per place per run.** A place an earlier search of the same run found is missing
 *   from every later search's list, and the later `rank`s skip it. A search whose order is read
 *   (the dish searches) needs a run of its own (checked 2026-11-05; no input turns this off).
 * - **Location.** Without `locationQuery` or a centred `startUrls` map, the map sits wherever the
 *   proxy is (New York, Chicago, Dallas). Google mixes nearby places in and finds fewer of the
 *   city's. `maxCrawledPlacesPerSearch` stops a search at 1,000 at most.
 * - **List vs detail.** A list scrape sends empty placeholders (`popularTimesHistogram: {}`,
 *   `peopleAlsoSearch: []`, `menu: null`) for what only a detail page fills: they mean unknown,
 *   never none.
 * - **Personal data.** Questions and answers carry it: `maxQuestions: 0`.
 * - **Free plan.** Memory counts toward the plan's 16 GB across runs; one search a run fits in 2 GB.
 */
export interface GooglePlacesInput {
	/** Searches as typed ("pizza Mitte Berlin") */
	searchStringsArray?: string[];
	/** The area searched on a grid ("Berlin, Germany"); absent: the search's own text decides */
	locationQuery?: string;
	/** A Google Maps search URL each, e.g. one centred on the city (`citySearchUrl`) */
	startUrls?: { url: string }[];
	/** Known places by their Google place id (detail pages) */
	placeIds?: string[];
	/** Places a search keeps at most (its first, in Google's order) */
	maxCrawledPlacesPerSearch?: number;
	/** Opens each place's own page: popular times, every amenity section, menu, "people also search" */
	scrapePlaceDetailPage?: boolean;
	/** Google's "Order online" section (Wolt, Lieferando links): its own flag since 2026 */
	scrapeOrderOnline?: boolean;
	language?: string;
	maxReviews?: number;
	maxImages?: number;
	maxQuestions?: number;
}

/** One day's opening hours as Google words them: `{ day: 'Monday', hours: '5 to 11 PM' }` */
export interface GooglePlaceOpeningHours {
	day: string;
	hours: string;
}

/** How busy the place usually is in one hour, 0–100, against its own peak */
export interface GooglePlacePopularHour {
	hour: number;
	occupancyPercent: number;
}

/** One item: a place as Google Maps lists it (a list scrape), or its own page (a detail scrape) */
export interface GooglePlaceItem {
	placeId?: string;
	title?: string;
	/** Google's own city text ("Berlin"); a search can cross the city's border */
	city?: string;
	neighborhood?: string;
	street?: string;
	postalCode?: string;
	categoryName?: string;
	categories?: string[];
	location?: { lat: number; lng: number };
	/** ISO 3166-1 alpha-2, "DE" */
	countryCode?: string;
	price?: string;
	website?: string;
	phone?: string;
	url?: string;
	permanentlyClosed?: boolean;
	/** The all-time rating and review count */
	totalScore?: number;
	reviewsCount?: number;
	/** The search that found it, as given */
	searchString?: string;
	/** Its place in the search's list, 1-based */
	rank?: number;
	// Detail fields (a list scrape sends empty placeholders for most of them)
	openingHours?: GooglePlaceOpeningHours[] | null;
	/** `{ 'Service options': [{ 'Outdoor seating': true }, { Delivery: false }] }` */
	additionalInfo?: Record<string, Record<string, boolean>[]> | null;
	reviewsDistribution?: {
		oneStar: number;
		twoStar: number;
		threeStar: number;
		fourStar: number;
		fiveStar: number;
	} | null;
	/** `{ Mo: [{ hour: 6, occupancyPercent: 0 }, …], … }`; `{}` when Google shows none */
	popularTimesHistogram?: Record<string, GooglePlacePopularHour[]> | null;
	popularTimesLivePercent?: number | null;
	popularTimesLiveText?: string | null;
	imagesCount?: number | null;
	menu?: string | null;
	reserveTableUrl?: string | null;
	orderBy?: { name?: string; url?: string; orderUrl?: string }[] | null;
	temporarilyClosed?: boolean | null;
	placesTags?: { title: string; count: number }[] | null;
	/** "People often mention": all-time counts of what reviews name (detail page only) */
	reviewsTags?: { title?: string; count?: number }[] | null;
	/** Titles only, no place id */
	peopleAlsoSearch?:
		| {
				title?: string;
				category?: string;
				totalScore?: number | null;
				reviewsCount?: number | null;
		  }[]
		| null;
}

export const GOOGLE_PLACES_ACTOR = defineActor<GooglePlacesInput, GooglePlaceItem>(
	'compass/crawler-google-places',
);

/** What the actor bills a place a search found ($0.004, plus a share of the run's start) */
export const GOOGLE_PLACE_USD = 0.0042;

/** The lowest cap the actor starts a run with: Apify refuses a start under it */
export const GOOGLE_PLACES_MIN_CAP_USD = 0.5;
