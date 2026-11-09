import { describe, expect, it } from '@jest/globals';

import { placesInput, queriesOf, queryOf } from '../util/places-input.js';

const city = { locationQuery: 'Berlin, Germany', lat: 52.52, lng: 13.405 };
const LIST_ONLY = { language: 'en', maxReviews: 0, maxImages: 0, maxQuestions: 0 };

describe('placesInput', () => {
	it("a grid search: the queries on the city's grid, list data only, no questions", () => {
		expect(
			placesInput(
				{ mode: 'grid', queries: ['restaurant', 'bar', 'cafe', 'bar'], perQuery: 1000 },
				city,
			),
		).toEqual({
			...LIST_ONLY,
			searchStringsArray: ['restaurant', 'bar', 'cafe'],
			locationQuery: 'Berlin, Germany',
			maxCrawledPlacesPerSearch: 1000,
		});
	});

	it("a typed search: as a guest types it, no grid, Google's own order", () => {
		expect(
			placesInput({ mode: 'typed', queries: ['Faustus, Berlin'], perQuery: 1 }, null),
		).toEqual({
			...LIST_ONLY,
			searchStringsArray: ['Faustus, Berlin'],
			maxCrawledPlacesPerSearch: 1,
		});
	});

	it('a map search: one search from a map centred on the city, the bare text without coordinates', () => {
		expect(
			placesInput({ mode: 'map', query: 'pasta Mitte Berlin', perQuery: 10 }, city),
		).toEqual({
			...LIST_ONLY,
			startUrls: [
				{
					url: 'https://www.google.com/maps/search/pasta+Mitte+Berlin/@52.52,13.405,12z?hl=en',
				},
			],
			maxCrawledPlacesPerSearch: 10,
		});
		expect(
			placesInput(
				{ mode: 'map', query: 'pasta Mitte Berlin', perQuery: 10 },
				{ ...city, lat: null, lng: null },
			),
		).toEqual({
			...LIST_ONLY,
			searchStringsArray: ['pasta Mitte Berlin'],
			maxCrawledPlacesPerSearch: 10,
		});
	});

	it('detail pages: by place id, once each, with the "Order online" links', () => {
		expect(placesInput({ mode: 'details', placeIds: ['a', 'b', 'a'] }, null)).toEqual({
			...LIST_ONLY,
			placeIds: ['a', 'b'],
			scrapePlaceDetailPage: true,
			scrapeOrderOnline: true,
		});
	});

	it('refuses a grid or map search without the city', () => {
		expect(() => placesInput({ mode: 'grid', queries: ['bar'], perQuery: 1 }, null)).toThrow(
			'needs the city',
		);
		expect(() => placesInput({ mode: 'map', query: 'bar', perQuery: 1 }, null)).toThrow(
			'needs the city',
		);
	});
});

describe('queriesOf and queryOf', () => {
	it("lists a search's queries, and names the query an item answers", () => {
		expect(queriesOf({ mode: 'grid', queries: ['a', 'b', 'a'], perQuery: 1 })).toEqual([
			'a',
			'b',
		]);
		expect(queriesOf({ mode: 'map', query: 'pasta Mitte Berlin', perQuery: 10 })).toEqual([
			'pasta Mitte Berlin',
		]);
		expect(queriesOf({ mode: 'details', placeIds: ['a'] })).toEqual([]);
		// A map search's items answer its one query whatever the actor echoes; a detail page answers none
		expect(
			queryOf(
				{ mode: 'map', query: 'pasta Mitte Berlin', perQuery: 10 },
				{ searchString: 'https://…' },
			),
		).toBe('pasta Mitte Berlin');
		expect(queryOf({ mode: 'typed', queries: ['a'], perQuery: 1 }, { searchString: 'a' })).toBe(
			'a',
		);
		expect(queryOf({ mode: 'typed', queries: ['a'], perQuery: 1 }, {})).toBeNull();
		expect(queryOf({ mode: 'details', placeIds: ['a'] }, { searchString: 'a' })).toBeNull();
	});
});
