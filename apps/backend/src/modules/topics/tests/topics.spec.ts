import { describe, expect, it } from '@jest/globals';

import { normalizeCuisine } from 'src/modules/venues/util/cuisine.js';
import { termKey as termKeyOf } from 'src/modules/venues/util/dishes.js';

import { TOPIC_SEED } from '../constants/topic-seed.constant.js';
import { TopicKindEnum } from '../entities/topic.entity.js';
import { type IndexedTerm, TopicIndex } from '../util/topics.js';
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

});

describe('TopicIndex.wordingTopics', () => {
	const decided = (name: string, d: Partial<IndexedTerm>): IndexedTerm => ({
		key: termKeyOf(name),
		name,
		topicKey: null,
		exact: false,
		modifiers: [],
		...d,
	});
	const idx = new TopicIndex(index.topics, [
		decided('Cocktail bar', { topicKey: 'bar', modifiers: [{ topicKey: 'cocktails', type: 'has' }] }),
		decided('Grocery delivery service', {}),
		decided('Pizza delivery', { topicKey: 'takeaway_handling', exact: true }),
		decided('Snack bar', { topicKey: 'street food', exact: true }),
	]);

	it("reads a decided category whole: its main topic, then its modifiers; none and an aspect give nothing", () => {
		expect(idx.wordingTopics('Cocktail bar')).toEqual(['bar', 'cocktails']);
		expect(idx.wordingTopics('Snack bar')).toEqual(['street food']);
		expect(idx.wordingTopics('Grocery delivery service')).toEqual([]);
		expect(idx.wordingTopics('Pizza delivery')).toEqual([]);
	});

	it("takes a topic's own name as a whole without a term, and nothing else until the agent decides", () => {
		expect(idx.wordingTopics('Italian restaurant')).toEqual(['italian']);
		expect(idx.wordingTopics('Coffee shop')).toEqual(['cafe']);
		expect(idx.wordingTopics('Pub')).toEqual(['pub']);
		// Undecided: never split into words, though "bar" and "wine" are topics
		expect(idx.wordingTopics('Wine bar')).toEqual([]);
		expect(idx.wordingTopics('Restaurant')).toEqual([]);
		expect(idx.wordingTopics(null)).toEqual([]);
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
	const row = (
		venueId: string,
		district: string | null,
		name: string,
		price: number,
		category: string | null = null,
	) => ({
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
		expect(
			menuItemsOf(
				index,
				'japanese',
			)({ topics: index.resolveMenuItem({ name: 'Sushi Set' }) }),
		).toBe(true);
		expect(
			menuItemsOf(
				index,
				'japanese',
			)({ topics: index.resolveMenuItem({ name: 'Cola', category: 'Getränke' }) }),
		).toBe(false);
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
			{ key: 'a', label: 'A', kind: TopicKindEnum.DISH, isA: ['b'] },
			{ key: 'b', label: 'B', kind: TopicKindEnum.DISH, isA: ['a'] },
		]);
		expect(cyclic.withParents(['a'])).toEqual(['a', 'b']);
	});
});

