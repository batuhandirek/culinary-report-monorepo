import { defineActor } from './actor.js';

/**
 * `steadyfetch/google-trends-scraper` in compare mode: 2–5 terms on one shared 0–100 scale
 * (`compare: true`), which `signalbench/google-trends-scraper` has no mode for. Takes a region code
 * as typed and a custom range; $0.009 a keyword report on Apify's Free plan, platform usage
 * included, and refuses a cap under $0.05. `category` must be a number here (71 = Food & Drink).
 * The dataset holds one row per keyword and surface, plus `notice` and `summary` rows that carry no
 * keyword data. Whether it takes `/m/` topic ids in compare mode is not yet confirmed by a run.
 */
export interface GoogleTrendsCompareInput {
	/** The anchor first, then up to four topics */
	searchTerms: string[];
	compare: boolean;
	/** ISO 3166-2 region (DE-BE) or a country code */
	geo: string;
	/** `YYYY-MM-DD YYYY-MM-DD` */
	timeRange: string;
	/** Google's category as a number: 71 Food & Drink */
	category: number;
	surfaces: 'interestOverTime'[];
}

/** One weekly point of a compare run, on the group's shared 0–100 scale. */
export interface GoogleTrendsComparePoint {
	/** Unix seconds of the week's start */
	timestamp: number;
	value: number;
	isPartial?: boolean;
}

export interface GoogleTrendsCompareItem {
	/** `interestOverTime`, or `notice` / `summary` (no keyword data) */
	surface: string;
	/** The keyword as searched: the key a row maps back by */
	keyword?: string;
	sharedScale?: boolean;
	comparedWith?: string[];
	data?: { points?: GoogleTrendsComparePoint[] };
}

export const GOOGLE_TRENDS_COMPARE_ACTOR = defineActor<
	GoogleTrendsCompareInput,
	GoogleTrendsCompareItem
>('steadyfetch/google-trends-scraper');
