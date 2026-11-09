// A five-field cron (`minute hour day-of-month month day-of-week`) in words, for the
// Workflows page's schedules: "Every 6 hours, at :00", "Sundays at 06:00". The schedules
// are plain ones; anything this does not read comes back as `undefined` and the page shows
// the cron alone.

const DAYS = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const pad = (n: number) => String(n).padStart(2, '0');
const isNumber = (field: string) => /^\d+$/.test(field);
const isList = (field: string) => /^\d+(,\d+)+$/.test(field);
const step = (field: string) => /^\*\/(\d+)$/.exec(field)?.[1];

const ordinal = (n: number) => {
	const tail = n % 100 >= 11 && n % 100 <= 13 ? 'th' : (['th', 'st', 'nd', 'rd'][n % 10] ?? 'th');
	return `${n}${tail}`;
};

const joinWords = (words: string[]) =>
	words.length < 2 ? words.join('') : `${words.slice(0, -1).join(', ')} and ${words.at(-1)}`;

/** When in the day: "at 06:30", "every hour at :15", "every 6 hours at :00". */
const timeOfDay = (minute: string, hour: string): string | undefined => {
	if (!isNumber(minute)) {
		if (minute === '*' && hour === '*') return 'every minute';
		const everyMinutes = step(minute);
		if (everyMinutes && hour === '*') return `every ${everyMinutes} minutes`;
		return undefined;
	}
	const m = Number(minute);
	if (hour === '*') return `every hour at :${pad(m)}`;
	const everyHours = step(hour);
	if (everyHours) return `every ${everyHours} hours at :${pad(m)}`;
	if (isNumber(hour)) return `at ${pad(Number(hour))}:${pad(m)}`;
	if (isList(hour)) return `at ${joinWords(hour.split(',').map((h) => `${pad(Number(h))}:${pad(m)}`))}`;
	return undefined;
};

/** Which days: "", "Sundays", "on the 1st", "in March". */
const days = (dayOfMonth: string, month: string, dayOfWeek: string): string | undefined => {
	const parts: string[] = [];
	if (dayOfWeek !== '*') {
		const range = /^(\d)-(\d)$/.exec(dayOfWeek);
		if (dayOfWeek === '1-5') parts.push('Weekdays');
		else if (range) parts.push(`${DAYS[Number(range[1]) % 7]} to ${DAYS[Number(range[2]) % 7]}`);
		else if (isNumber(dayOfWeek) || isList(dayOfWeek))
			parts.push(joinWords(dayOfWeek.split(',').map((d) => DAYS[Number(d) % 7])));
		else return undefined;
	}
	if (dayOfMonth !== '*') {
		if (!isNumber(dayOfMonth) && !isList(dayOfMonth)) return undefined;
		parts.push(`on the ${joinWords(dayOfMonth.split(',').map((d) => ordinal(Number(d))))}`);
	}
	if (month !== '*') {
		if (!isNumber(month) && !isList(month)) return undefined;
		parts.push(`in ${joinWords(month.split(',').map((m) => MONTHS[Number(m) - 1] ?? m))}`);
	}
	return parts.join(' ');
};

/** The cron in words, or `undefined` when it is not one this reads. */
export const cronText = (cron: string, timezone?: string): string | undefined => {
	const fields = cron.trim().split(/\s+/);
	if (fields.length !== 5) return undefined;
	const [minute, hour, dayOfMonth, month, dayOfWeek] = fields;
	const time = timeOfDay(minute, hour);
	const when = days(dayOfMonth, month, dayOfWeek);
	if (time === undefined || when === undefined) return undefined;
	const sentence = when ? `${when}, ${time}` : time;
	const zone = timezone && timezone !== 'UTC' ? timezone : 'UTC';
	return `${sentence.charAt(0).toUpperCase()}${sentence.slice(1)} (${zone})`;
};
