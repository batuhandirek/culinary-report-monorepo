import { describe, expect, it } from '@jest/globals';

import { sharedFood, VenueTopicInput, venueTopics } from '../util/venue-topics.js';

import { seedIndex } from './factories/topic.factory.js';

const index = seedIndex();

/** The input as text, stored the way the writers store it: a cuisine resolved, a menu item `resolveMenuItem`'d */
type TextInput = Omit<Partial<VenueTopicInput>, 'mentionTopics' | 'menuItems'> & {
	mentionCuisines?: { cuisine: string | null; n: number }[];
	menuItems?: { name: string; category?: string | null }[];
};
const tags = ({ mentionCuisines = [], menuItems, ...input }: TextInput) =>
	venueTopics(
		{
			category: null,
			manual: [],
			...input,
			mentionTopics: mentionCuisines.map(({ cuisine, n }) => ({ keys: index.resolve(cuisine), n })),
			menuItems: menuItems?.map(item => ({ keys: index.resolveMenuItem(item) })),
		},
		index,
	);
const brief = (input: TextInput) => tags(input).map(t => `${t.primary ? '*' : ''}${t.key} ${t.source} ${t.score}`);

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

	it('adds what its menu sells from three items and a quarter of those with a kind of food', () => {
		const menuItems = [
			{ name: 'Pho Bo', category: 'Suppen' },
			{ name: 'Pho Ga', category: 'Suppen' },
			{ name: 'Pho Chay', category: 'Suppen' },
			{ name: 'Banh Mi Thit', category: 'Sandwiches' },
			{ name: 'Sommerrollen', category: 'Vorspeisen' },
			{ name: 'Matcha Latte', category: 'Getränke' },
			{ name: 'Cola', category: 'Getränke' },
		];
		// Pho 3 of 5 items with a kind of food (banh mi and matcha are one each: too few)
		expect(brief({ category: 'Asian restaurant', menuItems })).toEqual([
			'*asian category 1',
			'pho menu 0.6',
		]);
		// Without a category of food, the menu's makes it primary
		expect(brief({ category: 'Restaurant', menuItems })).toEqual(['*pho menu 0.6']);
	});

	it("adds the food Google's review tags name, weighted by their counts, never staff or places", () => {
		expect(
			brief({
				category: 'Cafe',
				reviewTags: [
					{ title: 'friendly staff', count: 104 },
					{ title: 'atmosphere', count: 28 },
					{ title: 'cookie', count: 38 },
					{ title: 'cakes', count: 10 },
					{ title: 'terrace', count: 10 },
				],
			}),
		).toEqual(['*cookies reviews 0.79', 'cafe category 1']);
		// A single mention is noise
		expect(brief({ category: 'Bar', reviewTags: [{ title: 'cocktails', count: 1 }] })).toEqual([
			'*bar category 1',
		]);
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
	const of = (category: string, mentionCuisines: TextInput['mentionCuisines'] = []) =>
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
