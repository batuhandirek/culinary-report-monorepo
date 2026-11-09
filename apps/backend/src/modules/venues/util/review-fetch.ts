import type { Venue } from '../entities/venue.entity.js';

/** The day of a time, `YYYY-MM-DD` (UTC): what the reviews actor takes as a start */
export const dayOf = (at: Date): string => at.toISOString().slice(0, 10);

/**
 * Where a fetch from `day` can start for this venue: at its last fetch's day when its stored
 * stretch (`reviewsFetchedFrom`..`reviewsFetchedAt`) covers `day`, else at `day` itself.
 */
export const fetchStart = (
	day: string,
	venue: Pick<Venue, 'reviewsFetchedFrom' | 'reviewsFetchedAt'>,
): string =>
	(
		venue.reviewsFetchedFrom &&
		venue.reviewsFetchedAt &&
		dayOf(venue.reviewsFetchedFrom) <= day &&
		dayOf(venue.reviewsFetchedAt) > day
	) ?
		dayOf(venue.reviewsFetchedAt)
	:	day;

/**
 * A fetch from `day` came back whole for the venue: its stored stretch now reaches `now` (a fetch
 * starting inside the stretch extends it, one starting after it begins a new one).
 */
export const markFetched = (
	venue: Pick<Venue, 'reviewsFetchedFrom' | 'reviewsFetchedAt'>,
	day: string,
	now: Date,
): void => {
	const joins =
		venue.reviewsFetchedFrom && venue.reviewsFetchedAt && day <= dayOf(venue.reviewsFetchedAt);
	if (!joins || day < dayOf(venue.reviewsFetchedFrom!))
		venue.reviewsFetchedFrom = new Date(`${day}T00:00:00Z`);
	venue.reviewsFetchedAt = now;
};

/** A backfill run's cap over its plan, since busy places run above the average */
export const BACKFILL_CAP_HEADROOM = 1.5;

/**
 * A backfill run's cap: its plan with `BACKFILL_CAP_HEADROOM`, never more than the budget left
 * (`minCapUsd` at least, so a small last run isn't refused)
 */
export const backfillRunCap = (plannedUsd: number, budgetLeftUsd: number, minCapUsd: number) =>
	Math.min(plannedUsd * BACKFILL_CAP_HEADROOM, Math.max(budgetLeftUsd, minCapUsd));
