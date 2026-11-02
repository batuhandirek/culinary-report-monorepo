import { describe, expect, it } from '@jest/globals';

import { parseAmount, statedAmount } from '../util/amounts.js';
import {
	changesOf,
	complaintsOf,
	foodsOf,
	notedOf,
	type PartLike,
	partTopicKeys,
	praiseOf,
	rootsOf,
	saidOf,
	sentimentOf,
	type StatementLike,
	topicKeysOf,
} from '../util/statement-views.js';

/* What a source's statements say, read back as reports, prompts and pages read them: by polarity, by root, by food. */

/** An aspect part as a populated entity reads: the topic with its parent (a root has none) */
const aspect = (key: string, parent?: string): PartLike => ({
	role: 'aspect',
	topic: { key, parent: parent ? { key: parent } : null },
});

/** A food part: the wording with its links (empty until decided) */
const food = (key: string, name: string, topics: string[] = []): PartLike => ({
	role: 'food',
	term: { key, name, topics: topics.map(k => ({ topic: { key: k } })) },
});

const statement = (fields: StatementLike): StatementLike => ({ ...fields });

describe('statement views', () => {
	const list: StatementLike[] = [
		statement({
			text: 'the döner was damn good',
			sentiment: 'positive',
			parts: [aspect('taste', 'food'), food('doner', 'Doner', ['kebab'])],
		}),
		statement({
			text: 'waited 50 minutes',
			sentiment: 'negative',
			amount: 50,
			unit: 'minutes',
			parts: [aspect('wait_for_food', 'wait')],
		}),
		statement({
			text: 'fries for 10 euros',
			sentiment: 'neutral',
			amount: 10,
			unit: 'money',
			parts: [aspect('price_level', 'price'), food('fry', 'fries')],
		}),
		// A noticed change, however it came across: no praise
		statement({
			text: 'new owner, much better now',
			sentiment: 'positive',
			kind: 'change',
			parts: [aspect('ownership', 'other')],
		}),
		// Not filed by agent B yet: no aspect, no root
		statement({ text: 'pricey', sentiment: 'negative', parts: [] }),
		// A dish the source listed that no claim names
		statement({
			text: null,
			sentiment: 'positive',
			parts: [food('lahmacun', 'Lahmacun', ['lahmacun'])],
		}),
	];

	it('reads a source back by polarity: praise, complaints and noted facts, a change never among them', () => {
		expect(praiseOf(list)).toEqual([
			{
				text: 'the döner was damn good',
				sentiment: 'positive',
				aspect: 'taste',
				root: 'food',
			},
		]);
		expect(complaintsOf(list)).toEqual([
			{
				text: 'waited 50 minutes',
				sentiment: 'negative',
				aspect: 'wait_for_food',
				root: 'wait',
				amount: 50,
				unit: 'minutes',
			},
			{ text: 'pricey', sentiment: 'negative' },
		]);
		// "Fries for 10 euros" is a fact: noted, neither praise nor complaint
		expect(notedOf(list)).toEqual([
			{
				text: 'fries for 10 euros',
				sentiment: 'neutral',
				aspect: 'price_level',
				root: 'price',
				amount: 10,
				unit: 'money',
			},
		]);
		expect(changesOf(list)).toEqual([
			{
				text: 'new owner, much better now',
				sentiment: 'positive',
				kind: 'change',
				aspect: 'ownership',
				root: 'other',
			},
		]);
		// A statement without a sentiment yet reads as neutral, and a mixed one is noted
		expect(
			notedOf([
				statement({ text: 'came on a Tuesday' }),
				statement({ text: 'good but slow', sentiment: 'mixed' }),
			]).map(v => v.sentiment),
		).toEqual(['neutral', 'mixed']);
	});

	it('keeps a question and a change out of praise and complaints, and carries the quote and the kind', () => {
		const said: StatementLike[] = [
			statement({ text: 'is it halal?', sentiment: 'positive', kind: 'question' }),
			statement({ text: 'prices went up', sentiment: 'negative', kind: 'change' }),
			statement({
				text: 'the Pommes were soggy',
				quote: ' Die Pommes waren matschig ',
				sentiment: 'negative',
				kind: 'opinion',
			}),
		];
		expect(praiseOf(said)).toEqual([]);
		expect(complaintsOf(said)).toEqual([
			{
				text: 'the Pommes were soggy',
				quote: 'Die Pommes waren matschig',
				sentiment: 'negative',
				kind: 'opinion',
			},
		]);
		expect(changesOf(said).map(v => v.text)).toEqual(['prices went up']);
	});

	it("works out a source's sentiment from its judging claims, and what it said in its own words, judging ones first", () => {
		const of = (...sentiments: (string | null)[]) =>
			sentimentOf(
				sentiments.map((sentiment, i) => statement({ text: `claim ${i}`, sentiment })),
			);
		expect([
			of('positive', 'positive'),
			of('negative'),
			of('positive', 'negative'),
			of('mixed'),
			of('neutral', null),
			of(),
		]).toEqual(['positive', 'negative', 'mixed', 'mixed', 'neutral', 'neutral']);
		// A change or a question judges nothing; a dish-only statement has no text
		expect(
			sentimentOf([
				statement({ text: 'prices went up', sentiment: 'negative', kind: 'change' }),
				statement({ text: 'is it good?', sentiment: 'positive', kind: 'question' }),
				statement({ text: null, sentiment: 'positive' }),
				statement({ text: 'great burger', sentiment: 'positive', kind: 'opinion' }),
			]),
		).toBe('positive');
		expect(
			saidOf([
				statement({ text: 'we came on a Tuesday', sentiment: 'neutral', kind: 'fact' }),
				statement({
					text: 'the burger was great',
					quote: 'Der Burger war mega',
					sentiment: 'positive',
					kind: 'opinion',
				}),
				statement({ text: 'highly recommend', sentiment: 'positive', kind: 'verdict' }),
				statement({ text: null, sentiment: 'positive' }),
			]),
		).toEqual(['Der Burger war mega', 'highly recommend', 'we came on a Tuesday']);
		expect(saidOf([statement({ text: 'a' }), statement({ text: 'b' })], 1)).toEqual(['a']);
	});

	it('gives each polarity’s roots once, in the order said, claims with no aspect left out', () => {
		const praise: StatementLike[] = [
			statement({ text: 'tasty', sentiment: 'positive', parts: [aspect('taste', 'food')] }),
			statement({
				text: 'cosy',
				sentiment: 'positive',
				parts: [aspect('atmosphere', 'vibe')],
			}),
			statement({
				text: 'pretty plates',
				sentiment: 'positive',
				parts: [aspect('presentation', 'food')],
			}),
			// Filed at a root itself: the root is its own
			statement({ text: 'the food', sentiment: 'positive', parts: [aspect('food')] }),
			statement({ text: 'nice', sentiment: 'positive', parts: [] }),
			statement({
				text: 'rude',
				sentiment: 'negative',
				parts: [aspect('friendliness', 'service')],
			}),
		];
		expect(rootsOf(praise, 'positive')).toEqual(['food', 'vibe']);
		expect(rootsOf(praise, 'negative')).toEqual(['service']);
		expect(rootsOf(list, 'negative')).toEqual(['wait']);
	});

	it('groups the foods by term: the dish-only statement’s sentiment wins, else one polarity, else mixed, with the term’s topics', () => {
		expect(foodsOf(list)).toEqual([
			{ name: 'Doner', key: 'doner', sentiment: 'positive', topics: ['kebab'] },
			{ name: 'fries', key: 'fry', sentiment: 'neutral', topics: [] },
			{ name: 'Lahmacun', key: 'lahmacun', sentiment: 'positive', topics: ['lahmacun'] },
		]);
		// Praised and criticised: mixed; a dish-only row decides over the claims
		const doner: StatementLike[] = [
			statement({
				text: 'the döner was damn good',
				sentiment: 'positive',
				parts: [food('doner', 'Doner', ['kebab'])],
			}),
			statement({
				text: 'the döner cost 15 euros',
				sentiment: 'negative',
				parts: [food('doner', 'doner', ['kebab'])],
			}),
		];
		expect(foodsOf(doner)).toEqual([
			{ name: 'Doner', key: 'doner', sentiment: 'mixed', topics: ['kebab'] },
		]);
		expect(
			foodsOf([
				...doner,
				statement({ text: null, sentiment: 'negative', parts: [food('doner', 'Döner')] }),
			]),
		).toEqual([{ name: 'Doner', key: 'doner', sentiment: 'negative', topics: ['kebab'] }]);
		// A compound wording lists every topic it links; a change statement's food counts, its polarity does not
		expect(
			foodsOf([
				statement({
					text: 'the vegan döner is new',
					sentiment: 'positive',
					kind: 'change',
					parts: [food('vegan doner', 'vegan döner', ['kebab', 'vegan'])],
				}),
				statement({
					text: 'the vegan döner was dry',
					sentiment: 'negative',
					parts: [food('vegan doner', 'vegan döner', ['kebab', 'vegan'])],
				}),
			]),
		).toEqual([
			{
				name: 'vegan döner',
				key: 'vegan doner',
				sentiment: 'negative',
				topics: ['kebab', 'vegan'],
			},
		]);
	});

	it('lists every topic a source is about once: the aspects and the foods’ links', () => {
		expect(topicKeysOf(list)).toEqual([
			'taste',
			'kebab',
			'wait_for_food',
			'price_level',
			'ownership',
			'lahmacun',
		]);
		expect(partTopicKeys(food('fry', 'fries'))).toEqual([]);
		expect(partTopicKeys(aspect('queue', 'wait'))).toEqual(['queue']);
	});

	it('reads the minutes and the money a text states: ranges at the upper end, "an hour" 60, "pricey" none', () => {
		const minutes = (text: string) => parseAmount(text, 'minutes')?.amount;
		expect(minutes('waited 40 min for the food')).toBe(40);
		expect(minutes('30-40 minutes in line')).toBe(40);
		expect(minutes('waited 20 to 25 minutes')).toBe(25);
		expect(minutes('1.5 hours for a table')).toBe(90);
		expect(minutes('over an hour')).toBe(60);
		expect(minutes('waited an hour for the food')).toBe(60);
		expect(minutes('half an hour')).toBe(30);
		expect(minutes('an hour and a half')).toBe(90);
		expect(minutes('waited forever')).toBeUndefined();
		const money = (text: string) => parseAmount(text, 'money')?.amount;
		expect(money('the döner cost 15 euros')).toBe(15);
		expect(money('€9.50 for a dürüm')).toBe(9.5);
		expect(money('9,50 € now')).toBe(9.5);
		expect(money('EUR 12 per plate')).toBe(12);
		expect(money('€8-10 cocktails')).toBe(10);
		expect(money('pricey for what it is')).toBeUndefined();
		// The unit says what to read: minutes in a price claim are no price, and no unit reads nothing
		expect(parseAmount('waited 40 minutes', 'money')).toBeUndefined();
		expect(parseAmount('fries for 10 euros', 'minutes')).toBeUndefined();
		expect(parseAmount('fries for 10 euros', null)).toBeUndefined();
		expect(parseAmount('fries for 10 euros', 'money')).toEqual({ amount: 10, unit: 'money' });
	});

	it('keeps an answered amount only when it is a number above zero with a unit', () => {
		expect(statedAmount(15, 'money')).toEqual({ amount: 15, unit: 'money' });
		expect(statedAmount(0.5, 'minutes')).toEqual({ amount: 0.5, unit: 'minutes' });
		expect(statedAmount(0, 'minutes')).toBeUndefined();
		expect(statedAmount(-5, 'money')).toBeUndefined();
		expect(statedAmount(Number.NaN, 'money')).toBeUndefined();
		expect(statedAmount(Number.POSITIVE_INFINITY, 'minutes')).toBeUndefined();
		expect(statedAmount(null, 'money')).toBeUndefined();
		expect(statedAmount(undefined, 'money')).toBeUndefined();
		expect(statedAmount(15, null)).toBeUndefined();
	});
});
