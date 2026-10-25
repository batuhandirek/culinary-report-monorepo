export const DEFAULT_APP_URL = 'https://munchwerk.com';

const decimals = (amount: number) => (Number.isInteger(amount) ? 0 : 2);

/** A listing price or an offer amount: whole lira. */
export const formatTl = (amount: number) =>
	`₺${amount.toLocaleString('tr-TR', {
		minimumFractionDigits: decimals(amount),
		maximumFractionDigits: 2,
	})}`;

/** Order amounts travel in kuruş. */
export const formatKurus = (kurus: number) => formatTl(kurus / 100);

const DEADLINE = new Intl.DateTimeFormat('tr-TR', {
	day: 'numeric',
	month: 'long',
	weekday: 'long',
	hour: '2-digit',
	minute: '2-digit',
	timeZone: 'Europe/Istanbul',
});

const DAY = new Intl.DateTimeFormat('tr-TR', {
	day: 'numeric',
	month: 'long',
	year: 'numeric',
	timeZone: 'Europe/Istanbul',
});

/** A deadline, to the minute: "8 Ekim Perşembe 14:30". */
export const formatDeadline = (date: Date) => DEADLINE.format(date);

/** A day: "8 Ekim 2026". */
export const formatDay = (date: Date) => DAY.format(date);
