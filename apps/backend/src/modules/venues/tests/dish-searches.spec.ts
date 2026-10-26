import { describe, expect, it } from '@jest/globals';

import {
	dishesWithinBudget,
	dishSearchDue,
	dishSearches,
	type DishSearchRow,
	dishSearchTable,
} from '../util/dish-searches.js';
import { calendarDay } from '../util/week.js';

describe('dishSearches', () => {
	it('crosses every dish with every district, dish by dish, as a guest types it', () => {
		expect(dishSearches(['pasta', 'pizza'], ['Mitte', 'Neukölln'], 'Berlin')).toEqual([
			{ topicKey: 'pasta', district: 'Mitte', text: 'pasta Mitte Berlin' },
			{ topicKey: 'pasta', district: 'Neukölln', text: 'pasta Neukölln Berlin' },
			{ topicKey: 'pizza', district: 'Mitte', text: 'pizza Mitte Berlin' },
			{ topicKey: 'pizza', district: 'Neukölln', text: 'pizza Neukölln Berlin' },
		]);
		expect(dishSearches(['pasta'], [], 'Berlin')).toEqual([]);
	});
});

describe('dishesWithinBudget', () => {
	it('counts whole dishes: ten places a search in every district', () => {
		// The default cap covers Berlin's 47 dishes in 12 districts
		expect(dishesWithinBudget(25, 12)).toBeGreaterThanOrEqual(47);
		// $1 is 0.0042 × 10 × 12 = $0.504 a dish: one
		expect(dishesWithinBudget(1, 12)).toBe(1);
		expect(dishesWithinBudget(0.4, 12)).toBe(0);
		expect(dishesWithinBudget(25, 0)).toBe(0);
	});
});

describe('dishSearchDue', () => {
	it('is due without a snapshot, and once the newest is the interval old', () => {
		expect(dishSearchDue(null, '2026-10-26', 30)).toBe(true);
		expect(dishSearchDue('2026-10-25', '2026-11-23', 30)).toBe(false);
		expect(dishSearchDue('2026-10-25', '2026-11-24', 30)).toBe(true);
		expect(dishSearchDue('2026-10-25', '2026-11-01', 7)).toBe(true);
		// A snapshot taken today is never due again today
		expect(dishSearchDue('2026-10-25', '2026-10-25', 1)).toBe(false);
	});

	it('is never due with an interval of 0: snapshots off', () => {
		expect(dishSearchDue(null, '2026-10-26', 0)).toBe(false);
		expect(dishSearchDue('2020-01-01', '2026-10-26', 0)).toBe(false);
	});
});

describe('calendarDay', () => {
	it("splits the city's local day out: year, month, day of year, ISO week, weekday", () => {
		expect(calendarDay(new Date('2026-10-25T10:00:00Z'), 'Europe/Berlin')).toEqual({
			date: '2026-10-25',
			year: 2026,
			month: '2026-10',
			monthOfYear: 10,
			dayOfMonth: 25,
			dayOfYear: 298,
			isoYear: 2026,
			isoWeek: 43,
			weekday: 7,
		});
	});

	it("takes the city's date, not UTC's, across midnight", () => {
		// 23:30 UTC is half past midnight in Berlin
		expect(calendarDay(new Date('2026-10-26T23:30:00Z'), 'Europe/Berlin')).toMatchObject({
			date: '2026-10-27',
			weekday: 2,
		});
	});

	it('numbers ISO weeks across the year end as Postgres does', () => {
		// Friday 1 January 2027 is in week 53 of 2026
		expect(calendarDay(new Date('2027-01-01T12:00:00Z'), 'Europe/Berlin')).toMatchObject({
			year: 2027,
			dayOfYear: 1,
			isoYear: 2026,
			isoWeek: 53,
			weekday: 5,
		});
		expect(calendarDay(new Date('2026-12-31T12:00:00Z'), 'Europe/Berlin')).toMatchObject({
			dayOfYear: 365,
			isoWeek: 53,
		});
		expect(calendarDay(new Date('2026-01-01T12:00:00Z'), 'Europe/Berlin')).toMatchObject({
			isoYear: 2026,
			isoWeek: 1,
			weekday: 4,
		});
	});
});

describe('dishSearchTable', () => {
	const at = new Date('2026-10-25T06:10:00Z');
	const row = (
		searchedOn: string,
		district: string,
		rank: number,
		placeId: string,
		extra: Partial<DishSearchRow> = {},
	): DishSearchRow => ({
		district,
		searchedOn,
		rank,
		placeId,
		name: `Place ${placeId}`,
		searchedAt: at,
		...extra,
	});

	it("lists each district's top places with their rank in the snapshot before", () => {
		const table = dishSearchTable(
			[
				row('2026-10-25', 'Neukölln', 2, 'a', {
					rating: 4.6,
					reviewsCount: 812,
					venueId: 'venue-a',
				}),
				row('2026-10-25', 'Neukölln', 1, 'b', { rating: null, reviewsCount: null }),
				row('2026-10-25', 'Mitte', 1, 'c'),
				row('2026-10-01', 'Neukölln', 1, 'a'),
				row('2026-10-01', 'Neukölln', 2, 'x'),
				// Another district's earlier rank never counts
				row('2026-10-01', 'Mitte', 3, 'b'),
				// A district searched only in the snapshot before has no row in this one
				row('2026-10-01', 'Pankow', 1, 'p'),
			],
			'2026-10-25',
			'2026-10-01',
		);
		expect(table.map(d => [d.district, d.previousSearched])).toEqual([
			['Mitte', true],
			['Neukölln', true],
		]);
		expect(table[1].places).toEqual([
			// New in the top ten: no earlier rank, and no nulls
			{ rank: 1, placeId: 'b', name: 'Place b' },
			{
				rank: 2,
				placeId: 'a',
				name: 'Place a',
				rating: 4.6,
				reviewsCount: 812,
				venueId: 'venue-a',
				previousRank: 1,
			},
		]);
		expect(table[0].places[0].previousRank).toBeUndefined();
		expect(table[0].searchedAt).toEqual(at);
	});

	it('says when there is no snapshot before, so nothing reads as new', () => {
		const [mitte] = dishSearchTable([row('2026-10-25', 'Mitte', 1, 'c')], '2026-10-25');
		expect(mitte.previousSearched).toBe(false);
		expect(dishSearchTable([], '2026-10-25', '2026-10-01')).toEqual([]);
	});
});
