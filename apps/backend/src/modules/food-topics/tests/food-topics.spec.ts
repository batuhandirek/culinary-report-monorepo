import { describe, expect, it } from '@jest/globals';

import { normalizeCuisine } from 'src/modules/venues/util/cuisine.js';

import { FOOD_TOPIC_SEED } from '../constants/food-topic-seed.constant.js';
import { FoodTopicKindEnum } from '../entities/food-topic.entity.js';
import { FoodTopicIndex } from '../util/food-topics.js';
import { parseTrendsAutocomplete, trendsAutocompleteUrl } from '../util/trends-autocomplete.js';

import { seedIndex } from './factories/food-topic.factory.js';

const index = seedIndex();

describe('FoodTopicIndex.resolve', () => {
	it.each([
		// Spellings of one kind of food
		['Döner/Kebap', ['kebab']],
		['Turkish/Kebab', ['kebab']],
		['Viet', ['vietnamese']],
		['Coffee shop', ['cafe']],
		['Hamburger restaurant', ['burgers']],
		['Steak house', ['steakhouse']],
		['Hookah bar', ['shisha']],
		['Breakfast restaurant', ['breakfast']],
		['Frühstück', ['breakfast']],
		['Asian fusion restaurant', ['asian']],
		['Iranian', ['persian']],
		// Compounds give each part, in order
		['Vegan Döner', ['vegan', 'kebab']],
		['Korean Fried Chicken', ['korean', 'fried chicken']],
		['Brunch/Café', ['brunch', 'cafe']],
		['Desserts, Coffee', ['dessert', 'cafe']],
		['German street food', ['german', 'street food']],
		['/Acai bowls, café/', ['acai bowls', 'cafe']],
		// The longer run wins: a snack bar is street food, not a bar
		['Snack bar', ['street food']],
		['Wine bar', ['wine', 'bar']],
		// Words no topic knows are skipped; nothing known is empty
		['Pizza Takeout', ['pizza']],
		['Restaurant', []],
		['Hotel', []],
		['/', []],
		[null, []],
	])('%s → %j', (raw, keys) => {
		expect(index.resolve(raw)).toEqual(keys);
	});

	it("takes the venue's category when the mention's cuisine says nothing", () => {
		expect(index.resolveMention('Ramen', 'Japanese restaurant')).toEqual(['ramen']);
		expect(index.resolveMention('.', 'Japanese restaurant')).toEqual(['japanese']);
		expect(index.resolveMention(null, null)).toEqual([]);
	});
});

describe('FoodTopicIndex.withParents', () => {
	it('adds every ancestor once', () => {
		expect(index.withParents(['nigerian'])).toEqual(['nigerian', 'west african', 'african']);
		expect(index.withParents(['ramen', 'sushi'])).toEqual(['ramen', 'japanese', 'sushi']);
		expect(index.withParents(['unknown'])).toEqual([]);
	});

	it('stops on a cycle', () => {
		const cyclic = new FoodTopicIndex([
			{ key: 'a', label: 'A', kind: FoodTopicKindEnum.DISH, parentKey: 'b', aliases: [] },
			{ key: 'b', label: 'B', kind: FoodTopicKindEnum.DISH, parentKey: 'a', aliases: [] },
		]);
		expect(cyclic.withParents(['a'])).toEqual(['a', 'b']);
	});

	it("prefers a topic's key over another's alias", () => {
		const both = new FoodTopicIndex([
			{
				key: 'bar',
				label: 'Bar',
				kind: FoodTopicKindEnum.FORMAT,
				parentKey: null,
				aliases: ['pub'],
			},
			{
				key: 'pub',
				label: 'Pub',
				kind: FoodTopicKindEnum.FORMAT,
				parentKey: null,
				aliases: [],
			},
		]);
		expect(both.resolve('Pub')).toEqual(['pub']);
	});
});

describe('FOOD_TOPIC_SEED', () => {
	it('has unique keys that are their own normalized form', () => {
		const keys = FOOD_TOPIC_SEED.map(s => s.key);
		expect(new Set(keys).size).toBe(keys.length);
		for (const key of keys) expect(normalizeCuisine(key)).toBe(key);
	});

	it('lists every parent before its children', () => {
		const seen = new Set<string>();
		for (const s of FOOD_TOPIC_SEED) {
			if (s.parent) expect(seen.has(s.parent)).toBe(true);
			seen.add(s.key);
		}
	});

	it('has each alias resolve to its own topic: no alias is shadowed by another topic', () => {
		for (const s of FOOD_TOPIC_SEED) {
			for (const alias of s.aliases ?? [])
				expect([alias, index.resolve(alias)]).toEqual([alias, [s.key]]);
		}
	});

	it('has each label resolve to its own topic: extraction is told to use the labels', () => {
		for (const s of FOOD_TOPIC_SEED)
			expect([s.label, index.resolve(s.label)]).toEqual([s.label, [s.key]]);
	});

	it('gives each Trends topic id to one topic', () => {
		const mids = FOOD_TOPIC_SEED.flatMap(s => (s.mid ? [s.mid] : []));
		expect(new Set(mids).size).toBe(mids.length);
		for (const mid of mids) expect(mid).toMatch(/^\/(m|g)\/[0-9a-z_]+$/);
	});
});

describe('parseTrendsAutocomplete', () => {
	it("reads Google's suggestions behind the anti-hijacking prefix", () => {
		const body = `)]}',\n{"default":{"topics":[{"mid":"/m/07_19","title":"Vietnamese cuisine","type":"Cuisine"},{"mid":"/g/11z7hw1c8p","title":"Central Vietnamese Cuisine"},{"title":"no id"}]}}`;
		expect(parseTrendsAutocomplete(body)).toEqual([
			{ id: '/m/07_19', title: 'Vietnamese cuisine', type: 'Cuisine' },
			{ id: '/g/11z7hw1c8p', title: 'Central Vietnamese Cuisine', type: '' },
		]);
		expect(parseTrendsAutocomplete('<html>rate limited</html>')).toEqual([]);
		expect(parseTrendsAutocomplete(`)]}',{"default":`)).toEqual([]);
		expect(trendsAutocompleteUrl(' pho soup ')).toBe(
			'https://trends.google.com/trends/api/autocomplete/pho%20soup?hl=en-US&tz=0',
		);
	});
});
