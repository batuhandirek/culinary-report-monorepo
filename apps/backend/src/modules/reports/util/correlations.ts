// The relations a report can read from data it already stores: views against new reviews by
// week, complaints by the weekday and hour a review was posted, paid or gifted posts against
// organic ones. Pure functions; the wording says "followed by", never "caused". Each relation is
// absent below its floors, so a thin month shows nothing rather than noise.

import type { PopularTimesHistogram } from 'src/modules/venues/interfaces/venue-details.interface.js';
import { median } from 'src/modules/venues/util/delivery.js';
import { monthRange } from 'src/modules/venues/util/month.js';
import { addDays, localParts, monthWeeks, weekStart } from 'src/modules/venues/util/week.js';

/** Fewer reviews than this (in the window a relation reads) and it is hidden. */
export const CORRELATION_MIN_REVIEWS = 10;
/** Fewer posts by others in the month than this and the post relations are hidden. */
export const CORRELATION_MIN_POSTS = 3;
/** A complaint topic needs this many reviews raising it to be placed in the week. */
export const CORRELATION_MIN_TOPIC_REVIEWS = 3;
/**
 * A topic is placed only where its share of reviews is this many times the share of all
 * written reviews posted then: evenings carry most reviews of any kind, so a plain maximum
 * would always name them.
 */
export const CORRELATION_MIN_LIFT = 1.5;

export interface CorrelationPost {
	postedAt: string;
	views: number;
	promotional: boolean;
}

export interface CorrelationReview {
	publishedAt: string;
	stars?: number | null;
	/** Topics the review criticised; empty for stars only */
	complaints: string[];
	written: boolean;
}

const DAY_KEYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] as const;
const DAY_NAMES: Record<string, string> = {
	Mo: 'Monday',
	Tu: 'Tuesday',
	We: 'Wednesday',
	Th: 'Thursday',
	Fr: 'Friday',
	Sa: 'Saturday',
	Su: 'Sunday',
};

export type Daypart = 'morning' | 'midday' | 'afternoon' | 'evening' | 'night';
const DAYPART_HOURS: Record<Daypart, number[]> = {
	morning: [6, 7, 8, 9, 10],
	midday: [11, 12, 13, 14],
	afternoon: [15, 16, 17],
	evening: [18, 19, 20, 21],
	night: [22, 23, 0, 1, 2, 3, 4, 5],
};
export const daypartOf = (hour: number): Daypart =>
	(Object.keys(DAYPART_HOURS) as Daypart[]).find(part => DAYPART_HOURS[part].includes(hour))!;

