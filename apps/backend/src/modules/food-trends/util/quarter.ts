// Pure: calendar quarters as the food trends page names them, `YYYY-qN` (UTC).

const QUARTER = /^(\d{4})-q([1-4])$/;

/** The quarter's three months, `YYYY-MM`, oldest first. */
export const quarterMonths = (quarter: string): string[] => {
	const match = QUARTER.exec(quarter);
	if (!match) throw new Error(`Not a quarter: ${quarter}`);
	const [year, q] = [Number(match[1]), Number(match[2])];
	return [1, 2, 3].map(i => `${year}-${String((q - 1) * 3 + i).padStart(2, '0')}`);
};

/** The quarter a month is in. */
export const quarterOf = (month: string): string => {
	const [year, m] = month.split('-').map(Number);
	return `${year}-q${Math.ceil(m / 3)}`;
};

/** The quarter `n` quarters before (`n` = 4: the same quarter a year earlier). */
export const quarterBefore = (quarter: string, n = 1): string => {
	const first = quarterMonths(quarter)[0];
	const d = new Date(`${first}-01T00:00:00Z`);
	d.setUTCMonth(d.getUTCMonth() - 3 * n);
	return quarterOf(d.toISOString().slice(0, 7));
};

/** When the quarter is over: the first day of the next one, UTC. */
export const quarterEnd = (quarter: string): Date => {
	const last = quarterMonths(quarter)[2];
	const d = new Date(`${last}-01T00:00:00Z`);
	d.setUTCMonth(d.getUTCMonth() + 1);
	return d;
};

/** The last quarter that is over at `now`. */
export const lastQuarter = (now = new Date()): string =>
	quarterBefore(quarterOf(now.toISOString().slice(0, 7)));
