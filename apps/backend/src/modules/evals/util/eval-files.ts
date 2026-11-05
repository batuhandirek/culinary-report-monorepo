import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { casesDir, runsDir } from '../constants/eval.constant.js';
import type { CaseResult, EvalCase, EvalCaseKind } from '../interfaces/eval-case.interface.js';

const KIND_DIRS: Record<EvalCaseKind, string> = { review: 'reviews', post: 'posts', term: 'terms' };

const readJson = <T>(file: string): T => JSON.parse(readFileSync(file, 'utf8')) as T;
// Two-space JSON with a final newline: one case a file, reviewed in git like code
const writeJson = (file: string, value: unknown) => {
	mkdirSync(path.dirname(file), { recursive: true });
	writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
};

const jsonFiles = (dir: string) =>
	existsSync(dir) ?
		readdirSync(dir)
			.filter(f => f.endsWith('.json'))
			.sort()
	:	[];

export const caseFile = (kind: EvalCaseKind, id: string) =>
	path.join(casesDir(), KIND_DIRS[kind], `${id}.json`);

/** Every case of the kinds asked (all by default), in file-name order */
export const readCases = (kinds: EvalCaseKind[] = ['review', 'post', 'term']): EvalCase[] =>
	kinds.flatMap(kind =>
		jsonFiles(path.join(casesDir(), KIND_DIRS[kind])).map(f =>
			readJson<EvalCase>(path.join(casesDir(), KIND_DIRS[kind], f)),
		),
	);

export const writeCase = (c: EvalCase) => writeJson(caseFile(c.kind, c.id), c);

export const runDir = (label: string) => path.join(runsDir(), label);

export const readResults = (label: string): Map<string, CaseResult> =>
	new Map(
		jsonFiles(path.join(runDir(label), 'results')).map(f => {
			const r = readJson<CaseResult>(path.join(runDir(label), 'results', f));
			return [r.caseId, r];
		}),
	);

export const writeResult = (label: string, r: CaseResult) =>
	writeJson(path.join(runDir(label), 'results', `${r.caseId}.json`), r);

/** A run's cached pairings (claim pairing costs a call; scoring again must not) */
export const readPairings = (label: string): Record<string, [number, number][]> => {
	const file = path.join(runDir(label), 'pairings.json');
	return existsSync(file) ? readJson(file) : {};
};
export const writePairings = (label: string, pairings: Record<string, [number, number][]>) =>
	writeJson(path.join(runDir(label), 'pairings.json'), pairings);

export const writeRunFile = (label: string, name: string, content: string | object) => {
	const file = path.join(runDir(label), name);
	mkdirSync(path.dirname(file), { recursive: true });
	writeFileSync(
		file,
		typeof content === 'string' ? content : `${JSON.stringify(content, null, 2)}\n`,
	);
};

export const readRunJson = <T>(label: string, name: string): T | undefined => {
	const file = path.join(runDir(label), name);
	return existsSync(file) ? readJson<T>(file) : undefined;
};

export const runLabels = (): string[] =>
	existsSync(runsDir()) ?
		readdirSync(runsDir(), { withFileTypes: true })
			.filter(d => d.isDirectory())
			.map(d => d.name)
	:	[];
