import { defineActor } from './actor.js';

/**
 * `signalbench/google-trends-scraper`: one item per search term, each term on its own 0–100 scale
 * (100 is its own peak in the window), from Google's JSON endpoints (no browser, ~$0.004 a term).
 * It refuses a run capped under $1. A term Google failed for (a comma in it, say) or the cap cut
 * comes back with no item at all, never an empty one. `geo` takes a subdivision (DE-BE). The weekly
 * points carry no "has data" flag: a 0 is too little data, Google's own meaning on a single-term
 * query. Related queries come with the same item at no extra cost (up to 25 top and 25 rising,
 * over the whole window). `apify/google-trends-scraper` was dropped: its `geo` takes countries
 * only, and through explore URLs it failed nine page loads in ten.
 */
export interface GoogleTrendsInput {
	/** A topic's Knowledge Graph id (`/m/…`) or a plain query, commas dropped */
	searchTerms: string[];
	/** ISO 3166-2 region (DE-BE) or a country code */
	geo: string;
	/** `YYYY-MM-DD YYYY-MM-DD` */
	customTimeRange: string;
	/** Google's category as a string: '71' Food & Drink, '0' all */
	category: string;
	includeInterestOverTime: boolean;
	includeRelatedQueries: boolean;
	includeInterestByRegion: boolean;
	includeRelatedTopics: boolean;
}

/** One weekly point of `interestOverTime`. */
export interface GoogleTrendsTimelinePoint {
	/** Unix seconds of the week's start */
	timestamp: number;
	/** "Sep 28 – Oct 4, 2025" */
	date?: string;
	/** 0–100; 0 where Google has too little data */
	value: number;
	isPartial?: boolean;
}

/** One related query of an item, as Google's "Related queries" box lists it. */
export interface GoogleTrendsRelatedQuery {
	label: string;
	/** Top: 0–100 against the most searched one. Rising: percent growth (250 = +250 %) */
	value: number;
	/** Rising: "Breakout" past +5,000 %, else "+250%" */
	formattedValue?: string;
	link?: string;
}

export interface GoogleTrendsItem {
	/** The term as searched: the key an item maps back by */
	searchTerm: string;
	/** The region searched, as given (DE-BE) */
	geo?: string;
	interestOverTime?: GoogleTrendsTimelinePoint[];
	/** Up to 25 each, over the item's whole window */
	relatedQueries?: { top?: GoogleTrendsRelatedQuery[]; rising?: GoogleTrendsRelatedQuery[] };
}

export const GOOGLE_TRENDS_ACTOR = defineActor<GoogleTrendsInput, GoogleTrendsItem>(
	'signalbench/google-trends-scraper',
);
