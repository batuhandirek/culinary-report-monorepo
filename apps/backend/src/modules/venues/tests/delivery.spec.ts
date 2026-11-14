import { describe, expect, it } from '@jest/globals';

import { isMainCourse, itemsForDish, pricePosition } from '../util/delivery.js';

describe('menu price helpers', () => {
	it('compares main courses only, and dishes by whole words', () => {
		expect(isMainCourse({ name: 'Ayran', category: 'Getränke' })).toBe(false);
		expect(isMainCourse({ name: 'Extra Käse', category: 'Pizza' })).toBe(false);
		expect(isMainCourse({ name: 'Döner Teller', category: 'Teller' })).toBe(true);
		expect(
			itemsForDish(
				[{ name: 'Döner im Brot' }, { name: 'Dönerteller' }, { name: 'Lahmacun' }],
				'Döner',
			),
		).toEqual([{ name: 'Döner im Brot' }]);
	});

	it('places the venue’s median and its dishes among the others', () => {
		const items = (prices: Record<string, number>) =>
			Object.entries(prices).map(([name, price]) => ({ name, price }));
		const position = pricePosition(
			{
				venueId: 'v',
				name: 'Venue',
				items: items({ 'Döner im Brot': 8.5, 'Döner Teller': 13, Lahmacun: 7, Ayran: 2.5 }),
			},
			[
				{
					venueId: 'a',
					name: 'A',
					items: items({ 'Döner im Brot': 7, 'Döner Teller': 11, Pide: 9 }),
				},
				{ venueId: 'b', name: 'B', items: items({ 'Döner Kebab': 6.5, Falafel: 6 }) },
				{ venueId: 'c', name: 'C (no menu)', items: [] },
			],
			['Döner', 'Lahmacun'],
		);
		// Venue mains 7, 8.5, 13 → 8.5; A → 9, B → 6.25; others' median 7.625
		expect(position).toEqual({
			median: 8.5,
			othersMedian: 7.63,
			othersWithMenu: 2,
			diff: 0.115,
			dishes: [
				{ dish: 'Döner', price: 10.75, othersMedian: 7.75, othersWithDish: 2 },
				{ dish: 'Lahmacun', price: 7, othersWithDish: 0 },
			],
		});
		expect(pricePosition({ venueId: 'v', name: 'V', items: [] }, [], [])).toBeNull();
	});

	it('leads with the venue’s own kind of food against the same on the other menus', () => {
		const items = (prices: Record<string, number>) =>
			Object.entries(prices).map(([name, price]) => ({ name, price }));
		const ramen = {
			key: 'ramen',
			label: 'Ramen',
			matches: (i: { name: string }) => /ramen/i.test(i.name),
		};
		const position = pricePosition(
			{
				venueId: 'v',
				name: 'V',
				items: items({ 'Tonkotsu Ramen': 15, 'Shoyu Ramen': 14, Gyoza: 6 }),
			},
			[
				{ venueId: 'a', name: 'A', items: items({ 'Miso Ramen': 12, Edamame: 5 }) },
				{ venueId: 'b', name: 'B', items: items({ Ramen: 13, 'Spicy Ramen': 13 }) },
				{ venueId: 'c', name: 'C', items: items({ Burger: 11 }) },
			],
			[],
			ramen,
		);
		expect(position?.topic).toEqual({
			key: 'ramen',
			label: 'Ramen',
			price: 14.5,
			othersMedian: 12.5,
			othersWithTopic: 2,
			diff: 0.16,
		});
		// The venue sells none of it: no topic line, the median main course stays
		expect(
			pricePosition({ venueId: 'v', name: 'V', items: items({ Burger: 12 }) }, [], [], ramen),
		).toEqual({
			median: 12,
			othersMedian: null,
			othersWithMenu: 0,
			diff: null,
			dishes: [],
		});
	});
});
