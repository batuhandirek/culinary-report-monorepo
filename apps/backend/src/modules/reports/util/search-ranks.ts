import _ from 'lodash';

import { type DishSearchSnapshotRow, searchWords } from 'src/modules/venues/util/dish-searches.js';
import { addDays } from 'src/modules/venues/util/week.js';

import type { ReportSearchRank } from '../interfaces/report-data.interface.js';

/** Searches a report shows a branch at most */
export const REPORT_SEARCHES = 3;
/** Earlier months a search shows */
const HISTORY_MONTHS = 5;
/**
 * A snapshot taken in a month's first days counts for the month before: the monthly run builds
 * the reports then, and that snapshot is where the month ended
 */
export const SNAPSHOT_GRACE_DAYS = 10;

/** The report month a snapshot day (`YYYY-MM-DD`) counts for. */
export const snapshotMonth = (searchedOn: string): string =>
	Number(searchedOn.slice(8, 10)) <= SNAPSHOT_GRACE_DAYS ?
		addDays(`${searchedOn.slice(0, 7)}-01`, -1).slice(0, 7)
	:	searchedOn.slice(0, 7);

/** The snapshot days a report month reads (`YYYY-MM-DD`, both included), its earlier months' too. */
export const searchWindow = (month: string): { from: string; to: string } => {
	const start = new Date(`${month}-01T12:00:00Z`);
	const from = new Date(start);
	from.setUTCMonth(from.getUTCMonth() - HISTORY_MONTHS);
	const next = new Date(start);
	next.setUTCMonth(next.getUTCMonth() + 1);
	return {
		from: addDays(from.toISOString().slice(0, 10), SNAPSHOT_GRACE_DAYS),
		to: addDays(next.toISOString().slice(0, 10), SNAPSHOT_GRACE_DAYS - 1),
	};
};

/**
 * A branch's place on the city's food searches in its district, from the dish-search snapshots
 * (`DishSearchService.inDistrict` over `searchWindow`): the month's snapshot is its newest that
 * counts for the month (`snapshotMonth`); its searches are the branch's topics in `topicKeys`
 * order (its own tags, primary first, then their parents) that snapshot ran, `REPORT_SEARCHES`
 * at most, best rank first; each with its rank (absent: not in the top ten) and the same search
 * in up to five earlier months, the newest snapshot of each. Undefined when the month has no
 * snapshot or it searched none of the branch's topics.
 */
export const reportSearchRanks = (
	rows: DishSearchSnapshotRow[],
	opts: { month: string; district: string; placeId: string; topicKeys: string[] },
): ReportSearchRank[] | undefined => {
	// The newest snapshot of each month, newest month first
	const byMonth = _.uniqBy(
		_.uniq(rows.map(r => r.searchedOn))
			.sort()
			.reverse()
			.map(on => ({ on, month: snapshotMonth(on) })),
		s => s.month,
	);
	const current = byMonth.find(s => s.month === opts.month);
	if (!current) return undefined;
	const of = (on: string, key: string) =>
		_.sortBy(
			rows.filter(r => r.searchedOn === on && r.topicKey === key),
			r => r.rank,
		);
	const keys = _.uniq(opts.topicKeys)
		.filter(key => of(current.on, key).length)
		.slice(0, REPORT_SEARCHES);
	if (!keys.length) return undefined;
	const rankOf = (places: DishSearchSnapshotRow[]) => places.find(r => r.placeId === opts.placeId)?.rank;
	const searches = keys.map(key => {
		const places = of(current.on, key);
		const rank = rankOf(places);
		return {
			query: searchWords({ key, kind: places[0].topicKind }, opts.district),
			...(rank !== undefined && { rank }),
			results: places.length,
			searchedOn: current.on,
			top: places.map(r => ({
				name: r.name,
				...(r.rating != null && { rating: r.rating }),
				...(r.reviewsCount != null && { reviewsCount: r.reviewsCount }),
				isVenue: r.placeId === opts.placeId,
			})),
			history: byMonth
				.filter(s => s.month < opts.month && of(s.on, key).length)
				.slice(0, HISTORY_MONTHS)
				.reverse()
				.map(s => {
					const before = rankOf(of(s.on, key));
					return { month: s.month, ...(before !== undefined && { rank: before }) };
				}),
		};
	});
	return _.sortBy(searches, [s => s.rank ?? Infinity, s => s.query]);
};
