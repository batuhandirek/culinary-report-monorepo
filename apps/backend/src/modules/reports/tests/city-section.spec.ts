import { describe, expect, it } from '@jest/globals';

import { seedIndex } from 'src/modules/food-topics/tests/factories/food-topic.factory.js';
import type {
	CityTrends,
	TrendShareRow,
} from 'src/modules/trends/interfaces/city-trends.interface.js';
import type { TrendMention } from 'src/modules/trends/util/compute-trends.js';

import {
	baselineVenues,
	CITY_SECTION_MIN_MENTIONS,
	cityBaseline,
	citySection,
	cuisinePlacement,
	median,
	percentileAmong,
	risingRows,
} from '../util/city-section.js';

let n = 0;
const mention = (
	brandId: string,
	cuisine: string | null,
	views: number,
	postId = `p${n++}`,
): TrendMention => ({
	brandId,
	brandName: brandId,
	district: 'Mitte',
	category: null,
	cuisine,
	dishes: [],
	postId,
	creator: `creator-${postId}`,
	views,
});

const row = (
	key: string,
	share: number,
	prevShare: number,
	count = 10,
	other = false,
): TrendShareRow => ({
	key,
	label: key,
	count,
	prevCount: count,
	share,
	prevShare,
	delta: Math.round((share - prevShare) * 10) / 10,
	other: other || undefined,
});

describe('median and percentile', () => {
	it('takes the middle value, or the mean of the two middle ones', () => {
		expect(median([])).toBeUndefined();
		expect(median([3, 1, 2])).toBe(2);
		expect(median([4, 1, 3, 2])).toBe(2.5);
	});

	it('counts the others below, ties half', () => {
		expect(percentileAmong(5, [])).toBeUndefined();
		expect(percentileAmong(5, [1, 2, 3, 9])).toBe(75);
		expect(percentileAmong(5, [5, 9])).toBe(25);
		expect(percentileAmong(1, [2, 3])).toBe(0);
	});
});

describe('cityBaseline', () => {
	it('compares the brand with the report brands, reviews only among those with reviews', () => {
		const rows = baselineVenues(
			['a', 'b', 'c', 'd'],
			[
				mention('a', 'ramen', 1000, 'pa1'),
				mention('a', 'ramen', 500, 'pa2'),
				// The same post naming the venue twice counts once
				mention('a', 'ramen', 500, 'pa2'),
				mention('b', 'pizza', 3000),
				mention('c', 'pizza', 100),
			],
			[
				{ brandId: 'a', stars: 5, replied: true },
				{ brandId: 'a', stars: 4, replied: false },
				{ brandId: 'b', stars: 3, replied: false },
				{ brandId: 'b', stars: null, replied: false },
			],
		);
		expect(rows.find(r => r.brandId === 'a')).toEqual({
			brandId: 'a',
			posts: 2,
			views: 1500,
			avgStars: 4.5,
			replyRate: 0.5,
		});
		expect(rows.find(r => r.brandId === 'd')).toEqual({
			brandId: 'd',
			posts: 0,
			views: 0,
			avgStars: undefined,
			replyRate: undefined,
		});

		const baseline = cityBaseline('a', rows);
		expect(baseline.venues).toBe(4);
		// Views 1500 against 3000, 100, 0: ahead of two of three
		expect(baseline.views).toEqual({ venue: 1500, median: 800, percentile: 67, venues: 4 });
		expect(baseline.posts).toEqual({ venue: 2, median: 1, percentile: 100, venues: 4 });
		// Only a and b have reviews
		expect(baseline.avgStars).toEqual({ venue: 4.5, median: 3.75, percentile: 100, venues: 2 });
		expect(baseline.replyRate).toEqual({
			venue: 0.5,
			median: 0.25,
			percentile: 100,
			venues: 2,
		});

		// A venue without reviews has no value and no percentile there
		expect(cityBaseline('d', rows).avgStars).toEqual({
			venue: undefined,
			median: 3.75,
			percentile: undefined,
			venues: 2,
		});
	});
});

describe('cuisinePlacement', () => {
	const mentions = [
		mention('ramen-1', 'Ramen', 9000),
		mention('ramen-2', 'ramen', 5000),
		mention('ramen-2', 'ramen', 2000),
		mention('me', 'Ramen', 4000),
		mention('me', 'Ramen', 500),
		mention('me', 'Japanese', 1000),
		mention('ramen-3', 'Ramen', 100),
		mention('pizza-1', 'Pizza', 50000),
	];

	const index = seedIndex();

	it('places the venue by views among the venues posts named for its food', () => {
		const placement = cuisinePlacement(
			'me',
			'ramen',
			mentions,
			[row('ramen', 12, 6), row('pizza', 30, 30)],
			index,
		);
		// 9000 and 7000 ahead of its 5500; ramen-3 behind
		expect(placement).toEqual({
			key: 'ramen',
			label: 'Ramen',
			venues: 4,
			rank: 3,
			share: 12,
			prevShare: 6,
			delta: 6,
		});
	});

	it('counts a kind of the food for it, and gives no rank when nobody posted about the venue', () => {
		// Ramen posts count for Japanese
		expect(cuisinePlacement('me', 'japanese', mentions, [], index)).toEqual({
			key: 'japanese',
			label: 'Japanese',
			venues: 4,
			rank: 3,
		});
		expect(cuisinePlacement('quiet', 'ramen', mentions, [], index)).toEqual({
			key: 'ramen',
			label: 'Ramen',
			venues: 4,
			rank: undefined,
		});
		expect(cuisinePlacement('quiet', null, mentions, [], index)).toBeUndefined();
	});
});

describe('risingRows and citySection', () => {
	it('keeps the five biggest gains with enough sources, never "Other"', () => {
		const rows = risingRows([
			row('a', 10, 5),
			row('b', 8, 7),
			row('c', 4, 6),
			row('thin', 9, 1, 2),
			row('d', 6, 3),
			row('e', 7, 5),
			row('f', 9, 8.5),
			row('g', 3, 2),
			row('__other', 40, 20, 50, true),
		]);
		expect(rows.map(r => r.key)).toEqual(['a', 'd', 'e', 'b', 'g']);
		expect(rows[0]).toEqual({
			key: 'a',
			label: 'a',
			count: 10,
			share: 10,
			prevShare: 5,
			delta: 5,
		});
	});

	it('is absent for a thin month', () => {
		const trends = {
			totals: { mentions: CITY_SECTION_MIN_MENTIONS - 1, posts: 0, views: 0, dishSources: 0 },
			cuisines: [],
			dishes: [],
		} as unknown as CityTrends;
		const input = {
			cityName: 'Berlin',
			brandId: 'me',
			trends,
			mentions: [],
			baseline: [],
			index: seedIndex(),
		};
		expect(citySection(input)).toBeUndefined();
		trends.totals.mentions = CITY_SECTION_MIN_MENTIONS;
		expect(citySection(input)).toMatchObject({
			cityName: 'Berlin',
			mentions: 200,
			baseline: { venues: 0 },
		});
	});
});
