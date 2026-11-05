import { createHash } from 'node:crypto';

/**
 * Picks up to `n` rows in their given (shuffled) order, skipping a row when any of its tags has
 * reached its cap; tags without a cap never block. Rows already `taken` count towards the caps.
 */
export const pickStratified = <T extends U, U>(
	rows: T[],
	n: number,
	tagsOf: (row: U) => string[],
	caps: Record<string, number>,
	taken: U[] = [],
): T[] => {
	const counts = new Map<string, number>();
	const bump = (row: U) =>
		tagsOf(row).forEach(tag => counts.set(tag, (counts.get(tag) ?? 0) + 1));
	taken.forEach(bump);
	const out: T[] = [];
	for (const row of rows) {
		if (out.length >= n) break;
		if (tagsOf(row).some(tag => tag in caps && (counts.get(tag) ?? 0) >= caps[tag])) continue;
		out.push(row);
		bump(row);
	}
	return out;
};

/** A review's language as the sample groups it */
export const languageGroup = (language: string | null | undefined): string => {
	const lang = (language ?? '').toLowerCase().split('-')[0];
	return ['de', 'en', 'tr'].includes(lang) ? lang : 'other';
};

/** A text's length as the sample groups it */
export const lengthGroup = (chars: number): 'short' | 'medium' | 'long' =>
	chars < 80 ? 'short'
	: chars >= 500 ? 'long'
	: 'medium';

/** Share of cases a prompt change may be tuned on; the rest are held back to judge it */
export const TRAIN_SHARE = 0.7;

export type EvalSplit = 'train' | 'test';

/**
 * A case's fixed side: train (read while tuning an agent) or test (held back, only its score is
 * looked at), by a hash of its id so a case never changes side and a new one lands at random.
 */
export const splitOf = (caseId: string): EvalSplit =>
	createHash('sha1').update(`split:${caseId}`).digest().readUInt16BE(0) / 0x10000 < TRAIN_SHARE ?
		'train'
	:	'test';
