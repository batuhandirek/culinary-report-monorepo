// Dollars, tokens and UTC days as the Money page writes them. The ledger counts in UTC
// days, so the range picker does too.

/** `$12.40`, `$0.0031` for a fraction of a cent, `$0` for nothing. */
export const usd = (n: number | null | undefined) => {
	if (n === null || n === undefined) return '—';
	if (n === 0) return '$0';
	const abs = Math.abs(n);
	const digits = abs < 0.01 ? 4 : 2;
	return `${n < 0 ? '−' : ''}$${abs.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
};

/** `1.2M`, `340K`, `812`. */
export const tokens = (n: number) =>
	Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n);

/** Today as a UTC day, `2026-11-06`. */
export const utcToday = () => new Date().toISOString().slice(0, 10);

/** `day` moved by `days`, in UTC. */
export const addDays = (day: string, days: number) => {
	const date = new Date(`${day}T00:00:00.000Z`);
	date.setUTCDate(date.getUTCDate() + days);
	return date.toISOString().slice(0, 10);
};

/** The first day of `day`'s month. */
export const monthStart = (day: string) => `${day.slice(0, 7)}-01`;

/** The last day of `day`'s month. */
export const monthEnd = (day: string) => addDays(monthStart(addDays(monthStart(day), 32)), -1);

/** Every day from `from` through `to`, both included. */
export const daysBetween = (from: string, to: string) => {
	const days: string[] = [];
	for (let day = from; day <= to && days.length < 400; day = addDays(day, 1)) days.push(day);
	return days;
};
