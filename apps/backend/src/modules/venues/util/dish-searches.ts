import { GOOGLE_PLACE_USD } from 'src/modules/apify/actors/google-places.actor.js';
import { TopicKindEnum } from 'src/modules/topics/entities/topic.entity.js';

import { addDays } from './week.js';

/** Places kept per dish search: Google Maps' first screen and a bit */
export const DISH_SEARCH_DEPTH = 10;

/**
 * The food topics a guest searches a district for, by kind: what it is (a dish, a cuisine), what
 * kind of place (a format: cafe, bakery, bar), a meal (brunch), a diet (vegan), a drink
 * (cocktails). A cuisine and a diet are typed with "food" ("vietnamese food Mitte").
 */
export const SEARCHED_TOPIC_KINDS: ReadonlySet<TopicKindEnum> = new Set([
	TopicKindEnum.DISH,
	TopicKindEnum.CUISINE,
	TopicKindEnum.PLACE,
	TopicKindEnum.MEAL,
	TopicKindEnum.DIET,
	TopicKindEnum.DRINK,
]);
const WITH_FOOD: ReadonlySet<TopicKindEnum> = new Set([TopicKindEnum.CUISINE, TopicKindEnum.DIET]);

/**
 * Topics nobody searches a district for: every second place is fast food, halal is a filter, a
 * nightclub is no food place, and a drink's umbrella ("coffee drinks") is no guest's words
 */
export const UNSEARCHED_TOPICS: ReadonlySet<string> = new Set([
	'fast food',
	'street food',
	'halal',
	'nightclub',
	'coffee drinks',
	'soft drinks',
]);

/** Whether the snapshot searches this topic. */
export const isSearchedTopic = (topic: { key: string; kind: TopicKindEnum }): boolean =>
	SEARCHED_TOPIC_KINDS.has(topic.kind) && !UNSEARCHED_TOPICS.has(topic.key);

/** What a guest types for the topic in the district, without the city: "vietnamese food Mitte". */
export const searchWords = (
	topic: { key: string; kind: TopicKindEnum },
	district: string,
): string => `${topic.key}${WITH_FOOD.has(topic.kind) ? ' food' : ''} ${district}`;

/** One place of one district's search in one snapshot, with the topic searched: the report's read. */
export interface DishSearchSnapshotRow {
	/** The snapshot, `YYYY-MM-DD` */
	searchedOn: string;
	topicKey: string;
	topicKind: TopicKindEnum;
	rank: number;
	placeId: string;
	name: string;
	rating?: number | null;
	reviewsCount?: number | null;
}

/** One topic searched in one district: `text` is what goes into Google Maps. */
export interface DishSearch {
	topicKey: string;
	district: string;
	text: string;
}

/**
 * Every topic in every district, as a guest types it: "pasta Mitte Berlin", "vietnamese food
 * Mitte Berlin" (`searchWords` and the city). Topic by topic, so a budget that covers fewer cuts
 * whole topics.
 */
export const dishSearches = (
	topics: { key: string; kind: TopicKindEnum }[],
	districts: string[],
	cityName: string,
): DishSearch[] =>
	topics.flatMap(topic =>
		districts.map(district => ({
			topicKey: topic.key,
			district,
			text: `${searchWords(topic, district)} ${cityName}`,
		})),
	);

/** How many topics a budget searches in every district, at `DISH_SEARCH_DEPTH` places a search. */
export const dishesWithinBudget = (budgetUsd: number, districts: number): number =>
	districts ? Math.floor(budgetUsd / (DISH_SEARCH_DEPTH * GOOGLE_PLACE_USD * districts)) : 0;

/**
 * Whether a city's next dish-search snapshot is due on `today` (its local `YYYY-MM-DD`): never
 * taken, or the newest is `everyDays` old. `everyDays` 0 turns the snapshots off.
 */
export const dishSearchDue = (newest: string | null, today: string, everyDays: number): boolean =>
	everyDays > 0 && (!newest || addDays(newest, everyDays) <= today);

/** A stored place of one search, as the readers need it. */
export interface DishSearchRow {
	district: string;
	/** The snapshot, `YYYY-MM-DD` */
	searchedOn: string;
	rank: number;
	placeId: string;
	name: string;
	rating?: number | null;
	reviewsCount?: number | null;
	venueId?: string | null;
	searchedAt: Date;
}

export interface DishSearchPlace {
	rank: number;
	placeId: string;
	name: string;
	rating?: number;
	reviewsCount?: number;
	venueId?: string;
	/** Its rank on the same search in the snapshot before; absent when it was not in that top ten */
	previousRank?: number;
}

export interface DishSearchDistrict {
	district: string;
	searchedAt: Date;
	/** Whether the same search ran in the snapshot before: without it a place's move is unknown */
	previousSearched: boolean;
	places: DishSearchPlace[];
}

/**
 * One dish's searches in one snapshot, a district each (alphabetical), each place with its rank
 * on the same search in the snapshot before (`previousOn`, none for the first). A district not
 * searched in the snapshot is left out.
 */
export const dishSearchTable = (
	rows: DishSearchRow[],
	searchedOn: string,
	previousOn?: string,
): DishSearchDistrict[] => {
	const of = (on: string | undefined, district: string) =>
		rows
			.filter(r => on !== undefined && r.searchedOn === on && r.district === district)
			.sort((a, b) => a.rank - b.rank);
	const districts = [
		...new Set(rows.filter(r => r.searchedOn === searchedOn).map(r => r.district)),
	].sort((a, b) => a.localeCompare(b, 'de'));
	return districts.map(district => {
		const now = of(searchedOn, district);
		const before = new Map(of(previousOn, district).map(r => [r.placeId, r.rank]));
		return {
			district,
			searchedAt: now[0].searchedAt,
			previousSearched: before.size > 0,
			places: now.map(r => ({
				rank: r.rank,
				placeId: r.placeId,
				name: r.name,
				...(r.rating != null && { rating: r.rating }),
				...(r.reviewsCount != null && { reviewsCount: r.reviewsCount }),
				...(r.venueId && { venueId: r.venueId }),
				...(before.has(r.placeId) && { previousRank: before.get(r.placeId) }),
			})),
		};
	});
};
