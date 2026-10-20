import type {
	BuzzToReviews,
	ComplaintTimes,
	PaidVsOrganic,
} from 'src/modules/reports/util/correlations.js';

/**
 * One month's computed relations, as its stored report holds them (`ReportData.correlations`).
 * A relation is absent when the report has none (below its floors, or built before relations
 * existed); `reportId` is null for a month without a report.
 */
export interface PortalPatternsMonthOutputDto {
	month: string;
	reportId: string | null;
	buzzToReviews?: BuzzToReviews;
	complaintTimes?: ComplaintTimes;
	paidVsOrganic?: PaidVsOrganic;
}

/**
 * One week (by its Monday, city time) across the months. Posts, views, reviews and booked-out
 * evenings come from the stored reports, busyness from the Google popular-times samples; each is
 * absent where nothing covers it, never zero.
 */
export interface PortalPatternsWeekOutputDto {
	/** `YYYY-MM-DD`, a Monday */
	week: string;
	/** Posts by others about the venue and their views, on the week's days that have a report */
	posts?: number;
	views?: number;
	/** New Google reviews, on the same days; absent when a covering report lists no reviews */
	reviews?: number;
	/** Mean busyness index (0–100 of the venue's own peak) of the week's samples with popular times */
	busyness?: number;
	/** How booked out the week's sampled evenings were, 0–100 */
	booked?: number;
	/** Some of its days fall in a month without a report: the counts cover only part of it */
	partial?: boolean;
}

/** `GET /portal/venues/:venueId/patterns`: the relations month by month and the weeks across months. */
export interface PortalPatternsOutputDto {
	/** Oldest first, ending with the last finished month or a newer report */
	months: PortalPatternsMonthOutputDto[];
	/** Every week touching those months, oldest first */
	weeks: PortalPatternsWeekOutputDto[];
}
