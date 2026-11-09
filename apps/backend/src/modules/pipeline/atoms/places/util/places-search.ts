import _ from 'lodash';

import type { GooglePlaceItem } from 'src/modules/apify/actors/google-places.actor.js';
import type { City } from 'src/modules/cities/entities/city.entity.js';
import { distanceM } from 'src/modules/venues/util/osm-places.js';

/**
 * How far from the city's centre a search result may be and still count: a search answers across
 * the border too (Teltow, Ahrensfelde: a guest in Berlin sees them), never in another city.
 */
export const SEARCH_MAX_KM = 40;
/** The map's zoom a search starts from, the whole city in view */
const SEARCH_ZOOM = 12;

/**
 * The Google Maps search a guest in the city would make: the text, with the map centred on the
 * city. Without a centre the actor's map sits wherever its proxy is (New York, Chicago, Dallas:
 * 2026-10-25), and Google mixes places near it into the results and finds fewer of the city's.
 * Null for a city without coordinates.
 */
export const citySearchUrl = (text: string, city: Pick<City, 'lat' | 'lng'>): string | null =>
	city.lat == null || city.lng == null ?
		null
	:	`https://www.google.com/maps/search/${encodeURIComponent(text).replace(/%20/g, '+')}/@${city.lat},${city.lng},${SEARCH_ZOOM}z?hl=en`;

/**
 * Whether a search result is the city's to rank: in its country and within `SEARCH_MAX_KM` of its
 * centre. What the item or the city doesn't say counts as near.
 */
export const nearCity = (
	item: Pick<GooglePlaceItem, 'countryCode' | 'location'>,
	city: Pick<City, 'country' | 'lat' | 'lng'>,
): boolean => {
	if (
		item.countryCode &&
		city.country &&
		item.countryCode.toUpperCase() !== city.country.toUpperCase()
	)
		return false;
	if (!item.location || city.lat == null || city.lng == null) return true;
	return distanceM(item.location, { lat: city.lat, lng: city.lng }) <= SEARCH_MAX_KM * 1000;
};

/**
 * One search's places in Google's order (`rank`, else the dataset's order), each place once and
 * only those with a place id: a dataset can hold them out of order.
 */
export const orderedPlaces = <T extends Pick<GooglePlaceItem, 'placeId' | 'rank'>>(
	items: T[],
): T[] =>
	_.uniqBy(
		_.sortBy(
			items.map((item, i) => ({ item, at: item.rank ?? i + 1 })),
			r => r.at,
		).filter(r => r.item.placeId),
		r => r.item.placeId,
	).map(r => r.item);
