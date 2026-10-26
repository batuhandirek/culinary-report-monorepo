import _ from 'lodash';

import type { FoodTopicIndex } from 'src/modules/food-topics/util/food-topics.js';
import type { VenueTopicTag } from 'src/modules/food-topics/util/venue-topics.js';

import type { VenueSearchRankEntry } from '../interfaces/venue-search-rank.interface.js';
import type { GooglePlaceItem } from '../services/venue.service.js';

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
	index: FoodTopicIndex,
	n = SEARCH_QUERIES_PER_VENUE,
): string[] => {
	if (!district) return [];
	const own = tags.map(t => t.key);
	const kinds = _.uniq([...own, ...index.withParents(own)]).filter(k => !GENERIC_TOPICS.has(k));
	return kinds.slice(0, n).map(kind => `${kind} ${district}`);
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
