import { describe, expect, it } from '@jest/globals';

import { countThemes } from '../util/summarize-report.js';

/* Theme counts are sources, like topic counts: a review raising a theme twice counts once. */
describe('countThemes', () => {
	it('counts each source once per theme, however many points it split the theme into', () => {
		expect(
			countThemes([
				[
					{ topic: 'price', theme: 'price_increase', detail: 'prices went up' },
					{ topic: 'price', theme: 'price_increase', detail: 'dürüm now €9.50' },
					{ topic: 'price', theme: 'price_level', detail: 'expensive' },
				],
				[{ topic: 'price', theme: 'price_increase', detail: 'prices are way more now than before' }],
				[],
				null,
			]),
		).toEqual({ price_increase: 2, price_level: 1 });
	});

	it('is absent, not short, while a point has no theme yet', () => {
		expect(
			countThemes([
				[{ topic: 'price', theme: 'price_increase', detail: 'prices went up' }],
				[{ topic: 'price', detail: 'expensive' }],
			]),
		).toBeUndefined();
		expect(countThemes([])).toEqual({});
	});
});
