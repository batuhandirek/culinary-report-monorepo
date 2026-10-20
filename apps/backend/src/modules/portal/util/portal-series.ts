import type { ReportData } from 'src/modules/reports/interfaces/report-data.interface.js';
import type { PopularTimesHistogram } from 'src/modules/venues/interfaces/venue-details.interface.js';
import { busiestHour, meanHistogram } from 'src/modules/venues/util/busyness.js';
import { bookedMedian, eveningsBooked, meanBooked } from 'src/modules/venues/util/reservations.js';

import type {
	PortalSeriesMonthOutputDto,
	PortalSeriesOutputDto,
} from '../dto/portal-series.output.dto.js';

/** What the series reads from a stored report. Older reports may lack the newer fields. */
export interface SeriesReport {
	id: string;
	month: string;
	data: Partial<ReportData> & Pick<ReportData, 'month'>;
}

const DISHES_PER_MONTH = 8;

/** `count` months ending with `last`, oldest first, as `YYYY-MM`. */
export const monthWindow = (last: string, count: number): string[] => {
	const [year, month] = last.split('-').map(Number);
	return Array.from({ length: count }, (_, i) => {
		const d = new Date(Date.UTC(year, month - 1 - (count - 1 - i), 1));
		return d.toISOString().slice(0, 7);
	});
};

const emptyMonth = (month: string): PortalSeriesMonthOutputDto => ({
	month,
	reportId: null,
	social: null,
	reviews: null,
	topics: null,
	dishes: null,
	rating: null,
	reviewsCount: null,
	competitors: [],
});

/**
 * A venue's monthly series from its stored reports: no recomputation, no LLM. A month with a
 * report reads it; a month without one but followed by a report reads that report's look back
 * (`previous`: the counts only); the all-time rating comes from every report's rating trend,
 * so months between reports still get one. Every field a stored report may lack is optional.
 */
export const buildSeries = (
	reports: SeriesReport[],
	months: string[],
): PortalSeriesOutputDto => {
	const rows = new Map(months.map(month => [month, emptyMonth(month)]));
	// Oldest build first, so a newer report's figures for a month win
	const sorted = [...reports].sort((a, b) => a.month.localeCompare(b.month));

	for (const report of sorted) {
		const data = report.data;
		for (const point of data.venue?.ratingTrend ?? []) {
			const row = rows.get(point.month);
			if (!row) continue;
			if (point.rating !== undefined) row.rating = point.rating;
			if (point.reviewsCount !== undefined) row.reviewsCount = point.reviewsCount;
		}

		const previous = data.previous;
		const before = previous && rows.get(previous.month);
		if (before && !before.reportId) {
			before.social = {
				posts: previous.social.postCount,
				views: previous.social.views,
				creators: previous.social.creators,
				engagements: previous.social.engagements,
			};
			if (previous.reviews) {
				before.reviews = {
					count: previous.reviews.count,
					written: previous.reviews.written,
					avgStars: previous.reviews.avgStars,
					replyRate: previous.reviews.replyRate,
				};
			}
		}
	}

	for (const report of sorted) {
		const row = rows.get(report.month);
		if (!row) continue;
		const { social, reviews, dishes, venue, competitors } = report.data;
		row.reportId = report.id;
		row.social = social
			? {
					posts: social.postCount,
					views: social.views,
					creators: social.creators,
					engagements: social.engagements,
					sentiment: social.sentiment,
				}
			: null;
		row.reviews = reviews
			? {
					count: reviews.count,
					written: reviews.written,
					avgStars: reviews.avgStars,
					replyRate: reviews.replyRate,
				}
			: null;
		row.topics = reviews ? { praise: reviews.praise ?? {}, complaints: reviews.complaints ?? {} } : null;
		row.dishes = dishes
			? [...dishes]
					.sort((a, b) => b.count - a.count)
					.slice(0, DISHES_PER_MONTH)
					.map(dish => ({ name: dish.name, count: dish.count }))
			: null;
		// The trend's own point for the month wins; else the figures as of the build
		if (row.rating === null && venue?.rating !== undefined) row.rating = venue.rating;
		if (row.reviewsCount === null && venue?.reviewsCount !== undefined)
			row.reviewsCount = venue.reviewsCount;
		row.competitors = (competitors ?? []).map(competitor => ({
			venueId: competitor.venueId,
			name: competitor.name,
			posts: competitor.social.postCount,
			views: competitor.social.views,
			creators: competitor.social.creators,
			reviewsTracked: competitor.reviewsTracked,
			...(competitor.reviewsTracked && {
				reviews: competitor.reviews.count,
				avgStars: competitor.reviews.avgStars,
				replyRate: competitor.reviews.replyRate,
			}),
			rating: competitor.rating,
		}));
	}

	const series = [...rows.values()];
	const names = new Map<string, string>();
	for (const row of series)
		for (const competitor of row.competitors) names.set(competitor.venueId, competitor.name);
	return {
		months: series,
		competitors: [...names]
			.map(([venueId, name]) => ({ venueId, name }))
			.sort((a, b) => a.name.localeCompare(b.name)),
		// The city's calendar is not in reports: `PortalService.series` adds it
		calendar: [],
	};
};

