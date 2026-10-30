import { describe, expect, it } from '@jest/globals';

import { normalizeCuisine } from 'src/modules/venues/util/cuisine.js';

import { TOPIC_SEED } from '../constants/topic-seed.constant.js';
import { TopicKindEnum } from '../entities/topic.entity.js';
import { TopicIndex } from '../util/topics.js';
import { MENU_DISTRICT_MIN_VENUES, menuItemsOf, menuTopicPrices } from '../util/menu-topics.js';
import { parseTrendsAutocomplete, trendsAutocompleteUrl } from '../util/trends-autocomplete.js';

import { seedIndex } from './factories/topic.factory.js';

const index = seedIndex();

describe('TopicIndex.resolve', () => {
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

describe('TopicIndex.resolveMenuItem', () => {
	it.each([
		// The name first, then the menu section
		[{ name: 'Tonkotsu Ramen', category: 'Bowls' }, ['ramen']],
		[{ name: 'Shoyu', category: 'Ramen' }, ['ramen']],
		[{ name: 'Margherita', category: 'Pizza' }, ['pizza']],
		[{ name: 'Vegan Döner im Brot', category: null }, ['vegan', 'kebab']],
		// A drink only from a drink; drinks, desserts, sides and extras give no food
		[{ name: 'Matcha Latte', category: 'Getränke' }, ['matcha']],
		[{ name: 'Coca-Cola 0,33l', category: 'Getränke' }, []],
		[{ name: 'Extra Käse', category: 'Pizza' }, []],
		[{ name: 'Cheesecake', category: 'Desserts' }, []],
		[{ name: 'Pommes', category: 'Beilagen' }, []],
		// A kind of place never comes from a menu
		[{ name: 'Bistro Salat', category: 'Salate' }, []],
		[{ name: 'Menü 3', category: null }, []],
	])('%j → %j', (item, keys) => {
		expect(index.resolveMenuItem(item)).toEqual(keys);
	});
});

describe('menuTopicPrices', () => {
	// Each item stored with its topics, as the delivery scrape writes them
	const row = (venueId: string, district: string | null, name: string, price: number, category: string | null = null) => ({
		venueId,
		district,
		topics: index.resolveMenuItem({ name, category }),
		price,
	});

	it("prices a topic by each venue's own median, its parents too, and districts at 5+ venues", () => {
		const rows = [
			// Five ramen places in Mitte, one with a long menu that weighs as one
			row('a', 'Mitte', 'Tonkotsu Ramen', 14),
			row('a', 'Mitte', 'Shoyu Ramen', 12),
			row('a', 'Mitte', 'Miso Ramen', 13),
			row('a', 'Mitte', 'Spicy Ramen', 15),
			row('b', 'Mitte', 'Ramen', 10),
			row('c', 'Mitte', 'Shio', 11, 'Ramen'),
			row('d', 'Mitte', 'Ramen Deluxe', 16),
			row('e', 'Mitte', 'Ramen', 12),
			row('f', 'Neukölln', 'Sushi Set', 18),
			row('f', 'Neukölln', 'Cola', 3, 'Getränke'),
			row('g', 'Neukölln', 'Pommes', 4, 'Beilagen'),
		];
		const prices = menuTopicPrices(rows, index);
		expect(prices.menus).toBe(7);
		// a 13.5, b 10, c 11, d 16, e 12
		expect(prices.topics.get('ramen')).toEqual({
			key: 'ramen',
			venues: 5,
			items: 8,
			median: 12,
			p25: 11,
			p75: 13.5,
			districts: [{ district: 'Mitte', venues: MENU_DISTRICT_MIN_VENUES, median: 12 }],
		});
		// Japanese counts its ramen and sushi; Neukölln has too few venues for a district figure
		expect(prices.topics.get('japanese')).toMatchObject({ venues: 6, median: 12.75 });
		expect(prices.topics.get('japanese')!.districts).toEqual([
			{ district: 'Mitte', venues: 5, median: 12 },
		]);
		expect(prices.topics.has('cafe')).toBe(false);
		// Only the topics asked for
		expect([...menuTopicPrices(rows, index, ['sushi']).topics.keys()]).toEqual(['sushi']);
		expect(menuItemsOf(index, 'japanese')({ topics: index.resolveMenuItem({ name: 'Sushi Set' }) })).toBe(true);
		expect(menuItemsOf(index, 'japanese')({ topics: index.resolveMenuItem({ name: 'Cola', category: 'Getränke' }) })).toBe(
			false,
		);
	});
});

describe('TopicIndex.withParents', () => {
	it('adds every ancestor once', () => {
		expect(index.withParents(['nigerian'])).toEqual(['nigerian', 'west african', 'african']);
		expect(index.withParents(['ramen', 'sushi'])).toEqual(['ramen', 'japanese', 'sushi']);
		expect(index.withParents(['unknown'])).toEqual([]);
	});

	it('stops on a cycle', () => {
		const cyclic = new TopicIndex([
			{ key: 'a', label: 'A', kind: TopicKindEnum.DISH, parentKey: 'b', aliases: [] },
			{ key: 'b', label: 'B', kind: TopicKindEnum.DISH, parentKey: 'a', aliases: [] },
		]);
		expect(cyclic.withParents(['a'])).toEqual(['a', 'b']);
	});

	it("prefers a topic's key over another's alias", () => {
		const both = new TopicIndex([
			{
				key: 'bar',
				label: 'Bar',
				kind: TopicKindEnum.FORMAT,
				parentKey: null,
				aliases: ['pub'],
			},
			{
				key: 'pub',
				label: 'Pub',
				kind: TopicKindEnum.FORMAT,
				parentKey: null,
				aliases: [],
			},
		]);
		expect(both.resolve('Pub')).toEqual(['pub']);
	});
});

describe('TOPIC_SEED', () => {
	it('has unique keys that are their own normalized form', () => {
		const keys = TOPIC_SEED.map(s => s.key);
		expect(new Set(keys).size).toBe(keys.length);
		for (const key of keys) expect(normalizeCuisine(key)).toBe(key);
	});

	it('lists every parent before its children', () => {
		const seen = new Set<string>();
		for (const s of TOPIC_SEED) {
			if (s.parent) expect(seen.has(s.parent)).toBe(true);
			seen.add(s.key);
		}
	});

	it('has each alias resolve to its own topic: no alias is shadowed by another topic', () => {
		for (const s of TOPIC_SEED) {
			for (const alias of s.aliases ?? [])
				expect([alias, index.resolve(alias)]).toEqual([alias, [s.key]]);
		}
	});

	it('has each label resolve to its own topic: extraction is told to use the labels', () => {
		for (const s of TOPIC_SEED)
			expect([s.label, index.resolve(s.label)]).toEqual([s.label, [s.key]]);
	});

	it('gives each Trends topic id to one topic', () => {
		const mids = TOPIC_SEED.flatMap(s => (s.mid ? [s.mid] : []));
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
