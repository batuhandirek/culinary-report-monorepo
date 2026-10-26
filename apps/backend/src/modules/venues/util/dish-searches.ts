import { addDays } from './week.js';

/** Places kept per dish search: Google Maps' first screen and a bit */
export const DISH_SEARCH_DEPTH = 10;
/** What a Google Maps list result costs on Apify's Free plan (Berlin, 2026-10: 6,722 places, $27.64) */
export const DISH_SEARCH_PLACE_USD = 0.0042;

/** One dish searched in one district: `text` is what goes into Google Maps. */
export interface DishSearch {
	topicKey: string;
	district: string;
	text: string;
}

/**
 * Every dish in every district, as a guest types it: "pasta Mitte Berlin" (the dish's key, the
 * district, the city). Dish by dish, so a budget that covers fewer cuts whole dishes.
 */
export const dishSearches = (
	topicKeys: string[],
	districts: string[],
	cityName: string,
): DishSearch[] =>
	topicKeys.flatMap(topicKey =>
		districts.map(district => ({
			topicKey,
			district,
			text: `${topicKey} ${district} ${cityName}`,
		})),
	);

/** How many dishes a budget searches in every district, at `DISH_SEARCH_DEPTH` places a search. */
export const dishesWithinBudget = (budgetUsd: number, districts: number): number =>
	districts ? Math.floor(budgetUsd / (DISH_SEARCH_DEPTH * DISH_SEARCH_PLACE_USD * districts)) : 0;

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
