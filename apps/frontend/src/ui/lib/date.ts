import dayjs, { type ConfigType } from 'dayjs';

/**
 * The date shapes the public pages show. One name per shape, so "6 October" on one page is
 * not "06.10.2026" on the next. dayjs keeps its default English locale.
 *
 * The admin keeps its own denser stamp (`MMM DD YYYY, HH:mm`) on purpose.
 */
export const DATE_FORMATS = {
	/** 6 October 2026 — a date that stands on its own (verified on, member since). */
	day: 'D MMMM YYYY',
	/** 6 Eki — tight spots: a row, a chip. */
	dayShort: 'D MMM',
	/** 6 Ekim, 14:30 — an event this year (shipped, paid, a deadline). */
	dayTime: 'D MMMM, HH:mm',
	/** 6 Eki 2026, 14:30 — an event that may be from another year. */
	dayTimeYear: 'D MMM YYYY, HH:mm',
	/** 14:30 — a message stamp. */
	time: 'HH:mm',
	/** Ekim 2026 — "üye: Ekim 2026". */
	monthYear: 'MMMM YYYY',
	/** 06.10.2026 — forms and legal text. */
	numeric: 'DD.MM.YYYY'
} as const;

export type DateFormat = keyof typeof DATE_FORMATS;

/** `''` for a missing or unparsable date, so a template never prints "Invalid Date". */
export const formatDate = (date: ConfigType | null, format: DateFormat = 'day') => {
	if (date === null || date === undefined || date === '') return '';
	const parsed = dayjs(date);
	return parsed.isValid() ? parsed.format(DATE_FORMATS[format]) : '';
};

/**
 * How long ago, the way a person would say it: "az önce", "5 dk önce", "3 sa önce",
 * "dün", "4 gün önce" — and from a week on the date itself ("6 Eki", with the year once
 * it is not this one), because "37 gün önce" makes the reader do the arithmetic.
 */
export const formatRelativeDate = (date: ConfigType | null, now: ConfigType = undefined) => {
	if (date === null || date === undefined || date === '') return '';
	const then = dayjs(date);
	if (!then.isValid()) return '';

	const current = dayjs(now);
	const minutes = current.diff(then, 'minute');
	if (minutes < 1) return 'az önce';
	if (minutes < 60) return `${minutes} dk önce`;

	const hours = current.diff(then, 'hour');
	if (hours < 24) return `${hours} sa önce`;

	const days = current.startOf('day').diff(then.startOf('day'), 'day');
	if (days <= 1) return 'dün';
	if (days < 7) return `${days} gün önce`;

	return then.format(current.isSame(then, 'year') ? 'D MMM' : 'D MMM YYYY');
};