/** What the series reads from an own-account snapshot (`SocialAccountSnapshot`). */
export interface SeriesAccountSnapshot {
	month: string;
	platform: 'tiktok' | 'instagram';
	handle: string;
	followers?: number | null;
	posts?: number | null;
	avgViews?: number | null;
}

/**
 * Joins the own accounts' snapshots to the series' months: each month lists its accounts by
 * platform and handle. A month without a snapshot gets no `ownAccounts`. Mutates and returns
 * `series`.
 */
export const addOwnAccounts = (
	series: PortalSeriesOutputDto,
	snapshots: SeriesAccountSnapshot[],
): PortalSeriesOutputDto => {
	for (const row of series.months) {
		const month = snapshots
			.filter(s => s.month === row.month)
			.sort((a, b) => `${a.platform}:${a.handle}`.localeCompare(`${b.platform}:${b.handle}`));
		if (!month.length) continue;
		row.ownAccounts = month.map(s => ({
			platform: s.platform,
			handle: s.handle,
			...(s.followers != null && { followers: s.followers }),
			...(s.posts != null && { posts: s.posts }),
			...(s.avgViews != null && { avgViews: s.avgViews }),
		}));
	}
	return series;
};

/** What the series reads from a reservation sample (`VenueReservationSample`). */
export interface SeriesReservationSample {
	venueId: string;
	forDate: string;
	sampledAt: Date;
	slotsOpen: number;
	slotsAsked: number;
}

/**
 * Joins open-table samples to the series' months (by the evening's date): the venue's booked-out
 * share, each competitor's in the month's competitor rows, and the median of the district's other
 * venues sampled on the venue's evenings (`districtEvenings`, at least 5 venues). A month without
 * samples gets nothing, never zero. Mutates and returns `series`.
 */
export const addBooked = (
	series: PortalSeriesOutputDto,
	venueId: string,
	samples: SeriesReservationSample[],
	districtEvenings: { venueId: string; forDate: string; booked: number }[],
): PortalSeriesOutputDto => {
	const monthOf = (s: { forDate: string }) => s.forDate.slice(0, 7);
	for (const row of series.months) {
		const own = meanBooked(eveningsBooked(samples.filter(s => s.venueId === venueId && monthOf(s) === row.month)));
		if (own !== null) row.booked = own;
		for (const competitor of row.competitors) {
			const booked = meanBooked(
				eveningsBooked(samples.filter(s => s.venueId === competitor.venueId && monthOf(s) === row.month)),
			);
			if (booked !== null) competitor.booked = booked;
		}
		const district = own !== null ? bookedMedian(districtEvenings.filter(e => monthOf(e) === row.month)) : null;
		if (district) row.districtBooked = district.median;
	}
	return series;
};

/** What the series reads from a busyness sample (`VenueBusyness`). */
export interface SeriesBusynessSample {
	sampledAt: Date;
	busynessIndex?: number | null;
	histogram?: PopularTimesHistogram | null;
}

/**
 * Joins the busyness samples to the series' months (UTC, as reports are): the mean index of the
 * month's samples with popular times, and the busiest hour of their mean histogram. A month
 * without such a sample gets no `busyness`. Mutates and returns `series`.
 */
export const addBusyness = (
	series: PortalSeriesOutputDto,
	samples: SeriesBusynessSample[],
): PortalSeriesOutputDto => {
	const byMonth = new Map<string, SeriesBusynessSample[]>();
	for (const sample of samples) {
		if (sample.busynessIndex == null) continue;
		const month = sample.sampledAt.toISOString().slice(0, 7);
		byMonth.set(month, [...(byMonth.get(month) ?? []), sample]);
	}
	for (const row of series.months) {
		const month = byMonth.get(row.month);
		if (!month) continue;
		const index = month.reduce((sum, s) => sum + s.busynessIndex!, 0) / month.length;
		const peak = busiestHour(meanHistogram(month.map(s => s.histogram)));
		row.busyness = {
			index: Math.round(index * 10) / 10,
			samples: month.length,
			...(peak && { peakDay: peak.day, peakHour: peak.hour }),
		};
	}
	return series;
};
