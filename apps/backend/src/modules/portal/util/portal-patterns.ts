import type { ReportData } from 'src/modules/reports/interfaces/report-data.interface.js';
import { addDays, monthWeeks, weekStart } from 'src/modules/venues/util/week.js';

import type {
	PortalPatternsMonthOutputDto,
	PortalPatternsOutputDto,
	PortalPatternsWeekOutputDto,
} from '../dto/portal-patterns.output.dto.js';

/** What the patterns read from a stored report. Older reports may lack the newer fields. */
export interface PatternsReport {
	id: string;
	month: string;
	data: Partial<Pick<ReportData, 'posts' | 'reviews' | 'branches' | 'correlations'>> & Pick<ReportData, 'month'>;
}

/** What the patterns read from a busyness sample (`VenueBusyness`). */
export interface PatternsBusynessSample {
	sampledAt: Date;
	busynessIndex?: number | null;
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;

/**
 * A brand's computed relations month by month and its weeks across months, from its stored
 * reports (nothing is recomputed) and one branch's busyness samples: booked out is that branch's
 * (`branchId`, else the reports' first branch). Weeks are by their Mondays in the
 * city's time zone; a week spanning two months sums both reports' posts, views and reviews,
 * since each report counts only its own month's. A week with days in a month without a report
 * is `partial`; one with none has no counts at all.
 */
export const buildPatterns = (
	reports: PatternsReport[],
	months: string[],
	samples: PatternsBusynessSample[],
	timeZone: string,
	branchId?: string,
): PortalPatternsOutputDto => {
	const byMonth = new Map(reports.map(report => [report.month, report]));

	const monthRows: PortalPatternsMonthOutputDto[] = months.map(month => {
		const report = byMonth.get(month);
		const correlations = report?.data.correlations;
		return {
			month,
			reportId: report?.id ?? null,
			...(correlations?.buzzToReviews && { buzzToReviews: correlations.buzzToReviews }),
			...(correlations?.complaintTimes && { complaintTimes: correlations.complaintTimes }),
			...(correlations?.paidVsOrganic && { paidVsOrganic: correlations.paidVsOrganic }),
		};
	});

	// Every Monday from the first month's first week to the last month's last
	const first = monthWeeks(months[0])[0];
	const last = monthWeeks(months.at(-1)!).at(-1)!;
	const weeks: string[] = [];
	for (let week = first; week <= last; week = addDays(week, 7)) weeks.push(week);

	const posts = new Map<string, { posts: number; views: number }>();
	const reviews = new Map<string, number>();
	const booked = new Map<string, number[]>();
	for (const report of reports) {
		for (const post of report.data.posts ?? []) {
			const week = weekStart(new Date(post.postedAt), timeZone);
			const row = posts.get(week) ?? { posts: 0, views: 0 };
			row.posts++;
			row.views += post.views;
			posts.set(week, row);
		}
		// Google reviews only: the list may carry TripAdvisor's too
		for (const review of report.data.reviews?.list ?? []) {
			if (review.platform) continue;
			const week = weekStart(new Date(review.publishedAt), timeZone);
			reviews.set(week, (reviews.get(week) ?? 0) + 1);
		}
		// A report without the picked branch has no evenings for it: another branch's never stand in
		const branch =
			branchId ? report.data.branches?.find(b => b.venueId === branchId) : report.data.branches?.[0];
		for (const evening of branch?.demand?.evenings ?? []) {
			const week = weekStart(new Date(`${evening.date}T12:00:00Z`), timeZone);
			booked.set(week, [...(booked.get(week) ?? []), evening.booked]);
		}
	}
	const busyness = new Map<string, number[]>();
	for (const sample of samples) {
		if (sample.busynessIndex == null) continue;
		const week = weekStart(sample.sampledAt, timeZone);
		busyness.set(week, [...(busyness.get(week) ?? []), sample.busynessIndex]);
	}

	const weekRows = weeks.map((week): PortalPatternsWeekOutputDto => {
		const days = Array.from({ length: 7 }, (_, i) => addDays(week, i).slice(0, 7));
		const covering = days.map(month => byMonth.get(month));
		const covered = covering.filter(Boolean).length;
		const counts = posts.get(week) ?? { posts: 0, views: 0 };
		// A covering report built before reviews were listed leaves the week's reviews unknown
		const reviewsKnown = covering.every(report => !report || report.data.reviews?.list);
		const index = busyness.get(week);
		const evenings = booked.get(week);
		return {
			week,
			...(covered > 0 && { posts: counts.posts, views: counts.views }),
			...(covered > 0 && reviewsKnown && { reviews: reviews.get(week) ?? 0 }),
			...(index && { busyness: round1(mean(index)) }),
			...(evenings && { booked: round1(mean(evenings)) }),
			...(covered > 0 && covered < 7 && { partial: true }),
		};
	});

	return { months: monthRows, weeks: weekRows, branches: [] };
};
