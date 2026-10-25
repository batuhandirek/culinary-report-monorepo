import { describe, expect, it } from '@jest/globals';

import { type CityThemeComplaint, cityThemes } from '../util/city-themes.js';

/* A brand's complaint themes against the month's report venues: shares of written reviews, a review
   once per theme, against the median of peers with five written reviews. */
describe('cityThemes', () => {
	const complaint = (brandId: string, reviewId: string, theme: string | null): CityThemeComplaint => ({
		brandId,
		reviewId,
		theme,
	});
	// Five peers with 10 written reviews each; one of them criticised a price increase once
	const peers = ['p1', 'p2', 'p3', 'p4', 'p5'];
	const written = new Map([['me', 10], ...peers.map(p => [p, 10] as [string, number]), ['small', 2]]);
	const base = [
		complaint('p1', 'p1-a', 'price_increase'),
		complaint('p2', 'p2-a', 'queue'),
		complaint('p3', 'p3-a', 'queue'),
		complaint('p4', 'p4-a', 'queue'),
		// Too few written reviews to count in a median
		complaint('small', 's-a', 'price_increase'),
	];

	it('gives the brand\'s share per theme against the peers\' median, the biggest gap first', () => {
		const themes = cityThemes({
			brandId: 'me',
			written,
			complaints: [
				...base,
				// Two points of one review: one review
				complaint('me', 'm-1', 'price_increase'),
				complaint('me', 'm-1', 'price_increase'),
				complaint('me', 'm-2', 'price_increase'),
				complaint('me', 'm-3', 'queue'),
				// A catch-all is no finding
				complaint('me', 'm-4', 'food_other'),
			],
		});
		expect(themes).toEqual([
			{ key: 'price_increase', label: 'Price increase', topic: 'price', reviews: 2, venueShare: 0.2, median: 0, venues: 5 },
			{ key: 'queue', label: 'Queue', topic: 'wait', reviews: 1, venueShare: 0.1, median: 0.1, venues: 5 },
		]);
	});

	it('is absent below the floors and while a point of the brand is unfiled', () => {
		const mine = [complaint('me', 'm-1', 'price_increase')];
		expect(cityThemes({ brandId: 'me', written: new Map([...written, ['me', 4]]), complaints: [...base, ...mine] })).toBeUndefined();
		expect(cityThemes({ brandId: 'me', written, complaints: [...base, ...mine, complaint('me', 'm-2', null)] })).toBeUndefined();
		// Four peers left once one has an unfiled point
		expect(cityThemes({ brandId: 'me', written, complaints: [...base, ...mine, complaint('p5', 'p5-a', null)] })).toBeUndefined();
	});
});
