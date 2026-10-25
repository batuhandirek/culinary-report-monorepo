import { describe, expect, it } from '@jest/globals';

import { countThemes, type ThemePointRow } from '../util/theme-counts.js';

/* A theme broken down by the dishes its points were about: a food topic's dishes are one row, a
   source counts once per dish, and the share is of that side's sources about the dish. */
describe('countThemes dishes', () => {
	let n = 0;
	const point = (source: string, theme: string, dish: Partial<ThemePointRow> = {}): ThemePointRow => ({
		month: '2026-09',
		kind: 'review',
		source_id: source,
		brand_id: 'b1',
		brand_name: 'Döner Eck',
		polarity: 'complaint',
		theme,
		detail: `point ${n++}`,
		own: false,
		...dish,
	});
	const kebab = (dish: string) => ({ dish, dish_key: dish.toLowerCase(), food_topic_key: 'kebab', food_topic_label: 'Döner & kebab' });
	const fries = (dish: string) => ({ dish, dish_key: 'fry' });

	it('groups a food topic’s dishes into one row and counts a source once per dish', () => {
		const result = countThemes(
			[
				// Two points of one review about döner: one source
				point('r1', 'temperature', kebab('Döner')),
				point('r1', 'temperature', kebab('doner kebab')),
				point('r2', 'temperature', kebab('Dürüm')),
				point('r3', 'temperature', fries('Fries')),
				point('r4', 'temperature', fries('fries')),
				point('r5', 'temperature', fries('fries')),
				// A complaint about kebab under another theme: in the kebab base, not this row
				point('r6', 'portion_size', kebab('Döner')),
				// A point about no dish
				point('r7', 'temperature'),
			],
			'2026-09',
			'2026-08',
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
});
