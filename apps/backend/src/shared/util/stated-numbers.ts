// The numbers a model's line states, and whether each is one it was given. Pure.
//
// Shared by every check that lets an LLM's line out only when its numbers are ours: the front
// page's copy (`landing/util/landing-copy.ts`) and the report analysis (`reports/util/analysis-check.ts`).

export interface StatedNumber {
	value: number;
	/** The step the writing rounds to: 1 for "24", 0.1 for "36.4", 100,000 for "1.4M" */
	step: number;
	/** Written as a plain whole number: must be one of the given numbers exactly */
	exact: boolean;
}

const SCALE: Record<string, number> = { k: 1e3, thousand: 1e3, m: 1e6, million: 1e6 };

/** Numbers always fine in a line: small counts and ranks, a fortnight, a month of days. */
export const ALWAYS_GIVEN = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 14, 30]);

/** The numbers a line states, as written: "1.4M", "591k", "1,378,152", "36%", "10/10". */
export const statedNumbers = (text: string): StatedNumber[] => {
	const out: StatedNumber[] = [];
	const re = /(\d+(?:,\d{3})*(?:\.\d+)?)\s*(k|m|thousand|million)?(?![\p{L}\d])/giu;
	for (const match of text.matchAll(re)) {
		const raw = match[1].replace(/,/g, '');
		const decimals = raw.includes('.') ? raw.split('.')[1].length : 0;
		const scale = match[2] ? SCALE[match[2].toLowerCase()] : 1;
		const value = Number(raw) * scale;
		if (!Number.isFinite(value)) continue;
		out.push({ value, step: 10 ** -decimals * scale, exact: scale === 1 && decimals === 0 });
	}
	return out;
};

/** Every number in a value: an object's or array's leaves, numbers inside strings too. */
export const numbersOf = (value: unknown): number[] => {
	if (typeof value === 'number') return [value];
	if (typeof value === 'string') return statedNumbers(value).map(n => n.value);
	if (Array.isArray(value)) return value.flatMap(numbersOf);
	if (value && typeof value === 'object') return Object.values(value).flatMap(numbersOf);
	return [];
};

/**
 * A stated number is given when it is one of `given`, as written or rounded or cut to its step
 * ("1.4M" or "1.3M" for 1,378,152); small counts and years always are.
 */
export const isGiven = (n: StatedNumber, given: number[]): boolean => {
	if (n.exact && Number.isInteger(n.value) && ALWAYS_GIVEN.has(n.value)) return true;
	if (n.value >= 2000 && n.value <= 2100 && n.exact) return true;
	return given.some(g => {
		if (n.exact && Number.isInteger(g)) return g === n.value;
		const eps = n.step * 1e-6;
		return Math.abs(g - n.value) <= n.step / 2 + eps || (g >= n.value - eps && g < n.value + n.step);
	});
};

/** The first number a line states that it was not given, or null. */
export const strayNumber = (text: string, given: number[]): number | null =>
	statedNumbers(text).find(n => !isGiven(n, given))?.value ?? null;

/** Words in a line. */
export const wordCount = (text: string): number => text.trim().split(/\s+/).filter(Boolean).length;
