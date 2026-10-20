import { ReservationPlatformEnum } from '../entities/venue-reservation-sample.entity.js';

import { addDays, localParts } from './week.js';

// The evening a sample asks about: 18:00 to 22:00 local, in quarter hours (16 slots). A slot
// is open when a table for the party can be booked starting then.
export const EVENING_FROM_MINUTES = 18 * 60;
export const EVENING_TO_MINUTES = 22 * 60;
export const SLOT_MINUTES = 15;
export const EVENING_SLOTS = (EVENING_TO_MINUTES - EVENING_FROM_MINUTES) / SLOT_MINUTES;
export const RESERVATION_PARTY_SIZE = 2;

/**
 * The merchant id of a Google booking page (Reserve with Google): the `c/<id>` segment of
 * `google.com/maps/reserve/v/dine/c/<id>?…` (the link Google Maps gives), or the `c` parameter
 * of `…/maps/reserve/dine?c=<id>`. Every other parameter of the stored link is session noise.
 */
export const googleReserveMerchantId = (url: string | null | undefined): string | null => {
	if (!url) return null;
	let parsed: URL;
	try {
		parsed = new URL(url);
	} catch {
		return null;
	}
	if (!/(^|\.)google\.[a-z.]+$/i.test(parsed.hostname) || !parsed.pathname.startsWith('/maps/reserve')) return null;
	const id = /\/c\/([\w-]+)/.exec(parsed.pathname)?.[1] ?? parsed.searchParams.get('c');
	return id && /^[\w-]+$/.test(id) ? id : null;
};

/** The booking platform a reservation link or website points to; null when we can't sample it. */
export const reservationPlatformOf = (url: string | null | undefined): ReservationPlatformEnum | null => {
	if (!url) return null;
	let host: string;
	try {
		host = new URL(url).hostname.toLowerCase();
	} catch {
		return null;
	}
	// TheFork runs on its own domains and on the former LaFourchette / ElTenedor ones
	if (/(^|\.)(thefork|lafourchette|eltenedor)\.[a-z.]+$/.test(host)) return ReservationPlatformEnum.THEFORK;
	if (/(^|\.)opentable\.[a-z.]+$/.test(host)) return ReservationPlatformEnum.OPENTABLE;
	if (googleReserveMerchantId(url)) return ReservationPlatformEnum.GOOGLE;
	return null;
};

/**
 * The link a venue's open tables are sampled from: the hand-set `bookingUrl`, Google's reservation
 * link, then the website, the first one on a platform we can sample.
 */
export const reservationUrlOf = (
	venue: { bookingUrl?: string | null; website?: string | null; details?: { reserveTableUrl?: string | null } | null },
): string | null =>
	[venue.bookingUrl, venue.details?.reserveTableUrl, venue.website].find(u => reservationPlatformOf(u)) ?? null;

const eveningStarts = (): number[] =>
	Array.from({ length: EVENING_SLOTS }, (_, i) => EVENING_FROM_MINUTES + i * SLOT_MINUTES);

/**
 * Open evening slots from bookable windows in minutes after midnight, as TheFork's
 * `bookable_intervals` gives them (`{ start: 1140, end: 1290 }`: 19:00 to 21:30, both bookable).
 */
export const openSlotsInIntervals = (intervals: { start: number; end: number }[]): number =>
	eveningStarts().filter(t => intervals.some(i => i.start <= t && t <= i.end)).length;

/** Open evening slots from bookable start times (`HH:MM`), each rounded down to its quarter hour. */
export const openSlotsAtTimes = (times: string[]): number => {
	const starts = new Set<number>();
	for (const time of times) {
		const m = /^(\d{1,2}):(\d{2})/.exec(time);
		if (!m) continue;
		const minutes = Number(m[1]) * 60 + Number(m[2]);
		if (minutes >= EVENING_FROM_MINUTES && minutes < EVENING_TO_MINUTES)
			starts.add(minutes - (minutes % SLOT_MINUTES));
	}
	return starts.size;
};

/** The coming Friday and Saturday after the local day of `now`, as `YYYY-MM-DD`. */
export const comingWeekendEvenings = (now: Date, timeZone: string): string[] => {
	const { date, weekday } = localParts(now, timeZone);
	const ahead = (target: number) => ((target - weekday + 7) % 7) || 7;
	return [addDays(date, ahead(5)), addDays(date, ahead(6))].sort();
};

/**
 * Each sampled evening's booked-out share (0–100, one decimal) from its latest sample: asked two
 * days ahead beats a week ahead. Oldest evening first.
 */
export const eveningsBooked = (
	samples: { forDate: string; sampledAt: Date; slotsOpen: number; slotsAsked: number }[],
): { date: string; booked: number }[] => {
	const latest = new Map<string, (typeof samples)[number]>();
	for (const s of samples) {
		if (s.slotsAsked <= 0) continue;
		const seen = latest.get(s.forDate);
		if (!seen || s.sampledAt.getTime() > seen.sampledAt.getTime()) latest.set(s.forDate, s);
	}
	return [...latest.values()]
		.sort((a, b) => a.forDate.localeCompare(b.forDate))
		.map(s => ({ date: s.forDate, booked: bookedPercent([s])! }));
};

/** The mean of evenings' booked-out shares, one decimal; null without any. */
export const meanBooked = (evenings: { booked: number }[]): number | null =>
	evenings.length ? Math.round((evenings.reduce((sum, e) => sum + e.booked, 0) / evenings.length) * 10) / 10 : null;

/** The fewest venues a district or city median of booked-out shares is shown for. */
export const BOOKED_MEDIAN_MIN_VENUES = 5;

/**
 * The median of venues' booked-out shares (each venue's mean over its evenings), one decimal, with
 * the venue count; null below `BOOKED_MEDIAN_MIN_VENUES` venues.
 */
export const bookedMedian = (
	rows: { venueId: string; booked: number }[],
): { median: number; venues: number } | null => {
	const byVenue = new Map<string, number[]>();
	for (const r of rows) byVenue.set(r.venueId, [...(byVenue.get(r.venueId) ?? []), r.booked]);
	if (byVenue.size < BOOKED_MEDIAN_MIN_VENUES) return null;
	const means = [...byVenue.values()].map(v => v.reduce((a, b) => a + b, 0) / v.length).sort((a, b) => a - b);
	const mid = Math.floor(means.length / 2);
	const median = means.length % 2 ? means[mid] : (means[mid - 1] + means[mid]) / 2;
	return { median: Math.round(median * 10) / 10, venues: means.length };
};

/**
 * How booked out the sampled evenings were, 0–100 (100: no open slot): the mean of
 * `1 - slotsOpen / slotsAsked` over the samples. Null without samples.
 */
export const bookedPercent = (samples: { slotsOpen: number; slotsAsked: number }[]): number | null => {
	const valid = samples.filter(s => s.slotsAsked > 0);
	if (valid.length === 0) return null;
	const mean = valid.reduce((sum, s) => sum + (1 - Math.min(s.slotsOpen, s.slotsAsked) / s.slotsAsked), 0) / valid.length;
	return Math.round(mean * 1000) / 10;
};
