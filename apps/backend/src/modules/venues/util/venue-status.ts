import {
	OPENING_MAX_REVIEWS,
	VenueScrapeSourceEnum,
	VenueStatusChangeKindEnum,
} from '../constants/venue-status.constant.js';
import type { VenueDetails } from '../interfaces/venue-details.interface.js';

export type VenueOpenState = 'open' | 'temporarily_closed' | 'permanently_closed';

/** What the venue's stored flags say: permanently closed wins over temporarily. */
export const venueOpenState = (venue: {
	closed: boolean;
	details?: Pick<VenueDetails, 'temporarilyClosed'> | null;
}): VenueOpenState =>
	venue.closed ? 'permanently_closed'
	: venue.details?.temporarilyClosed ? 'temporarily_closed'
	: 'open';

/** The change between two states of a known venue, or null when nothing changed. */
export const statusChangeKind = (
	before: VenueOpenState,
	after: VenueOpenState,
): VenueStatusChangeKindEnum | null => {
	if (before === after) return null;
	if (after === 'permanently_closed') return VenueStatusChangeKindEnum.PERMANENTLY_CLOSED;
	if (after === 'temporarily_closed') return VenueStatusChangeKindEnum.TEMPORARILY_CLOSED;
	return VenueStatusChangeKindEnum.REOPENED;
};

/**
 * Whether a place first seen now counts as opened: seen by a city-wide scrape after the city's
 * first one (`openings`), open, and with fewer than `OPENING_MAX_REVIEWS` reviews, since an old
 * place the last capped scrape missed has its reviews already.
 */
export const isOpening = (
	openings: boolean,
	state: VenueOpenState,
	reviewsCount: number | null | undefined,
): boolean => openings && state === 'open' && (reviewsCount ?? 0) < OPENING_MAX_REVIEWS;

/**
 * What saw a change: a Google Maps scrape (`VenueStatusChange.source`), or `posts` for an
 * opening a matched mention flagged (`Mention.isNewOpening`), which has no row of its own.
 */
export type VenueStatusChangeSource = VenueScrapeSourceEnum | 'posts';

/** A status change with its venue, as the trends panel and the report read it. */
export interface VenueStatusChangeRow {
	venueId: string;
	name: string;
	district?: string;
	category?: string;
	street?: string;
	kind: VenueStatusChangeKindEnum;
	/** The scrape's day, or the post's for `posts`; never an opening date */
	at: Date;
	source: VenueStatusChangeSource;
}

/** Changes counted per kind. */
export interface VenueStatusCounts {
	opened: number;
	temporarilyClosed: number;
	permanentlyClosed: number;
	reopened: number;
}

export interface VenueStatusGroup extends VenueStatusCounts {
	key: string;
}

const COUNT_FIELD: Record<VenueStatusChangeKindEnum, keyof VenueStatusCounts> = {
	[VenueStatusChangeKindEnum.OPENED]: 'opened',
	[VenueStatusChangeKindEnum.TEMPORARILY_CLOSED]: 'temporarilyClosed',
	[VenueStatusChangeKindEnum.PERMANENTLY_CLOSED]: 'permanentlyClosed',
	[VenueStatusChangeKindEnum.REOPENED]: 'reopened',
};

export const countStatusChanges = (
	rows: Pick<VenueStatusChangeRow, 'kind'>[],
): VenueStatusCounts => {
	const counts = { opened: 0, temporarilyClosed: 0, permanentlyClosed: 0, reopened: 0 };
	for (const row of rows) counts[COUNT_FIELD[row.kind]]++;
	return counts;
};

/** Counts per key (district, category), busiest first; rows without a key go under "Unknown". */
export const groupStatusChanges = (
	rows: VenueStatusChangeRow[],
	key: (row: VenueStatusChangeRow) => string | undefined,
): VenueStatusGroup[] => {
	const groups = new Map<string, VenueStatusChangeRow[]>();
	for (const row of rows) {
		const k = key(row) || 'Unknown';
		groups.set(k, [...(groups.get(k) ?? []), row]);
	}
	return [...groups.entries()]
		.map(([k, rs]) => ({ key: k, ...countStatusChanges(rs) }))
		.sort((a, b) => {
			const total = (g: VenueStatusCounts) =>
				g.opened + g.temporarilyClosed + g.permanentlyClosed + g.reopened;
			return total(b) - total(a) || b.opened - a.opened || a.key.localeCompare(b.key);
		});
};

/** "Oranienstraße 12a" → "oranienstraße": the street without its house number, for comparing. */
export const streetName = (street: string | null | undefined): string | undefined => {
	const name = street
		?.toLowerCase()
		.replace(/\s+\d+\s*[a-z]?(\s*[-–/]\s*\d+\s*[a-z]?)?\s*$/i, '')
		.replace(/\s+/g, ' ')
		.trim();
	return name || undefined;
};

/** The first month of the three-month window ending with `month` (`YYYY-MM`). */
export const quarterStart = (month: string, months = 3): string => {
	const d = new Date(`${month}-01T00:00:00Z`);
	d.setUTCMonth(d.getUTCMonth() - (months - 1));
	return d.toISOString().slice(0, 7);
};

// A scrape in a month's first week closes the month before (the monthly run is on the 2nd)
const FIRST_WEEK_MS = 7 * 24 * 3600 * 1000;

/**
 * The changes that belong to the three months ending with `month`: shifted by a week, so the
 * quarterly scrape that opens the next month counts for the month just ended.
 */
export const quarterWindow = (
	month: string,
): { from: string; to: string; start: Date; end: Date } => {
	const from = quarterStart(month);
	const start = new Date(`${from}-01T00:00:00Z`);
	const end = new Date(`${month}-01T00:00:00Z`);
	end.setUTCMonth(end.getUTCMonth() + 1);
	return {
		from,
		to: month,
		start: new Date(start.getTime() + FIRST_WEEK_MS),
		end: new Date(end.getTime() + FIRST_WEEK_MS),
	};
};
