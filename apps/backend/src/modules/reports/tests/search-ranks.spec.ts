import { describe, expect, it } from '@jest/globals';

import { TopicKindEnum } from 'src/modules/topics/entities/topic.entity.js';
import type { DishSearchSnapshotRow } from 'src/modules/venues/util/dish-searches.js';

import { reportSearchRanks, searchWindow, snapshotMonth } from '../util/search-ranks.js';

const OURS = 'place-ours';

/** One search of a snapshot: the places in order, ours at `ourRank` (none: not in the top ten) */
const search = (
	searchedOn: string,
	topicKey: string,
	topicKind: TopicKindEnum,
	ourRank?: number,
	places = 10,
): DishSearchSnapshotRow[] =>
	Array.from({ length: places }, (_, i) => ({
		searchedOn,
		topicKey,
		topicKind,
		rank: i + 1,
		placeId: i + 1 === ourRank ? OURS : `${topicKey}-${searchedOn}-${i + 1}`,
		name: i + 1 === ourRank ? 'Ours' : `Place ${i + 1}`,
		rating: 4.5,
		reviewsCount: 100 + i,
	}));

describe('snapshotMonth', () => {
	it("counts a snapshot of a month's first ten days for the month before", () => {
		expect(snapshotMonth('2026-11-03')).toBe('2026-10');
		expect(snapshotMonth('2026-11-10')).toBe('2026-10');
		expect(snapshotMonth('2026-11-11')).toBe('2026-11');
		expect(snapshotMonth('2026-01-05')).toBe('2025-12');
	});

	it('reads from five months back to ten days after the month', () => {
		expect(searchWindow('2026-10')).toEqual({ from: '2026-05-11', to: '2026-11-10' });
	});
});

describe('reportSearchRanks', () => {
	const opts = { month: '2026-10', district: 'Mitte', placeId: OURS, topicKeys: ['ramen', 'fast food', 'japanese', 'noodles', 'cafe'] };

	it("shows the branch's topics the month's snapshot searched, three at most, best rank first, with the months before", () => {
		const rows = [
			// October's snapshot, taken early in November
			...search('2026-11-03', 'ramen', TopicKindEnum.DISH, 4),
			...search('2026-11-03', 'japanese', TopicKindEnum.CUISINE, 2),
			...search('2026-11-03', 'noodles', TopicKindEnum.DISH),
			...search('2026-11-03', 'cafe', TopicKindEnum.FORMAT, 1),
			// September's two snapshots: the newer one counts
			...search('2026-09-12', 'ramen', TopicKindEnum.DISH, 9),
			...search('2026-09-28', 'ramen', TopicKindEnum.DISH, 6),
			...search('2026-09-28', 'japanese', TopicKindEnum.CUISINE),
		];
		const ranks = reportSearchRanks(rows, opts)!;
		// The first three the snapshot ran, in the branch's order ("fast food" is never searched)
		expect(ranks.map(r => [r.query, r.rank])).toEqual([
			['japanese food Mitte', 2],
			['ramen Mitte', 4],
			['noodles Mitte', undefined],
		]);
		const ramen = ranks.find(r => r.query === 'ramen Mitte')!;
		expect(ramen).toMatchObject({ results: 10, searchedOn: '2026-11-03', history: [{ month: '2026-09', rank: 6 }] });
		expect(ramen.top[3]).toEqual({ name: 'Ours', rating: 4.5, reviewsCount: 103, isVenue: true });
		expect(ranks[0].history).toEqual([{ month: '2026-09' }]);
	});

	it('has nothing for a month without a snapshot, or one that searched none of its topics', () => {
		expect(reportSearchRanks(search('2026-09-28', 'ramen', TopicKindEnum.DISH, 1), opts)).toBeUndefined();
		expect(reportSearchRanks(search('2026-10-20', 'pizza', TopicKindEnum.DISH, 1), opts)).toBeUndefined();
	});

	it('counts a search with fewer than ten places as its whole list', () => {
		const [rank] = reportSearchRanks(search('2026-10-20', 'ramen', TopicKindEnum.DISH, undefined, 4), opts)!;
		expect(rank).toMatchObject({ query: 'ramen Mitte', results: 4, history: [] });
		expect(rank.rank).toBeUndefined();
	});
});
