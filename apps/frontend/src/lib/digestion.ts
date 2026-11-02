// The Digestion page's wording (`/admin/digestion`): how far the pipeline got with a source, what
// matching made of a place, and where a claim's quote sits in the source's text.

import { PLATFORM_LABELS, SKIP_REASON_LABELS } from '#lib/culinary.js';
import type { BadgeVariant } from '#ui/primitives-new/badge/index.js';

/** A review's platform or a post's */
export const SOURCE_PLATFORM_LABELS: Record<string, string> = {
	...PLATFORM_LABELS,
	google: 'Google',
	tripadvisor: 'TripAdvisor'
};

/** A source's status as a row says it; a skipped post says why */
export const digestionStatusLabel = (status: string, skipReason?: string) =>
	status === 'digested'
		? 'digested'
		: status === 'skipped'
			? `skipped: ${skipReason ? (SKIP_REASON_LABELS[skipReason] ?? skipReason) : 'by the gate'}`
			: 'not read yet';

export const digestionStatusVariant = (status: string): BadgeVariant =>
	status === 'digested' ? 'success' : status === 'skipped' ? 'quiet' : 'outline';

/** How a place a post named was matched (`Mention.matchMethod`) */
export const MATCH_METHOD_LABELS: Record<string, string> = {
	exact: 'exact name',
	fuzzy: 'fuzzy name',
	llm: 'picked by the LLM',
	none: 'no match',
	other_city: 'another city',
	manual: 'by an admin',
	ignored: 'not a venue'
};

export const matchMethodVariant = (method?: string): BadgeVariant =>
	method === 'exact' || method === 'fuzzy' || method === 'llm'
		? 'success'
		: method === 'manual'
			? 'primary'
			: method === 'none'
				? 'warning'
				: 'quiet';

// The backend's rule for a verbatim quote (`statements/util/quotes.ts`): whitespace folded, case
// ignored, quotation marks around it dropped
const QUOTE_MARKS = /^["'„“”«»‘’]+|["'„“”«»‘’]+$/g;

const quotePattern = (quote: string): RegExp | undefined => {
	const words = quote.trim().replace(QUOTE_MARKS, '').trim().split(/\s+/).filter(Boolean);
	if (!words.length || words.join(' ').length < 2) return undefined;
	return new RegExp(words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s+'), 'giu');
};

/** Whether a quote is in one of the source's texts */
export const quoteFound = (quote: string | undefined, texts: (string | undefined)[]) => {
	const pattern = quote ? quotePattern(quote) : undefined;
	return !!pattern && texts.some((text) => !!text && new RegExp(pattern).test(text));
};

/** A text cut into runs, those inside one of the quotes marked */
export const markQuotes = (text: string, quotes: (string | undefined)[]): { text: string; mark: boolean }[] => {
	const ranges: [number, number][] = [];
	for (const quote of quotes) {
		const pattern = quote ? quotePattern(quote) : undefined;
		if (!pattern) continue;
		for (const match of text.matchAll(pattern)) ranges.push([match.index, match.index + match[0].length]);
	}
	if (!ranges.length) return [{ text, mark: false }];
	ranges.sort((a, b) => a[0] - b[0]);
	const merged: [number, number][] = [];
	for (const range of ranges) {
		const last = merged[merged.length - 1];
		if (last && range[0] <= last[1]) last[1] = Math.max(last[1], range[1]);
		else merged.push([...range]);
	}
	const runs: { text: string; mark: boolean }[] = [];
	let at = 0;
	for (const [start, end] of merged) {
		if (start > at) runs.push({ text: text.slice(at, start), mark: false });
		runs.push({ text: text.slice(start, end), mark: true });
		at = end;
	}
	if (at < text.length) runs.push({ text: text.slice(at), mark: false });
	return runs;
};
