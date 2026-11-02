import { describe, expect, it } from '@jest/globals';

import { seedIndex } from 'src/modules/topics/tests/factories/topic.factory.js';

import type { StatementFood } from 'src/modules/statements/util/statement-foods.js';
import { countThemes, type ThemeClaimRow } from '../util/theme-counts.js';

/* A theme broken down by the dishes its claims named: a dish or drink topic's wordings are one row,
   a source counts once per dish, and the share is of that side's sources about the dish. The
   wording's topics are its term's links, read with the claim. */
describe('countThemes dishes', () => {
	let n = 0;
	const claim = (source: string, aspect: string, foods: StatementFood[] = []): ThemeClaimRow => ({
		month: '2026-09',
		kind: 'review',
		source_id: source,
		brand_id: 'b1',
		brand_name: 'Döner Eck',
		polarity: 'complaint',
		aspect,
		text: `claim ${n++}`,
		own: false,
		foods,
	});
	const kebab = (name: string): StatementFood => ({
		name,
		key: name.toLowerCase(),
		topics: [{ key: 'kebab', label: 'Döner & kebab', kind: 'dish' }],
	});
	// A wording no decision has linked yet: a row of its own
	const fries = (name: string): StatementFood => ({ name, key: 'fry', topics: [] });
	// A compound wording linked to two dishes
	const combo: StatementFood = {
		name: 'Currywurst mit Pommes',
		key: 'currywurst mit pomme',
		topics: [
			{ key: 'currywurst', label: 'Currywurst', kind: 'dish' },
			{ key: 'fries', label: 'Fries', kind: 'dish' },
		],
	};

	it('groups a topic’s wordings into one row and counts a source once per dish', () => {
		const result = countThemes(
			[
				// Two claims of one review about döner: one source
				claim('r1', 'temperature', [kebab('Döner')]),
				claim('r1', 'temperature', [kebab('doner kebab')]),
				claim('r2', 'temperature', [kebab('Dürüm')]),
				claim('r3', 'temperature', [fries('Fries')]),
				claim('r4', 'temperature', [fries('fries')]),
				claim('r5', 'temperature', [fries('fries')]),
				// A complaint about kebab under another theme: in the kebab base, not this row
				claim('r6', 'portion_size', [kebab('Döner')]),
				// A claim about no dish
				claim('r7', 'temperature'),
			],
			'2026-09',
			'2026-08',
			seedIndex(),
		);
		const temperature = result.complaints.find(r => r.key === 'temperature')!;
		expect(temperature.dishes).toEqual([
			{ key: 'dish:fry', label: 'fries', sources: 3, share: 100 },
			{ key: 'topic:kebab', label: 'Döner & kebab', foodTopic: 'kebab', sources: 2, share: 66.7 },
		]);
		expect(result.complaints.find(r => r.key === 'portion_size')!.dishes).toEqual([
			{ key: 'topic:kebab', label: 'Döner & kebab', foodTopic: 'kebab', sources: 1, share: 33.3 },
		]);
	});

	it('counts a claim naming two wordings, and a wording linked to two dishes, under each dish once', () => {
		const result = countThemes(
			[
				// One claim, two wordings; the compound wording is two dishes
				claim('r1', 'temperature', [kebab('Döner'), combo]),
				// The same source again: still once per dish
				claim('r1', 'temperature', [combo]),
				claim('r2', 'temperature', [fries('Pommes')]),
			],
			'2026-09',
			'2026-08',
			seedIndex(),
		);
		// Each once, ties by label
		expect(result.complaints.find(r => r.key === 'temperature')!.dishes).toEqual([
			{ key: 'topic:currywurst', label: 'Currywurst', foodTopic: 'currywurst', sources: 1, share: 100 },
			{ key: 'topic:kebab', label: 'Döner & kebab', foodTopic: 'kebab', sources: 1, share: 100 },
			{ key: 'topic:fries', label: 'Fries', foodTopic: 'fries', sources: 1, share: 100 },
			{ key: 'dish:fry', label: 'Pommes', sources: 1, share: 100 },
		]);
	});
});