const round1 = (n: number) => Math.round(n * 10) / 10;
const fmt = (n: number) => n.toLocaleString('en');
const dayLabel = (day: string) =>
	new Date(`${day}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });

/**
 * The venue's usual new reviews a week: the reviews of the six months before the report month,
 * over the weeks of the months that have any (a month never scraped is unknown, not zero).
 * Null when no month before has one.
 */
export const baselineReviewsPerWeek = (baseline: Pick<CorrelationReview, 'publishedAt'>[]): number | null => {
	const months = new Map<string, number>();
	for (const review of baseline) {
		const month = review.publishedAt.slice(0, 7);
		months.set(month, (months.get(month) ?? 0) + 1);
	}
	if (months.size === 0) return null;
	let weeks = 0;
	for (const month of months.keys()) {
		const { start, end } = monthRange(month);
		weeks += (end.getTime() - start.getTime()) / (7 * 86_400_000);
	}
	return round1([...months.values()].reduce((a, b) => a + b, 0) / weeks);
};

export interface BuzzWeek {
	/** The week's Monday, `YYYY-MM-DD` (city time) */
	week: string;
	posts: number;
	views: number;
	reviews: number;
}

export interface BuzzToReviews {
	weeks: BuzzWeek[];
	/** The usual new reviews a week, from the six months before */
	baselinePerWeek: number;
	/** The month's week with the most views */
	peakWeek: string;
	/** The week read after it: the next one, or the same when the next lies outside the data */
	followingWeek: string;
	followingReviews: number;
	/** `followingReviews / baselinePerWeek` */
	ratio: number;
	sentence: string;
}

/**
 * Views by week next to new Google reviews by week, and the reviews in the week after the
 * month's most viewed week against the venue's usual pace. `reviews` may run past the month
 * (the week after it); weeks are the month's, by the city's calendar. Null below the floors
 * (10 reviews in the month, 3 posts) or without a baseline.
 */
export const buzzToReviews = (input: {
	month: string;
	timeZone: string;
	posts: CorrelationPost[];
	reviews: Pick<CorrelationReview, 'publishedAt'>[];
	baseline: Pick<CorrelationReview, 'publishedAt'>[];
}): BuzzToReviews | null => {
	const inMonth = input.reviews.filter(r => r.publishedAt.slice(0, 7) === input.month);
	if (inMonth.length < CORRELATION_MIN_REVIEWS || input.posts.length < CORRELATION_MIN_POSTS) return null;
	const baselinePerWeek = baselineReviewsPerWeek(input.baseline);
	if (!baselinePerWeek) return null;

	const weeks = monthWeeks(input.month);
	const nextWeek = addDays(weeks.at(-1)!, 7);
	const rows = new Map<string, BuzzWeek>(
		[...weeks, nextWeek].map(week => [week, { week, posts: 0, views: 0, reviews: 0 }]),
	);
	for (const post of input.posts) {
		const row = rows.get(weekStart(new Date(post.postedAt), input.timeZone));
		if (!row) continue;
		row.posts++;
		row.views += post.views;
	}
	for (const review of input.reviews) {
		const row = rows.get(weekStart(new Date(review.publishedAt), input.timeZone));
		if (row) row.reviews++;
	}
	const monthRows = weeks.map(week => rows.get(week)!);
	const peak = monthRows.reduce((best, row) => (row.views > best.views ? row : best));
	// The week after the peak, when the data reaches it: reviews are scraped up to the run day
	const lastReview = input.reviews.map(r => r.publishedAt).sort().at(-1)!;
	const after = addDays(peak.week, 7);
	const following =
		rows.get(after) && lastReview.slice(0, 10) >= addDays(after, 6) ? rows.get(after)! : peak;
	const ratio = round1(following.reviews / baselinePerWeek);

	const one = peak.posts === 1;
	const when = following === peak ? 'that same week' : 'the week after';
	const pace =
		ratio >= 1.2
			? `${ratio}× your usual ${baselinePerWeek} a week`
			: ratio <= 0.8
				? `fewer than your usual ${baselinePerWeek} a week`
				: `about your usual ${baselinePerWeek} a week`;
	return {
		weeks: monthRows,
		baselinePerWeek,
		peakWeek: peak.week,
		followingWeek: following.week,
		followingReviews: following.reviews,
		ratio,
		sentence:
			`The ${peak.posts} post${one ? '' : 's'} in the week of ${dayLabel(peak.week)} ` +
			`(${fmt(peak.views)} views) ${one ? 'was' : 'were'} followed by ${following.reviews} new Google ` +
			`review${following.reviews === 1 ? '' : 's'} ${when}, ${pace}.`,
	};
};

export interface ComplaintTime {
	topic: string;
	/** Reviews raising it in the window */
	reviews: number;
	/** `Mo` … `Su`, and the part of the day where they gather most against all reviews */
	day: string;
	daypart: Daypart;
	/** How many of them fell there (3 at least) */
	there: number;
	/** Share of all written reviews posted then, 0–1: the usual share the topic is read against */
	usualShare: number;
	/** Google's usual busyness then, 0–100 of the venue's peak; absent without popular times */
	busyness?: number;
}

export interface ComplaintTimes {
	/** Written reviews in the window (the report month and the five before) */
	written: number;
	/** Written reviews with a complaint, by weekday (`Mo` first) × hour, city time */
	matrix: number[][];
	topics: ComplaintTime[];
	/** About the most raised topic */
	sentence: string;
}

/**
 * Where in the week complaints come from, by the time a review was posted (a proxy for the
 * visit): a weekday × hour matrix and, per topic raised by 3+ reviews, the day and part of day
 * where 3+ of them gather at 1.5× or more the share of all written reviews posted then, next to
 * Google's popular times there when known. Null below 10 written reviews or without such a topic.
 */
export const complaintTimes = (input: {
	timeZone: string;
	reviews: CorrelationReview[];
	histogram?: PopularTimesHistogram | null;
}): ComplaintTimes | null => {
	const written = input.reviews.filter(r => r.written);
	if (written.length < CORRELATION_MIN_REVIEWS) return null;
	const matrix = Array.from({ length: 7 }, () => Array<number>(24).fill(0));
	const cells = new Map<string, Map<string, number>>();
	const totals = new Map<string, number>();
	const all = new Map<string, number>();
	for (const review of written) {
		const { weekday, hour } = localParts(new Date(review.publishedAt), input.timeZone);
		const cell = `${DAY_KEYS[weekday]}|${daypartOf(hour)}`;
		all.set(cell, (all.get(cell) ?? 0) + 1);
		if (review.complaints.length === 0) continue;
		matrix[(weekday + 6) % 7][hour]++;
		for (const topic of new Set(review.complaints)) {
			totals.set(topic, (totals.get(topic) ?? 0) + 1);
			const byCell = cells.get(topic) ?? new Map<string, number>();
			byCell.set(cell, (byCell.get(cell) ?? 0) + 1);
			cells.set(topic, byCell);
		}
	}
	const topics: ComplaintTime[] = [];
	for (const [topic, reviews] of [...totals].sort((a, b) => b[1] - a[1])) {
		if (reviews < CORRELATION_MIN_TOPIC_REVIEWS) continue;
		// The cell where the topic gathers most against all reviews posted then, by lift
		const lift = ([cell, n]: [string, number]) => n / reviews / ((all.get(cell) ?? 1) / written.length);
		const best = [...cells.get(topic)!]
			.filter(([, n]) => n >= CORRELATION_MIN_TOPIC_REVIEWS)
			.sort((a, b) => lift(b) - lift(a) || b[1] - a[1])[0];
		if (!best || lift(best) < CORRELATION_MIN_LIFT) continue;
		const [cell, there] = best;
		const usualShare = Math.round(((all.get(cell) ?? 0) / written.length) * 100) / 100;
		const [day, daypart] = cell.split('|') as [string, Daypart];
		const hours = (input.histogram?.[day as keyof PopularTimesHistogram] ?? []).filter(h =>
			DAYPART_HOURS[daypart].includes(h.hour),
		);
		const busyness = hours.length
			? Math.round(Math.max(...hours.map(h => h.occupancyPercent)))
			: undefined;
		topics.push({ topic, reviews, day, daypart, there, usualShare, ...(busyness !== undefined && { busyness }) });
	}
	if (topics.length === 0) return null;
	const top = topics[0];
	const busy = top.busyness !== undefined ? `, when Google shows you at ${top.busyness} % of your peak` : '';
	return {
		written: written.length,
		matrix,
		topics,
		sentence:
			`Of the ${top.reviews} reviews criticising ${top.topic}, ${top.there} were posted on ` +
			`${DAY_NAMES[top.day]} ${top.daypart === 'night' ? 'nights' : `${top.daypart}s`}, which carry ` +
			`${Math.round(top.usualShare * 100)} % of all your reviews${busy}.`,
	};
};

export interface PostGroupOutcome {
	posts: number;
	medianViews: number;
	/** New reviews in the seven days after a post, on average */
	reviewsAfter: number;
}

export interface PaidVsOrganic {
	paid: PostGroupOutcome;
	organic: PostGroupOutcome;
	/** The usual new reviews a week, for scale */
	baselinePerWeek?: number;
	sentence: string;
}

const outcome = (posts: CorrelationPost[], reviewTimes: number[]): PostGroupOutcome => ({
	posts: posts.length,
	medianViews: Math.round(median(posts.map(p => p.views)) ?? 0),
	reviewsAfter: round1(
		posts.reduce((sum, post) => {
			const t = new Date(post.postedAt).getTime();
			return sum + reviewTimes.filter(r => r > t && r <= t + 7 * 86_400_000).length;
		}, 0) / posts.length,
	),
});

/**
 * Paid or gifted posts against organic ones: median views and the reviews in the week after
 * each. Null below the floors (3 posts, 10 reviews in the month) or without a post in either
 * group.
 */
export const paidVsOrganic = (input: {
	month: string;
	posts: CorrelationPost[];
	reviews: Pick<CorrelationReview, 'publishedAt'>[];
	baseline: Pick<CorrelationReview, 'publishedAt'>[];
}): PaidVsOrganic | null => {
	const inMonth = input.reviews.filter(r => r.publishedAt.slice(0, 7) === input.month);
	if (inMonth.length < CORRELATION_MIN_REVIEWS || input.posts.length < CORRELATION_MIN_POSTS) return null;
	const paidPosts = input.posts.filter(p => p.promotional);
	const organicPosts = input.posts.filter(p => !p.promotional);
	if (paidPosts.length === 0 || organicPosts.length === 0) return null;
	const times = input.reviews.map(r => new Date(r.publishedAt).getTime());
	const paid = outcome(paidPosts, times);
	const organic = outcome(organicPosts, times);
	const baselinePerWeek = baselineReviewsPerWeek(input.baseline);
	return {
		paid,
		organic,
		...(baselinePerWeek !== null && { baselinePerWeek }),
		sentence:
			`Paid or gifted posts (${paid.posts}) drew a median ${fmt(paid.medianViews)} views against ` +
			`${fmt(organic.medianViews)} for organic ones (${organic.posts}); the week after a paid post ` +
			`was followed by ${paid.reviewsAfter} new reviews on average, after an organic one ${organic.reviewsAfter}.`,
	};
};
