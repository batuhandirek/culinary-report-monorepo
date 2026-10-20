import type { CityEventKindEnum } from '../entities/city-event.entity.js';

/** A day with this much precipitation is a rain day (the usual meteorological threshold). */
export const RAIN_DAY_MM = 1;
// Weather figures need this share of the month's days fetched
const MIN_WEATHER_SHARE = 0.9;

/** What `monthContext` reads per day. */
export interface ContextDay {
	date: string;
	tMax?: number | null;
	rainMm?: number | null;
	holiday?: string | null;
}

export interface ContextEvent {
	name: string;
	kind: CityEventKindEnum;
	startDate: string;
	endDate: string;
}

/** A month's weather and calendar in the venue's city: why a month may be quiet or loud. */
export interface MonthContext {
	month: string;
	/** Weekends whose Saturday falls in the month */
	weekends: number;
	/** Of those, the ones with rain (≥ 1 mm) on the Saturday or the Sunday; absent without weather */
	rainyWeekends?: number;
	/** Days with rain (≥ 1 mm); absent without weather */
	rainDays?: number;
	/** Mean daily high, °C, one decimal; absent without weather */
	avgTMax?: number;
	/** The month's public holidays, by date */
	holidays: { date: string; name: string }[];
	/** School holidays and events overlapping the month, by start */
	events: ContextEvent[];
}

const daysIn = (month: string): string[] => {
	const [y, m] = month.split('-').map(Number);
	const count = new Date(Date.UTC(y, m, 0)).getUTCDate();
	return Array.from({ length: count }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`);
};

const nextDay = (date: string) => {
	const d = new Date(`${date}T00:00:00Z`);
	d.setUTCDate(d.getUTCDate() + 1);
	return d.toISOString().slice(0, 10);
};

const isRainy = (day: ContextDay | undefined) =>
	day?.rainMm !== null && day?.rainMm !== undefined && day.rainMm >= RAIN_DAY_MM;

/**
 * The month's context from its stored days (the next month's first day too, for a weekend
 * that ends there) and the city's events. Weather figures are absent when under 90 % of the
 * month's days have weather, so a gap never reads as a dry month. Pure.
 */
export const monthContext = (
	month: string,
	days: ContextDay[],
	events: ContextEvent[],
): MonthContext => {
	const byDate = new Map(days.map(d => [d.date, d]));
	const dates = daysIn(month);
	const inMonth = dates.map(date => byDate.get(date));
	const withRain = inMonth.filter(d => d?.rainMm !== null && d?.rainMm !== undefined);
	const withTemp = inMonth.filter(d => d?.tMax !== null && d?.tMax !== undefined);
	const hasWeather = withRain.length >= dates.length * MIN_WEATHER_SHARE;

	const saturdays = dates.filter(date => new Date(`${date}T00:00:00Z`).getUTCDay() === 6);
	const rainyWeekends = saturdays.filter(
		sat => isRainy(byDate.get(sat)) || isRainy(byDate.get(nextDay(sat))),
	).length;

	const first = dates[0];
	const last = dates.at(-1)!;
	return {
		month,
		weekends: saturdays.length,
		...(hasWeather && {
			rainyWeekends,
			rainDays: withRain.filter(isRainy).length,
			...(withTemp.length && {
				avgTMax:
					Math.round((withTemp.reduce((sum, d) => sum + d!.tMax!, 0) / withTemp.length) * 10) / 10,
			}),
		}),
		holidays: inMonth
			.filter((d): d is ContextDay => !!d?.holiday)
			.map(d => ({ date: d.date, name: d.holiday! })),
		events: events
			.filter(e => e.startDate <= last && e.endDate >= first)
			.sort((a, b) => a.startDate.localeCompare(b.startDate))
			.map(({ name, kind, startDate, endDate }) => ({ name, kind, startDate, endDate })),
	};
};
