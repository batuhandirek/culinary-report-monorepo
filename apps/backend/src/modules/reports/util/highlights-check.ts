// The editor's letter, cards and actions, checked before an owner reads them. Pure.
//
// The one guard kept on the written part (the user's call, 2026-10-28: the model's language is
// trusted): every number in a line is one the model was given (the material and every tool
// answer), the line says none of the brand's banned words, and it names no field of the
// material ("whatMovedAndWhy says…") nor "source:". A failing card or action is dropped, a
// failing sentence of the letter is cut; an empty letter, a failing title or headline gets the
// code-written fallback, so a report is never without its written part.

import { numbersOf, strayNumber } from 'src/shared/util/stated-numbers.js';

import type { ReportHighlights, ReportMonthKind, ReportPoint } from '../interfaces/report-data.interface.js';

import { ANALYSIS_BANNED } from './analysis-check.js';
import type { EditorPack } from './editor-pack.js';
import { packKeys } from './editor-pack.js';

/** The model's answer before the check (`ReportEditorAgent`'s schema). */
export interface EditorAnswer {
	kind: ReportMonthKind;
	title: string;
	headline: string;
	letter: string[];
	attention: ReportPoint[];
	tryThis: ReportPoint[];
	notes: string;
}

/** "source: TikTok" and its kin: the material's shape leaking into the prose. */
const LEAKS = [/\bsource:/i, /\bsources?:\s*(tiktok|instagram|google|blogs?)\b/i];

/** Why a line can't go out, or null when it can. */
export const highlightsLineProblem = (text: string | undefined | null, given: number[], keys: string[]): string | null => {
	const line = text?.trim();
	if (!line) return 'empty';
	const banned = ANALYSIS_BANNED.find(re => re.test(line));
	if (banned) return `says ${line.match(banned)![0]}`;
	const leak = LEAKS.find(re => re.test(line));
	if (leak) return `says "${line.match(leak)![0]}"`;
	const key = keys.find(k => line.includes(k));
	if (key) return `names the input field ${key}`;
	const stray = strayNumber(line, given);
	if (stray !== null) return `states ${stray}, which it was not given`;
	return null;
};

/** A paragraph's sentences, split where one ends and the next begins with a capital, a quote or a handle. */
export const sentencesOf = (paragraph: string): string[] =>
	paragraph
		.trim()
		.split(/(?<=[.!?…]["”’)]?)\s+(?=["“‘(]?(?:@\w|[\p{Lu}\d]))/u)
		.map(s => s.trim())
		.filter(Boolean);

/** The written part code can always produce from the material: the fallback for a failed or empty answer. */
export const fallbackHighlights = (pack: Pick<EditorPack, 'brand' | 'month' | 'inNumbers'>): Omit<ReportHighlights, 'notes' | 'trace'> => {
	const n = pack.inNumbers;
	const parts: string[] = [];
	if (n.postsByOthers !== undefined)
		parts.push(
			n.postsByOthers ?
				`${n.postsByOthers} ${n.postsByOthers === 1 ? 'person' : 'people'} posted about you in ${pack.month}`
			:	`nobody posted about you in ${pack.month}`,
		);
	if (n.reviews !== undefined)
		parts.push(
			n.reviews ?
				`${n.reviews} ${n.reviews === 1 ? 'guest' : 'guests'} reviewed you on Google${n.writtenReviews ? `, ${n.writtenReviews} with words` : ''}`
			:	'no Google review of the month was read',
		);
	const sentence = parts.length ? `${parts.join(', and ')}.` : `Your ${pack.month} at ${pack.brand.name}.`;
	const headline = `${sentence[0].toUpperCase()}${sentence.slice(1)} The figures are in the sections below.`;
	return {
		title: `${pack.month} at ${pack.brand.name}`,
		headline,
		kind: 'quiet',
		letter: [headline],
		highlights: [],
		actions: [],
	};
};

/**
 * The written part an owner may read. `given` is everything the model saw (the material and
 * every tool answer). `answer` null (the agent failed) gives the fallback whole.
 */
export const checkHighlights = (
	answer: EditorAnswer | null,
	pack: EditorPack,
	given: unknown[],
	onProblem: (where: string, problem: string) => void = () => {},
): Omit<ReportHighlights, 'trace'> => {
	const fallback = fallbackHighlights(pack);
	if (!answer) return fallback;
	const numbers = numbersOf(given);
	const keys = packKeys(pack);
	const line = (where: string, text: string | undefined | null): string | undefined => {
		const problem = highlightsLineProblem(text, numbers, keys);
		if (problem) {
			onProblem(where, problem);
			return undefined;
		}
		return text!.trim();
	};
	const cards = (where: string, points: ReportPoint[] | undefined): ReportPoint[] =>
		(points ?? []).flatMap((p, i) => {
			const title = line(`${where} ${i + 1} title`, p.title);
			const text = line(`${where} ${i + 1}`, p.text);
			return title && text ? [{ title, text }] : [];
		});

	const letter = (answer.letter ?? [])
		.map((paragraph, i) =>
			sentencesOf(paragraph)
				.map((s, j) => line(`letter paragraph ${i + 1} sentence ${j + 1}`, s))
				.filter((s): s is string => !!s)
				.join(' '),
		)
		.filter(Boolean);
	if (!letter.length) onProblem('letter', 'empty after the check: the fallback stands in');
	const title = line('title', answer.title);
	const headline = line('headline', answer.headline);
	const kind: ReportMonthKind = answer.kind === 'quiet' ? 'quiet' : 'story';
	return {
		title: title ?? fallback.title,
		headline: headline ?? letter[0] ?? fallback.headline,
		kind,
		letter: letter.length ? letter : fallback.letter,
		highlights: cards('attention', answer.attention),
		actions: cards('try this', answer.tryThis),
		...(answer.notes?.trim() && { notes: answer.notes.trim() }),
	};
};
