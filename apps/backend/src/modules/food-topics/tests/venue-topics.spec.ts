import { describe, expect, it } from '@jest/globals';

import { sharedFood, VenueTopicInput, venueTopics } from '../util/venue-topics.js';

import { seedIndex } from './factories/food-topic.factory.js';

const index = seedIndex();
const tags = (input: Partial<VenueTopicInput>) =>
	venueTopics({ category: null, mentionCuisines: [], manual: [], ...input }, index);
const brief = (input: Partial<VenueTopicInput>) =>
	tags(input).map(t => `${t.primary ? '*' : ''}${t.key} ${t.source} ${t.score}`);

describe('venueTopics', () => {
	it('takes its main category, its other categories at half, and its primary food', () => {
		expect(
			brief({
				category: 'Ramen restaurant',
				categories: ['Japanese restaurant', 'Takeout restaurant'],
			}),
		).toEqual(['*ramen category 1', 'japanese category 0.5']);
	});

	it('adds what posts call its food from two posts and a quarter of them, and makes it primary over a place type', () => {
		expect(
			brief({
				category: 'Snack bar',
				mentionCuisines: [
					{ cuisine: 'Döner', n: 3 },
					{ cuisine: 'Vegan Döner', n: 1 },
					{ cuisine: 'Thai', n: 1 }, // one post: noise
					{ cuisine: 'Restaurant', n: 5 }, // no kind of food: not in the share
				],
			}),
		).toEqual(['*kebab mentions 0.8', 'street food category 1']);
	});

	it('follows an admin: a tag is in and first for primary, an exclusion is out whatever gives it', () => {
		expect(
			brief({
				category: 'Asian restaurant',
				mentionCuisines: [{ cuisine: 'Pho', n: 4 }],
				manual: [
					{ key: 'asian', excluded: true },
					{ key: 'vegan', excluded: false },
					{ key: 'vietnamese', excluded: false },
				],
			}),
		).toEqual(['*vietnamese manual 1', 'pho mentions 1', 'vegan manual 1']);
	});

	it('is empty when nothing says what it serves', () => {
		expect(tags({ category: 'Restaurant', mentionCuisines: [{ cuisine: '/', n: 3 }] })).toEqual(
			[],
		);
	});

	it('makes a place type primary when it has no food tag', () => {
		expect(brief({ category: 'Cocktail bar' })).toEqual([
			'*cocktails category 1',
			'bar category 1',
		]);
		expect(brief({ category: 'Pub' })).toEqual(['*pub category 1']);
	});
});

describe('sharedFood', () => {
	const of = (category: string, mentionCuisines: VenueTopicInput['mentionCuisines'] = []) =>
		tags({ category, mentionCuisines });

	it('scores the same primary 3, a related food 2, an overlap 1, nothing 0', () => {
		expect(sharedFood(of('Ramen restaurant'), of('Ramen shop'), index)).toEqual({
			points: 3,
			reason: 'same food (Ramen)',
		});
		// Ramen and sushi are both Japanese
		expect(sharedFood(of('Ramen restaurant'), of('Sushi restaurant'), index)).toEqual({
			points: 2,
			reason: 'related food (Japanese)',
		});
		// A Japanese restaurant serves ramen's parent
		expect(sharedFood(of('Japanese restaurant'), of('Ramen restaurant'), index)).toEqual({
			points: 2,
			reason: 'related food (Japanese)',
		});
		expect(
			sharedFood(
				of('Pizza restaurant'),
				of('Italian restaurant', [{ cuisine: 'Pasta', n: 3 }]),
				index,
			).points,
		).toBe(2);
		// Fast food is a kind of place: döner and pizza share no food
		expect(sharedFood(of('Doner kebab restaurant'), of('Pizza restaurant'), index)).toEqual({
			points: 0,
			reason: null,
		});
		expect(sharedFood(of('Bar'), of('Bar'), index).points).toBe(3);
	});
});
