import type { jest } from '@jest/globals';

import type { SearchPlaceItem } from '../../util/search-ranks.js';

/**
 * The search a `compass/crawler-google-places` run was started for: one search a run
 * (`VenueScrapeService.searchEach`), a Google Maps search URL on a map of the city, or the bare
 * text for a city without coordinates.
 */
export const searchTextOf = (input: unknown): string => {
	const { startUrls, searchStringsArray } = input as {
		startUrls?: { url: string }[];
		searchStringsArray?: string[];
	};
	const url = startUrls?.[0]?.url;
	if (url) return decodeURIComponent(url.match(/\/maps\/search\/([^/]+)\//)![1].replace(/\+/g, ' '));
	return searchStringsArray?.[0] ?? '';
};

/** Answers each search run with the items of its search (`searchString`), as the actor would. */
export const answerSearches = (
	runActor: jest.Mock<(...args: unknown[]) => Promise<SearchPlaceItem[]>>,
	items: SearchPlaceItem[],
) =>
	runActor.mockImplementation(async (_actor, input) =>
		items.filter(item => item.searchString === searchTextOf(input)),
	);
