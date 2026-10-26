// Calendar helpers in a city's own time zone: weekly buckets for busyness, reservations and the
// report's correlations. Dates are `YYYY-MM-DD` strings of the local calendar.

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** The local date, weekday (0 = Sunday) and hour of an instant in `timeZone`. */
export const localParts = (
	date: Date,
	timeZone: string,
): { date: string; weekday: number; hour: number } => {
	const parts = Object.fromEntries(
		new Intl.DateTimeFormat('en-US', {
			timeZone,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			weekday: 'short',
			hour: '2-digit',
			hourCycle: 'h23',
		})
			.formatToParts(date)
			.map(p => [p.type, p.value]),
	);
	return {
		date: `${parts.year}-${parts.month}-${parts.day}`,
		weekday: WEEKDAYS.indexOf(parts.weekday),
		hour: Number(parts.hour),
	};
};

/** `YYYY-MM-DD` plus `days`, on the calendar (no time zone involved). */
export const addDays = (day: string, days: number): string => {
	const d = new Date(`${day}T12:00:00Z`);
	d.setUTCDate(d.getUTCDate() + days);
	return d.toISOString().slice(0, 10);
};

/** The Monday starting the local week an instant falls in, as `YYYY-MM-DD`. */
export const weekStart = (date: Date, timeZone: string): string => {
	const { date: day, weekday } = localParts(date, timeZone);
	return addDays(day, -((weekday + 6) % 7));
};

/**
 * The weeks touching a month (`YYYY-MM`), by their Mondays: the first holds the 1st, the last
 * the month's last day. A week is counted in both months it spans.
 */
export const monthWeeks = (month: string): string[] => {
	const first = `${month}-01`;
	const firstWeekday = new Date(`${first}T12:00:00Z`).getUTCDay();
	let monday = addDays(first, -((firstWeekday + 6) % 7));
	const weeks: string[] = [];
	while (monday.slice(0, 7) <= month) {
		weeks.push(monday);
		monday = addDays(monday, 7);
	}
	return weeks;
};

/** An instant's day on the local calendar, split out for snapshot rows that SQL groups by. */
export interface CalendarDay {
	/** `YYYY-MM-DD` */
	date: string;
	year: number;
	/** `YYYY-MM`, the month key monthly tables use */
	month: string;
	monthOfYear: number;
	dayOfMonth: number;
	/** 1–366 */
	dayOfYear: number;
	/** ISO 8601 week-numbering year: the last days of December can be week 1 of the next one */
	isoYear: number;
	/** ISO 8601 week, Monday first; week 1 holds the year's first Thursday */
	isoWeek: number;
	/** ISO weekday: 1 = Monday … 7 = Sunday */
	weekday: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** The local calendar day of an instant in `timeZone`, with its year, month, week and weekday. */
export const calendarDay = (at: Date, timeZone: string): CalendarDay => {
	const { date, weekday } = localParts(at, timeZone);
	const [year, monthOfYear, dayOfMonth] = date.split('-').map(Number);
	const day = Date.UTC(year, monthOfYear - 1, dayOfMonth);
	const isoWeekday = weekday === 0 ? 7 : weekday;
	// The Thursday of its ISO week decides the week's year and number
	const thursday = new Date(day + (4 - isoWeekday) * DAY_MS);
	const isoYear = thursday.getUTCFullYear();
	return {
		date,
		year,
		month: date.slice(0, 7),
		monthOfYear,
		dayOfMonth,
		dayOfYear: (day - Date.UTC(year, 0, 1)) / DAY_MS + 1,
		isoYear,
		isoWeek: Math.floor((thursday.getTime() - Date.UTC(isoYear, 0, 1)) / DAY_MS / 7) + 1,
		weekday: isoWeekday,
	};
};
