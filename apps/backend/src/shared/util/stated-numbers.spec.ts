import { describe, expect, it } from '@jest/globals';

import { isGiven, numbersOf, statedNumbers, strayNumber, wordCount } from './stated-numbers.js';

describe('statedNumbers', () => {
	it('reads numbers as written, with their step', () => {
		expect(statedNumbers('1.4M views, 591k, 1,378,152 and 36.4% in 10/10')).toEqual([
			{ value: 1_400_000, step: 100_000, exact: false },
			{ value: 591_000, step: 1_000, exact: false },
			{ value: 1_378_152, step: 1, exact: true },
			{ value: 36.4, step: 0.1, exact: false },
			{ value: 10, step: 1, exact: true },
			{ value: 10, step: 1, exact: true },
		]);
	});

	it('collects every number of a value, inside strings too', () => {
		expect(numbersOf({ a: 3, b: ['173k views'], c: { d: 'no' } })).toEqual([3, 173_000]);
	});
});

describe('isGiven', () => {
	const given = [24, 1_378_152, 0.36, 36];

	it('takes a number as written, rounded or cut to its step', () => {
		expect(isGiven(statedNumbers('24')[0], given)).toBe(true);
		expect(isGiven(statedNumbers('1.4M')[0], given)).toBe(true);
		expect(isGiven(statedNumbers('1.3M')[0], given)).toBe(true);
		expect(isGiven(statedNumbers('36%')[0], given)).toBe(true);
	});

	it('refuses a number it was not given, but lets small counts and years through', () => {
		expect(isGiven(statedNumbers('25')[0], given)).toBe(false);
		expect(isGiven(statedNumbers('40')[0], given)).toBe(false);
		expect(isGiven(statedNumbers('3')[0], given)).toBe(true);
		expect(isGiven(statedNumbers('2026')[0], given)).toBe(true);
	});

	it('names the first stray number of a line', () => {
		expect(strayNumber('24 people, 1.4M views.', given)).toBeNull();
		expect(strayNumber('25 people posted 40 times.', given)).toBe(25);
	});

	it('counts words', () => {
		expect(wordCount('  one two  three ')).toBe(3);
	});
});
