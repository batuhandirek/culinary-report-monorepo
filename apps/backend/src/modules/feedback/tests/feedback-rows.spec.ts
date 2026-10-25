import { describe, expect, it } from '@jest/globals';

import { complaintsOf, dishesOf, feedbackRows, praiseOf, topicsOf } from '../util/feedback-rows.js';

/* What a source says, as rows: one per point, one per dish no point names; read back for reports. */
describe('feedbackRows', () => {
	it('writes the agent answer as it is: points with their dish and amount, unnamed dishes on their own', () => {
		const rows = feedbackRows(
			{
				praise: [
					{ theme: 'taste', detail: 'juicy patty', dish: 'Cheeseburger', amount: null },
				],
				complaints: [
					{
						theme: 'price_increase',
						detail: 'the burger got pricier',
						dish: 'burger',
						amount: null,
					},
					{ theme: 'wait_for_food', detail: 'waited 40 min', dish: null, amount: 40 },
				],
				dishes: [
					{ name: 'Cheeseburger', sentiment: 'positive' },
					{ name: 'Burgers', sentiment: 'negative' },
					{ name: 'Fries', sentiment: 'neutral' },
				],
			},
			{ asked: true },
		);
		expect(
			rows.map(r => [
				r.sentiment,
				r.topic,
				r.theme,
				r.dish,
				r.dishKey,
				r.amount,
				r.unit,
				r.detail,
			]),
		).toEqual([
			[
				'positive',
				'food',
				'taste',
				'Cheeseburger',
				'cheeseburger',
				null,
				null,
				'juicy patty',
			],
			[
				'negative',
				'price',
				'price_increase',
				'burger',
				'burger',
				null,
				null,
				'the burger got pricier',
			],
			['negative', 'wait', 'wait_for_food', null, null, 40, 'minutes', 'waited 40 min'],
			// "Burgers" is the burger a point names (one key); fries no point names
			['neutral', null, null, 'Fries', 'fry', null, null, null],
		]);
		expect(rows.every(r => r.dishChecked && r.amountChecked)).toBe(true);
	});

	it('reads stored points by their phrase: one named dish links, the rest wait for the passes', () => {
		const rows = feedbackRows(
			{
				praise: [{ topic: 'food', theme: 'taste', detail: 'the kebabs were great' }],
				complaints: [
					{ topic: 'food', theme: 'temperature', detail: 'fries and döner cold' },
					{ topic: 'food', theme: 'portion_size', detail: 'small portions' },
					{ topic: 'service', theme: 'friendliness', detail: 'rude staff' },
					{ topic: 'wait', theme: 'wait_for_food', detail: 'waited an hour' },
					{ topic: 'wait', theme: 'queue', detail: 'long queue' },
					// Stored before themes: keeps its topic, unfiled
					{ topic: 'price', detail: 'expensive' },
				],
				dishes: [
					{ name: 'Döner Kebab', sentiment: 'positive' },
					{ name: 'Kebab', sentiment: 'positive' },
					{ name: 'Döner', sentiment: 'negative' },
					{ name: 'Fries', sentiment: 'negative' },
				],
			},
			{ asked: false },
		);
		const byDetail = Object.fromEntries(rows.filter(r => r.detail).map(r => [r.detail, r]));
		expect([
			byDetail['the kebabs were great'].dish,
			byDetail['the kebabs were great'].dishChecked,
		]).toEqual(['Kebab', true]);
		// Two named: the dish pass decides
		expect([
			byDetail['fries and döner cold'].dish,
			byDetail['fries and döner cold'].dishChecked,
		]).toEqual([null, false]);
		expect([byDetail['small portions'].dish, byDetail['small portions'].dishChecked]).toEqual([
			null,
			false,
		]);
		// Not a food or drinks point: never asked
		expect(byDetail['rude staff'].dishChecked).toBe(true);
		expect([
			byDetail['waited an hour'].amount,
			byDetail['waited an hour'].amountChecked,
		]).toEqual([60, true]);
		expect([byDetail['long queue'].amount, byDetail['long queue'].amountChecked]).toEqual([
			null,
			false,
		]);
		expect([byDetail['rude staff'].amountChecked, byDetail['expensive'].amountChecked]).toEqual(
			[true, false],
		);
		expect([byDetail['expensive'].topic, byDetail['expensive'].theme]).toEqual(['price', null]);
		// Dish-only rows for every listed dish no point took
		expect(rows.filter(r => !r.detail).map(r => r.dish)).toEqual([
			'Döner Kebab',
			'Döner',
			'Fries',
		]);
	});

	it('takes the topic from the theme, and files an unknown theme as unfiled under its stored topic', () => {
		const [moved, gone] = feedbackRows(
			{
				praise: [],
				complaints: [
					{ topic: 'food', theme: 'price_increase', detail: 'prices went up' },
					{ topic: 'vibe', theme: 'no_such_theme', detail: 'odd' },
				],
				dishes: [],
			},
			{ asked: false },
		);
		expect([moved.topic, moved.theme]).toEqual(['price', 'price_increase']);
		expect([gone.topic, gone.theme]).toEqual(['vibe', null]);
	});

	it('reads rows back: points by polarity, topics once, dishes once with a merged sentiment', () => {
		const rows = feedbackRows(
			{
				praise: [
					{ theme: 'taste', detail: 'great burger', dish: 'Burger' },
					{ theme: 'taste', detail: 'tasty sauce', dish: null },
				],
				complaints: [
					{ theme: 'value_for_money', detail: 'burger not worth it', dish: 'burgers' },
				],
				dishes: [{ name: 'Fries', sentiment: 'neutral' }],
			},
			{ asked: true },
		);
		expect(praiseOf(rows)).toEqual([
			{ topic: 'food', theme: 'taste', detail: 'great burger' },
			{ topic: 'food', theme: 'taste', detail: 'tasty sauce' },
		]);
		expect(complaintsOf(rows)).toEqual([
			{ topic: 'price', theme: 'value_for_money', detail: 'burger not worth it' },
		]);
		expect(topicsOf(rows, 'positive')).toEqual(['food']);
		expect(dishesOf(rows)).toEqual([
			{ name: 'Burger', key: 'burger', sentiment: 'mixed' },
			{ name: 'Fries', key: 'fry', sentiment: 'neutral' },
		]);
	});
	it('keeps a dish named in another script, by its own letters', () => {
		const rows = feedbackRows(
			{
				praise: [],
				complaints: [],
				dishes: [
					{ name: 'تشريب الكص العراقي', sentiment: 'positive' },
					{ name: '牛肉面', sentiment: 'positive' },
				],
			},
			{ asked: false },
		);
		expect(rows.map(r => [r.dish, r.dishKey])).toEqual([
			['تشريب الكص العراقي', 'تشريب الكص العراقي'],
			['牛肉面', '牛肉面'],
		]);
	});
});
