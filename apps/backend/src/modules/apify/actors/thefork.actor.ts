import { defineActor } from './actor.js';

/**
 * `clearpath/thefork-scraper`: TheFork restaurant pages, one item a restaurant (100+ fields).
 *
 * - **Price.** ~$0.006 a restaurant, reviews and photos off.
 * - **Availability.** `bookable_intervals` covers the next seven days, in minutes after midnight,
 *   both ends bookable, with no party size. A date it lists with no window is fully booked; a
 *   date it doesn't list is unknown.
 */
export interface TheForkInput {
	/** Restaurant page URLs (`…-r12345`) */
	startUrls: string[];
	maxRestaurants?: number;
	maxReviews?: number;
	maxPhotos?: number;
	language?: string;
}

/** The fields we read */
export interface TheForkItem {
	id?: string | number;
	url?: string;
	name?: string;
	is_bookable?: boolean;
	/** The next seven days' bookable windows, minutes after midnight, both ends bookable */
	bookable_intervals?:
		{ date: string; isToday?: boolean; intervals: { start: number; end: number }[] }[] | null;
}

export const THEFORK_ACTOR = defineActor<TheForkInput, TheForkItem>('clearpath/thefork-scraper');
