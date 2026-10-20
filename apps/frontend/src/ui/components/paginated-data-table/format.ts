// Dates in a data table: one absolute form, one relative form, both in English — the
// table is an operator's tool and must not follow the storefront's `dayjs` locale.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

type DateInput = string | number | Date | null | undefined;

const toDate = (value: DateInput): Date | null => {
	if (value == null || value === '') return null;
	const date = value instanceof Date ? value : new Date(value);
	return Number.isNaN(date.getTime()) ? null : date;
};

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * `06 Oct 2026, 17:48`, or `06 Oct 2026` for `'date'`. `compact` drops the year when it is
 * this one — a column of them reads faster, and the full form belongs in the tooltip.
 * Empty when there is no date.
 */
export const formatAbsolute = (
	value: DateInput,
	format: 'datetime' | 'date' = 'datetime',
	compact = false
) => {
	const date = toDate(value);
	if (!date) return '';
	const sameYear = date.getFullYear() === new Date().getFullYear();
	const day = `${pad(date.getDate())} ${MONTHS[date.getMonth()]}${
		compact && sameYear ? '' : ` ${date.getFullYear()}`
	}`;
	return format === 'date' ? day : `${day}, ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** `17:48`, or `17:48:02` with `seconds`. Empty when there is no date. */
export const formatTime = (value: DateInput, seconds = false) => {
	const date = toDate(value);
	if (!date) return '';
	const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
	return seconds ? `${time}:${pad(date.getSeconds())}` : time;
};

/** `Tue, 06 Oct 2026`: the heading over a day's events. Empty when there is no date. */
export const formatWeekday = (value: DateInput) => {
	const date = toDate(value);
	return date ? `${WEEKDAYS[date.getDay()]}, ${formatAbsolute(date, 'date')}` : '';
};

const UNITS: [limit: number, seconds: number, label: string][] = [
	[60, 1, 's'],
	[3600, 60, 'm'],
	[86400, 3600, 'h'],
	[86400 * 14, 86400, 'd'],
	[86400 * 60, 86400 * 7, 'w'],
	[86400 * 365, 86400 * 30, 'mo'],
	[Infinity, 86400 * 365, 'y']
];

/** `3h ago`, `in 2d`, `just now`. Empty when there is no date. */
export const formatRelative = (value: DateInput, now = Date.now()) => {
	const date = toDate(value);
	if (!date) return '';
	const seconds = Math.round((date.getTime() - now) / 1000);
	const distance = Math.abs(seconds);
	if (distance < 45) return 'just now';
	const [, size, label] = UNITS.find(([limit]) => distance < limit)!;
	const amount = `${Math.max(1, Math.round(distance / size))}${label}`;
	return seconds < 0 ? `${amount} ago` : `in ${amount}`;
};

/** Whether a filter's value narrows the list: a set flag, some text, at least one pick. */
export const isFilterActive = (value: unknown) => {
	if (Array.isArray(value)) return value.length > 0;
	return value != null && value !== '' && value !== false;
};

/** The pager's window: first, last, the current page and its neighbours. */
export const pageWindow = (current: number, total: number): (number | 'gap')[] => {
	if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
	const pages = new Set([1, 2, total - 1, total, current - 1, current, current + 1]);
	const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
	const result: (number | 'gap')[] = [];
	for (const [i, p] of sorted.entries()) {
		if (i > 0 && p - sorted[i - 1] > 1) result.push('gap');
		result.push(p);
	}
	return result;
};

/** A private, mutable copy of a URL's query: `page.url` and its params are read-only. */
export const copySearchParams = (url: { search: string }) => new URLSearchParams(url.search);
