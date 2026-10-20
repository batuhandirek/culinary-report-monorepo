import _ from 'lodash';

import type { VenueSearchRankEntry } from 'src/modules/venues/interfaces/venue-search-rank.interface.js';

import type { ReportSearchRank } from '../interfaces/report-data.interface.js';

const HISTORY_MONTHS = 5;

/** A stored search rank, as the report reads it. */
export interface SearchRankRow {
	month: string;
	query: string;
	rank?: number | null;
	results: number;
	top: VenueSearchRankEntry[];
}

/**
 * The report month's searches, best rank first (unranked last), each with its earlier months.
 * Undefined when the month has none. Later months than the report's are ignored.
 */
export const reportSearchRanks = (
	rows: SearchRankRow[],
	month: string,
	placeId: string,
): ReportSearchRank[] | undefined => {
	const current = rows.filter(r => r.month === month);
	if (!current.length) return undefined;
	return _.sortBy(current, [r => r.rank ?? Infinity, r => r.query]).map(r => ({
		query: r.query,
		rank: r.rank ?? undefined,
		results: r.results,
		top: r.top.map(e => ({
			name: e.name,
			rating: e.rating,
			reviewsCount: e.reviewsCount,
			isVenue: e.placeId === placeId,
		})),
		history: _.sortBy(
			rows.filter(h => h.query === r.query && h.month < month),
			h => h.month,
		)
			.slice(-HISTORY_MONTHS)
			.map(h => ({ month: h.month, rank: h.rank ?? undefined })),
	}));
};
