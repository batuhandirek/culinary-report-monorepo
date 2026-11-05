import _ from 'lodash';

import type { City } from 'src/modules/cities/entities/city.entity.js';
import type { TopicIndex } from 'src/modules/topics/util/topics.js';
import type { VenueTopicTag } from 'src/modules/topics/util/venue-topics.js';

import type { VenueSearchRankEntry } from '../interfaces/venue-search-rank.interface.js';

import type { GooglePlaceItem } from '../services/venue.service.js';

import { distanceM } from './osm-places.js';

/** What the Places actor bills a place a search found ($0.004, plus a share of the run's start) */
export const GOOGLE_PLACE_USD = 0.0042;

/** Searches per venue */
export const SEARCH_QUERIES_PER_VENUE = 3;
/** Places a search returns (`maxCrawledPlacesPerSearch`): a venue below is "not in the top 20" */
export const SEARCH_RANK_DEPTH = 20;
/** Places kept per search */
export const SEARCH_RANK_TOP = 10;

// Topics nobody searches a district for: every second place is one
const GENERIC_TOPICS = new Set(['fast food', 'street food', 'halal']);

/** A Google Maps search result: the actor numbers each search's places in `rank`, 1-based. */
export interface SearchPlaceItem extends GooglePlaceItem {
	rank?: number;
}

/**
 * The searches a guest would type to find the venue: its food topics × its district, e.g.
 * "ramen Mitte". Topics in order: its tags as `venueTopics` ranks them (primary first), then
 * their parents ("japanese Mitte" for a ramen bar); generic ones ("fast food") left out. Topic
 * keys are the words searched. None without a district.
 */
export const searchQueries = (
	district: string | null | undefined,
	tags: VenueTopicTag[],
	index: TopicIndex,
	n = SEARCH_QUERIES_PER_VENUE,
): string[] => {
	if (!district) return [];
	const own = tags.map(t => t.key);
	const kinds = _.uniq([...own, ...index.withParents(own)]).filter(k => !GENERIC_TOPICS.has(k));
	return kinds.slice(0, n).map(kind => `${kind} ${district}`);
};

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
export const citySearchUrl = (
	text: string,
	city: Pick<City, 'lat' | 'lng'>,
): string | null =>
	city.lat == null || city.lng == null
		? null
		: `https://www.google.com/maps/search/${encodeURIComponent(text).replace(/%20/g, '+')}/@${city.lat},${city.lng},${SEARCH_ZOOM}z?hl=en`;

/**
 * Whether a search result is the city's to rank: in its country and within `SEARCH_MAX_KM` of its
 * centre. What the item or the city doesn't say counts as near.
 */
export const nearCity = (
	item: Pick<GooglePlaceItem, 'countryCode' | 'location'>,
	city: Pick<City, 'country' | 'lat' | 'lng'>,
): boolean => {
	if (item.countryCode && city.country && item.countryCode.toUpperCase() !== city.country.toUpperCase())
		return false;
	if (!item.location || city.lat == null || city.lng == null) return true;
	return distanceM(item.location, { lat: city.lat, lng: city.lng }) <= SEARCH_MAX_KM * 1000;
};

/**
 * One search's places in Google's order (`rank`, else the dataset's order), each place once and
 * only those with a place id: a dataset can hold them out of order.
 */
export const orderedPlaces = <T extends SearchPlaceItem>(items: T[]): T[] =>
	_.uniqBy(
		_.sortBy(
			items.map((item, i) => ({ item, at: item.rank ?? i + 1 })),
			r => r.at,
		).filter(r => r.item.placeId),
		r => r.item.placeId,
	).map(r => r.item);

/**
 * One search's results in Google's order: the venue's place (null when it is not among them)
 * and the top ten. `venueIds` maps our known place ids to venues.
 */
export const rankInResults = (
	items: SearchPlaceItem[],
	placeId: string,
	venueIds: Map<string, string>,
): { rank: number | null; results: number; top: VenueSearchRankEntry[] } => {
	const ordered = orderedPlaces(items);
	const index = ordered.findIndex(item => item.placeId === placeId);
	return {
		rank: index >= 0 ? index + 1 : null,
		results: ordered.length,
		top: ordered.slice(0, SEARCH_RANK_TOP).map(item => ({
			placeId: item.placeId!,
			name: item.title ?? '',
			...(item.totalScore != null && { rating: item.totalScore }),
			...(item.reviewsCount != null && { reviewsCount: item.reviewsCount }),
			...(venueIds.has(item.placeId!) && { venueId: venueIds.get(item.placeId!) }),
		})),
	};
};
