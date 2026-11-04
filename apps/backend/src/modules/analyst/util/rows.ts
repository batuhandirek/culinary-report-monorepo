export type Cell = string | number | boolean | null;

/** A value as the page and the model read it: dates as ISO, objects as JSON, long text cut */
export const cellOf = (value: unknown, maxChars: number): Cell => {
	if (value === null || value === undefined) return null;
	if (typeof value === 'number' || typeof value === 'boolean') return value;
	if (typeof value === 'bigint') return Number(value);
	const text =
		value instanceof Date ? value.toISOString()
		: typeof value === 'string' ? value
		: Buffer.isBuffer(value) ? `<${value.length} bytes>`
		: JSON.stringify(value);
	return text.length > maxChars ? `${text.slice(0, maxChars - 1)}…` : text;
};

/** Rows of objects as columns and arrays; a column is every key any row has, in first-seen order */
export const tableOf = (
	records: Record<string, unknown>[],
	maxChars: number,
): { columns: string[]; rows: Cell[][] } => {
	const columns: string[] = [];
	for (const record of records)
		for (const key of Object.keys(record)) if (!columns.includes(key)) columns.push(key);
	return {
		columns,
		rows: records.map(record => columns.map(c => cellOf(record[c], maxChars))),
	};
};

/** The rows the model reads, as compact text: a header line, then one tab-separated line a row */
export const rowsText = (columns: string[], rows: Cell[][]): string =>
	[
		columns.join('\t'),
		...rows.map(r => r.map(c => (c === null ? '∅' : String(c))).join('\t')),
	].join('\n');

/** Postgres type oids pg hands over as text, though they are numbers */
const INT8 = 20;
const NUMERIC = 1700;

/** A numeric value as a number when it is one exactly enough to read (a count, a share) */
const numericOf = (value: unknown, type: number): unknown => {
	if (typeof value !== 'string' || (type !== INT8 && type !== NUMERIC)) return value;
	const n = Number(value);
	if (!Number.isFinite(n)) return value;
	if (type === INT8 && !Number.isSafeInteger(n)) return value;
	return n;
};

/** A result as Postgres gave it (array rows, every column in order), cells made readable */
export const tableOfArrays = (
	columns: string[],
	types: number[],
	rows: unknown[][],
	maxChars: number,
): { columns: string[]; rows: Cell[][] } => ({
	columns,
	rows: rows.map(row => row.map((value, i) => cellOf(numericOf(value, types[i]), maxChars))),
});
