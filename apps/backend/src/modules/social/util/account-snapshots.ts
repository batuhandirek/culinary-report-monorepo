import _ from 'lodash';

const DAY_MS = 24 * 3600 * 1000;

/**
 * A snapshot taken in a month's first week closes the month before: the monthly run takes the
 * profiles on the 2nd, for the month that just ended (as `ratingTrend` reads venue ratings).
 */
export const SNAPSHOT_CLOSING_DAYS = 7;

/** Followers change on the admin pages: against the newest snapshot at least this old. */
export const FOLLOWERS_CHANGE_DAYS = 30;

/** The figures a snapshot can hold. */
export interface SnapshotFigures {
	followers?: number | null;
	following?: number | null;
	posts?: number | null;
	avgViews?: number | null;
	avgLikes?: number | null;
	postsLast30Days?: number | null;
}

export const SNAPSHOT_FIGURES = ['followers', 'following', 'posts', 'avgViews', 'avgLikes', 'postsLast30Days'] as const;

export interface SnapshotLike extends SnapshotFigures {
	accountId: string;
	scrapedAt: Date;
}

/** One account's figures for a month, each field from the latest snapshot closing it that has it. */
export interface MonthFigures extends SnapshotFigures {
	accountId: string;
	month: string;
	/** The latest snapshot it read */
	scrapedAt: Date;
}

/** `at`'s UTC calendar parts, as a snapshot stores them. */
export const snapshotDateParts = (at: Date): { year: number; month: number; day: number } => ({
	year: at.getUTCFullYear(),
	month: at.getUTCMonth() + 1,
	day: at.getUTCDate(),
});

/** The month (`YYYY-MM`) a snapshot taken at `at` closes. */
export const closingMonth = (at: Date): string =>
	new Date(at.getTime() - SNAPSHOT_CLOSING_DAYS * DAY_MS).toISOString().slice(0, 7);

/** When the snapshots closing these months were taken: from the first's 8th day to the day after the last's first week. */
export const closingRange = (months: string[]): { from: Date; to: Date } => {
	const sorted = [...months].sort();
	const start = new Date(`${sorted[0]}-01T00:00:00Z`);
	const end = new Date(`${sorted[sorted.length - 1]}-01T00:00:00Z`);
	end.setUTCMonth(end.getUTCMonth() + 1);
	return {
		from: new Date(start.getTime() + SNAPSHOT_CLOSING_DAYS * DAY_MS),
		to: new Date(end.getTime() + SNAPSHOT_CLOSING_DAYS * DAY_MS),
	};
};

/** Each field from the newest snapshot that has it; snapshots in any order. */
export const latestFigures = (snapshots: SnapshotLike[]): SnapshotFigures => {
	const newest = _.orderBy(snapshots, s => s.scrapedAt.getTime(), 'desc');
	return Object.fromEntries(
		SNAPSHOT_FIGURES.map(field => [field, newest.find(s => s[field] != null)?.[field] ?? null]),
	) as SnapshotFigures;
};

/**
 * Per account and asked month, the figures of the snapshots that close it (`closingMonth`):
 * followers from the latest that has them, the averages from the latest profile scrape that
 * gave them. A month no snapshot closes has no entry.
 */
export const monthFigures = (snapshots: SnapshotLike[], months: string[]): MonthFigures[] => {
	const asked = new Set(months);
	const groups = _.groupBy(
		snapshots.filter(s => asked.has(closingMonth(s.scrapedAt))),
		s => `${s.accountId}|${closingMonth(s.scrapedAt)}`,
	);
	return Object.values(groups).map(group => ({
		accountId: group[0].accountId,
		month: closingMonth(group[0].scrapedAt),
		scrapedAt: _.maxBy(group, s => s.scrapedAt.getTime())!.scrapedAt,
		...latestFigures(group),
	}));
};

/**
 * The followers change the admin pages show: the newest count against the newest one taken
 * `FOLLOWERS_CHANGE_DAYS` or more before it. Absent without both.
 */
export const followersChange = (snapshots: SnapshotLike[]): number | undefined => {
	const counted = _.orderBy(
		snapshots.filter(s => s.followers != null),
		s => s.scrapedAt.getTime(),
		'desc',
	);
	if (!counted.length) return undefined;
	const latest = counted[0];
	const before = counted.find(
		s => latest.scrapedAt.getTime() - s.scrapedAt.getTime() >= FOLLOWERS_CHANGE_DAYS * DAY_MS,
	);
	return before ? latest.followers! - before.followers! : undefined;
};