/* The decided terms in the index: a wording's forms point at the list of topics it was decided to be. */
describe('TopicIndex with decided terms', () => {
	const withTerms = (terms: IndexedTerm[]) => new TopicIndex(seedIndex().topics, terms);
	const decided = withTerms([
		{
			key: 'vegan doner',
			name: 'vegan döner',
			topicKey: 'kebab',
			exact: false,
			modifiers: [{ topicKey: 'vegan', type: 'has' }],
		},
		{
			key: 'iced matcha',
			name: 'iced matcha',
			topicKey: 'vegan',
			exact: false,
			modifiers: [{ topicKey: 'matcha', type: 'has' }],
		},
		{ key: 'waiting time', name: 'waiting time', topicKey: 'wait', exact: true, modifiers: [] },
		// Decided "none", and decided for a topic that is gone
		{ key: 'meat', name: 'meat', topicKey: null, exact: false, modifiers: [] },
		{ key: 'house special', name: 'house special', topicKey: 'unicorn', exact: true, modifiers: [] },
	]);

	it('resolves a term to its main topic and its modifiers, in that order, whole or as a run of words', () => {
		expect(decided.exactAll('vegan döner')).toEqual(['kebab', 'vegan']);
		expect(decided.exactAll('Vegan Doner')).toEqual(['kebab', 'vegan']);
		// A narrower wording evokes its topic and modifiers, but is no topic as a whole
		expect(decided.exact('vegan döner')).toBeUndefined();
		// The term's order, not the words': the seed alone gives vegan first
		expect(decided.resolve('Vegan Döner')).toEqual(['kebab', 'vegan']);
		expect(seedIndex().resolve('Vegan Döner')).toEqual(['vegan', 'kebab']);
		expect(decided.resolve('Vegan Döner Haus')).toEqual(['kebab', 'vegan']);
	});

	it("gives a Google category's and a menu item's topics from a decided wording", () => {
		expect(decided.resolve('Vegan Döner')).toEqual(['kebab', 'vegan']);
		expect(decided.resolveMenuItem({ name: 'Vegan Döner', category: null })).toEqual([
			'kebab',
			'vegan',
		]);
		expect(decided.resolveMenuItem({ name: 'Menü 3', category: 'Vegan Döner' })).toEqual([
			'kebab',
			'vegan',
		]);
		// A drink's term under a drinks section keeps its drink only
		expect(decided.resolveMenuItem({ name: 'Iced Matcha', category: 'Getränke' })).toEqual([
			'matcha',
		]);
	});

	it('adds nothing for a term decided none, one whose topics are gone, or a spelling nobody decided', () => {
		expect(decided.exactAll('meat')).toEqual([]);
		expect(decided.exact('meat')).toBeUndefined();
		expect(decided.resolve('meat')).toEqual([]);
		expect(decided.exactAll('house special')).toEqual([]);
		expect(decided.exactAll('cheese counter')).toEqual([]);
		expect(decided.exact('cheese counter')).toBeUndefined();
	});

	it("takes a topic's own key over a term's form", () => {
		const both = new TopicIndex(
			[
				{ key: 'bar', label: 'Bar', kind: TopicKindEnum.PLACE },
				{ key: 'pub', label: 'Pub', kind: TopicKindEnum.PLACE },
			],
			[{ key: 'pub', name: 'pub', topicKey: 'bar', exact: true, modifiers: [] }],
		);
		expect(both.resolve('Pub')).toEqual(['pub']);
		expect(both.exactAll('pub')).toEqual(['pub']);
	});

	it("picks a wording's dish topic as the first dish or drink of the list, none for a list without one", () => {
		expect(decided.dishTopic('vegan döner')).toBe('kebab');
		expect(decided.dishTopic('Iced Matcha')).toBe('matcha');
		expect(decided.dishTopic('waiting time')).toBeUndefined();
		// Not decided: a topic's own key, as written or by its term key
		expect(decided.dishTopic('Kebabs')).toBe('kebab');
		expect(decided.dishTopic('Vegetable kebab')).toBeUndefined();
	});

	it('names an aspect through a decided term as a whole; an aspect key alone is no kind of food', () => {
		expect(decided.exactAll('waiting time')).toEqual(['wait']);
		expect(decided.exact('Waiting Time')).toBe('wait');
		expect(decided.resolve('#service')).toEqual([]);
		expect(decided.resolve('wait')).toEqual([]);
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

	it('has each label resolve to its own topic: extraction is told to use the labels', () => {
		// With no decided wording at all: a label never needs an alias ("Desserts" is `dessert`)
		const bare = new TopicIndex(index.topics, []);
		for (const s of TOPIC_SEED)
			expect([s.label, bare.resolve(s.label), index.resolve(s.label)]).toEqual([
				s.label,
				[s.key],
				[s.key],
			]);
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
