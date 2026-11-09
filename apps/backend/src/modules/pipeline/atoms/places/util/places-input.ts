import _ from 'lodash';

import type {
	GooglePlaceItem,
	GooglePlacesInput,
} from 'src/modules/apify/actors/google-places.actor.js';
import type { City } from 'src/modules/cities/entities/city.entity.js';

import { citySearchUrl } from '../util/places-search.js';

/**
 * What a caller asks Google Maps for, in one of four modes. A caller never writes an actor field:
 * the atom builds the input here, so the shared flags are written once.
 */
export type PlacesSearch =
	/** Text searches on the city's map grid (`City.locationQuery`): the city list, lookups, brand names */
	| { mode: 'grid'; queries: string[]; perQuery: number }
	/** Searches typed as a guest types them, the city in the text, Google's own order: OSM gaps, profile addresses */
	| { mode: 'typed'; queries: string[]; perQuery: number }
	/** One search from a map centred on the city (`citySearchUrl`), a run of its own so its order is whole: the dish searches */
	| { mode: 'map'; query: string; perQuery: number }
	/** The detail pages of known places: popular times, every amenity, the "Order online" links */
	| { mode: 'details'; placeIds: string[] };

/** The city fields a search needs; a typed search and the detail pages need none */
export type PlacesCity = Pick<City, 'locationQuery' | 'lat' | 'lng'>;

/** Whether the search needs the city row: the grid's `locationQuery`, the map's centre */
export const needsCity = (search: PlacesSearch): boolean =>
	search.mode === 'grid' || search.mode === 'map';

// List data only: no reviews, no images, no questions (Q&A carries personal data), English names
const LIST_ONLY = { language: 'en', maxReviews: 0, maxImages: 0, maxQuestions: 0 } as const;

/** The actor's input for a search; the city for a grid or map search (`needsCity`) */
export const placesInput = (search: PlacesSearch, city: PlacesCity | null): GooglePlacesInput => {
	switch (search.mode) {
		case 'grid':
			if (!city) throw new Error('A grid search needs the city');
			return {
				...LIST_ONLY,
				searchStringsArray: _.uniq(search.queries),
				locationQuery: city.locationQuery,
				maxCrawledPlacesPerSearch: search.perQuery,
			};
		case 'typed':
			return {
				...LIST_ONLY,
				searchStringsArray: _.uniq(search.queries),
				maxCrawledPlacesPerSearch: search.perQuery,
			};
		case 'map': {
			if (!city) throw new Error('A map search needs the city');
			// The bare text for a city without coordinates
			const url = citySearchUrl(search.query, city);
			return {
				...LIST_ONLY,
				...(url ? { startUrls: [{ url }] } : { searchStringsArray: [search.query] }),
				maxCrawledPlacesPerSearch: search.perQuery,
			};
		}
		case 'details':
			return {
				...LIST_ONLY,
				placeIds: _.uniq(search.placeIds),
				scrapePlaceDetailPage: true,
				// Google's "Order online" section (Wolt, Lieferando links): its own flag since 2026
				scrapeOrderOnline: true,
			};
	}
};

/** The queries a search asks, each a key of the result's `byQuery` (empty when nothing came back) */
export const queriesOf = (search: PlacesSearch): string[] =>
	search.mode === 'map' ? [search.query]
	: search.mode === 'details' ? []
	: _.uniq(search.queries);

/** The query an item answers: a map search's one query, else the search string the actor echoes; none for a detail page */
export const queryOf = (
	search: PlacesSearch,
	item: Pick<GooglePlaceItem, 'searchString'>,
): string | null =>
	search.mode === 'map' ? search.query
	: search.mode === 'details' ? null
	: (item.searchString ?? null);
