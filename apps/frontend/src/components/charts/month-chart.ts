import type { CalendarMonth } from '#lib/city-calendar.js';

/** `2026-09` → "Sep", or "Sep 26" with the year. */
export const shortMonth = (month: string, withYear = false) =>
	new Date(`${month}-01T00:00:00Z`).toLocaleString('en', {
		month: 'short',
		...(withYear && { year: '2-digit' }),
		timeZone: 'UTC'
	});

const NICE = [1, 2, 2.5, 5, 10];

/** The smallest "round" number at or above `value` (1, 2, 2.5, 5 × a power of ten). */
const niceCeil = (value: number) => {
	if (value <= 0) return 1;
	const power = 10 ** Math.floor(Math.log10(value));
	return NICE.find((n) => n * power >= value)! * power;
};

/**
 * A y range with three round ticks. Counts start at zero; a rating (`zero: false`) frames its
 * values, never spanning less than `minSpan` and never past `ceiling`.
 */
export const niceScale = (
	values: number[],
	{ zero = true, minSpan = 0, ceiling }: { zero?: boolean; minSpan?: number; ceiling?: number } = {}
): { min: number; max: number; ticks: number[] } => {
	if (!values.length) return { min: 0, max: ceiling ?? 1, ticks: [0, (ceiling ?? 1) / 2, ceiling ?? 1] };
	const hi = Math.max(...values);
	if (zero) {
		// Small counts: an even top, so the middle tick is a whole number too
		const small = hi <= 10 && values.every(Number.isInteger);
		const top = small ? Math.max(2, Math.ceil(hi / 2) * 2) : niceCeil(hi);
		const max = ceiling !== undefined ? Math.min(ceiling, top) : top;
		return { min: 0, max, ticks: [0, max / 2, max] };
	}
	const lo = Math.min(...values);
	const span = Math.max(minSpan, hi - lo);
	const mid = (hi + lo) / 2;
	let min = Math.floor((mid - span / 2 - span * 0.1) * 10) / 10;
	let max = Math.ceil((mid + span / 2 + span * 0.1) * 10) / 10;
	if (ceiling !== undefined && max > ceiling) {
		min -= max - ceiling;
		max = ceiling;
	}
	return { min, max, ticks: [min, (min + max) / 2, max] };
};

/** A share 0–1 as a whole percent. */
export const percent = (share: number) => `${Math.round(share * 100)}%`;

/** A stretch of days inside the monthly x axis: a public holiday, school holidays or an event. */
export interface ChartBand {
	/** Index of the month in the chart */
	index: number;
	/** Where it starts and ends inside the month, 0–1 */
	from: number;
	to: number;
	kind: 'holiday' | 'school_holiday' | 'event';
	label: string;
}


const dayOf = (date: string) => Number(date.slice(8, 10));
const daysIn = (month: string) => {
	const [y, m] = month.split('-').map(Number);
	return new Date(Date.UTC(y, m, 0)).getUTCDate();
};

/** The city's holidays and events as bands on the charts' months (`series.calendar`). */
export const calendarBands = (calendar: CalendarMonth[]): ChartBand[] =>
	calendar.flatMap((c, index) => {
		const n = daysIn(c.month);
		const within = (date: string) =>
			date.slice(0, 7) < c.month ? 1 : date.slice(0, 7) > c.month ? n : dayOf(date);
		return [
			...c.events.map((e) => ({
				index,
				from: (within(e.startDate) - 1) / n,
				to: within(e.endDate) / n,
				kind: (e.kind === 'school_holiday' ? 'school_holiday' : 'event') as ChartBand['kind'],
				label: e.name
			})),
			...c.holidays.map((h) => ({
				index,
				from: (dayOf(h.date) - 1) / n,
				to: dayOf(h.date) / n,
				kind: 'holiday' as const,
				label: h.name
			}))
		];
	});
