import { defineActor } from './actor.js';

/**
 * `apify/google-search-scraper`: Google's result pages, one item a page.
 *
 * - **Price.** ~$1.80–4.50 per 1,000 result pages.
 * - **Queries.** `queries` is one string, a query a line. Each page names its query in
 *   `searchQuery.term`: the key results map back by.
 * - **Dates.** `afterDate` / `beforeDate` limit to pages Google dates in that window; an undated
 *   result can still come back.
 */
export interface GoogleSearchInput {
	/** The queries, one a line */
	queries: string;
	maxPagesPerQuery?: number;
	/** Lowercase ISO 3166-1 alpha-2, "de" */
	countryCode?: string;
	languageCode?: string;
	/** `YYYY-MM-DD` */
	afterDate?: string;
	beforeDate?: string;
}

export interface GoogleSearchResult {
	url?: string;
	title?: string;
	description?: string;
	/** Google's own date text, when it shows one */
	date?: string;
}

export interface GoogleSearchPage {
	searchQuery?: { term?: string; page?: number };
	organicResults?: GoogleSearchResult[];
}

export const GOOGLE_SEARCH_ACTOR = defineActor<GoogleSearchInput, GoogleSearchPage>(
	'apify/google-search-scraper',
);
