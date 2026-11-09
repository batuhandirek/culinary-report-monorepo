import { localParts } from 'src/modules/venues/util/week.js';

// The demand samples run in each city's own evening: the schedule fires every hour (UTC) and a
// city is sampled in the hour its local clock reads 19:00 on a sampling day. Google's live percent
// is read then, near most venues' peak; twice a week is enough, since Google smooths its histogram
// over weeks.
export const DEMAND_SAMPLE_HOUR = 19;
// Thursday and Saturday (0 = Sunday)
export const BUSYNESS_SAMPLE_WEEKDAYS = [4, 6];
// Thursday only: the coming Friday and Saturday evenings are asked one and two days ahead
export const RESERVATION_SAMPLE_WEEKDAY = 4;

/** The samples due for a city at `now` in its time zone; none outside its sampling hour */
export const dueDemandSamples = (
	now: Date,
	timeZone: string,
): { busyness: boolean; reservations: boolean } => {
	const { weekday, hour } = localParts(now, timeZone);
	const inHour = hour === DEMAND_SAMPLE_HOUR;
	return {
		busyness: inHour && BUSYNESS_SAMPLE_WEEKDAYS.includes(weekday),
		reservations: inHour && weekday === RESERVATION_SAMPLE_WEEKDAY,
	};
};
