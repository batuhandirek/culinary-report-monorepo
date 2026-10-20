import { describe, expect, it } from '@jest/globals';

import { normalizeCuisine } from '../util/cuisine.js';

describe('normalizeCuisine', () => {
	it('merges spellings of one kind of food', () => {
		expect(
			[
				'Döner',
				'doner kebab',
				'Kebap',
				'Turkish/Kebab',
				'Doner kebab restaurant',
				'Kebab shop',
			].map(normalizeCuisine),
		).toEqual(Array(6).fill('kebab'));
		expect(
			['Viet', 'Vietnamese', 'vietnamese food', 'Vietnamesisch'].map(normalizeCuisine),
		).toEqual(Array(4).fill('vietnamese'));
		expect(['Türkisch', 'Turkish', 'Turkish restaurant'].map(normalizeCuisine)).toEqual(
			Array(3).fill('turkish'),
		);
		expect(['Cafe', 'Café', 'Coffee shop', 'Coffee'].map(normalizeCuisine)).toEqual(
			Array(4).fill('cafe'),
		);
	});

	it('keeps kinds that only look alike apart, and drops junk', () => {
		expect(normalizeCuisine('German street food')).toBe('german street food');
		expect(normalizeCuisine('Vegan Döner')).toBe('vegan kebab');
		expect(normalizeCuisine('Fast food restaurant')).toBe('fast food');
		expect(['/', '.', '', null, 'Unknown'].map(normalizeCuisine)).toEqual(Array(5).fill(null));
	});
});
