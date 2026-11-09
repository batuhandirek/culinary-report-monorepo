import type { GooglePlaceItem } from 'src/modules/apify/actors/google-places.actor.js';
import { FakeApify } from 'src/modules/apify/tests/factories/fake-apify.js';

export type { FakeActorCall } from 'src/modules/apify/tests/factories/fake-apify.js';

/**
 * The searches a places run was started for: its search strings, or a map search's one text
 * decoded from its Google Maps URL.
 */
export const searchTextsOf = (input: unknown): string[] => {
	const { startUrls, searchStringsArray } = input as {
		startUrls?: { url: string }[];
		searchStringsArray?: string[];
	};
	const url = startUrls?.[0]?.url;
	if (url)
		return [decodeURIComponent(url.match(/\/maps\/search\/([^/]+)\//)![1].replace(/\+/g, ' '))];
	return searchStringsArray ?? [];
};

/** The one search of a run (a map search's, or the first string) */
export const searchTextOf = (input: unknown): string => searchTextsOf(input)[0] ?? '';

/** The fake `ApifyService` for the `places` atom: answers by search text too */
export class FakePlacesApify extends FakeApify<GooglePlaceItem> {
	/** Answers each run with the items of its searches (`searchString`), as the actor would */
	answerSearches(items: GooglePlaceItem[]): void {
		this.answer = input => {
			const texts = searchTextsOf(input);
			return items.filter(item => texts.includes(item.searchString ?? ''));
		};
	}
}
