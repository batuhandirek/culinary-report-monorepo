import { describe, expect, it } from '@jest/globals';

import { seedIndex } from 'src/modules/topics/tests/factories/topic.factory.js';
import { dishKey } from 'src/modules/venues/util/dishes.js';

import { reviewTagTopic } from '../util/review-tag-topics.js';

describe('reviewTagTopic', () => {
	const index = seedIndex();
	const none = new Map<string, string | null>();

	it('links a dish, a drink or a diet the tag names as a whole', () => {
		expect(reviewTagTopic(index, none, 'Dürüm')).toBe('kebab');
		expect(reviewTagTopic(index, none, 'cocktails')).toBe('cocktails');
		expect(reviewTagTopic(index, none, 'vegan')).toBe('vegan');
	});

	it('leaves what is no food, a kind of place and a compound alone', () => {
		expect(reviewTagTopic(index, none, 'waiting time')).toBeUndefined();
		expect(reviewTagTopic(index, none, 'cash only')).toBeUndefined();
		expect(reviewTagTopic(index, none, 'coffee')).toBeUndefined();
		expect(reviewTagTopic(index, none, 'cheese counter')).toBeUndefined();
	});

	it("follows the dish name's decision first", () => {
		const decided = new Map<string, string | null>([
			[dishKey('Chicken Döner'), 'kebab'],
			[dishKey('Dürüm'), null],
			[dishKey('vegan'), null],
		]);
		// The agent's link, which no name match would find
		expect(reviewTagTopic(index, decided, 'Chicken Döner')).toBe('kebab');
		// Decided as no dish topic: not linked to one by name
		expect(reviewTagTopic(index, decided, 'Dürüm')).toBeUndefined();
		// A dish decision says nothing about a diet
		expect(reviewTagTopic(index, decided, 'vegan')).toBe('vegan');
	});
});
