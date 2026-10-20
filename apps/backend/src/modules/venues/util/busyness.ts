import type {
	PopularTimesDay,
	PopularTimesHistogram,
} from '../interfaces/venue-details.interface.js';

/** How many of the week's busiest hours the index averages. */
export const BUSYNESS_TOP_HOURS = 10;

/**
 * A comparable figure for one popular-times histogram: the mean of the week's ten busiest
 * hours, 0–100, one decimal. Google scales each venue's histogram to its own peak, so the index
 * says how full the venue's good hours run relative to its best one; it moves when more of the
 * week gets close to the peak. Null without any hour.
 */
export const busynessIndex = (histogram: PopularTimesHistogram | null | undefined): number | null => {
	const hours = Object.values(histogram ?? {})
		.flatMap(day => day ?? [])
		.map(h => h.occupancyPercent)
		.filter(p => Number.isFinite(p));
	if (hours.length === 0) return null;
	const top = hours.sort((a, b) => b - a).slice(0, BUSYNESS_TOP_HOURS);
	return Math.round((top.reduce((sum, p) => sum + p, 0) / top.length) * 10) / 10;
};

export interface BusiestHour {
	day: PopularTimesDay;
	hour: number;
	percent: number;
}

const DAY_ORDER: PopularTimesDay[] = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

/** The week's busiest hour; the earliest in the week on a tie. Null without any hour. */
export const busiestHour = (histogram: PopularTimesHistogram | null | undefined): BusiestHour | null => {
	let best: BusiestHour | null = null;
	for (const day of DAY_ORDER)
		for (const h of histogram?.[day] ?? [])
			if (!best || h.occupancyPercent > best.percent)
				best = { day, hour: h.hour, percent: h.occupancyPercent };
	return best;
};

/** Hour-by-hour mean of several histograms (a month's samples), per day. */
export const meanHistogram = (
	histograms: (PopularTimesHistogram | null | undefined)[],
): PopularTimesHistogram | null => {
	const sums = new Map<string, { sum: number; n: number }>();
	for (const histogram of histograms)
		for (const day of DAY_ORDER)
			for (const h of histogram?.[day] ?? []) {
				const key = `${day}|${h.hour}`;
				const cell = sums.get(key) ?? { sum: 0, n: 0 };
				cell.sum += h.occupancyPercent;
				cell.n++;
				sums.set(key, cell);
			}
	if (sums.size === 0) return null;
	const out: PopularTimesHistogram = {};
	for (const [key, { sum, n }] of sums) {
		const [day, hour] = key.split('|') as [PopularTimesDay, string];
		(out[day] ??= []).push({ hour: Number(hour), occupancyPercent: Math.round(sum / n) });
	}
	for (const day of DAY_ORDER) out[day]?.sort((a, b) => a.hour - b.hour);
	return out;
};
