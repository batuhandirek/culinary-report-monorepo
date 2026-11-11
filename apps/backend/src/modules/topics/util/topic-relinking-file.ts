import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { topicRelinkingFile } from '../constants/topic-relinking.constant.js';
import type {
	TopicRelinkingEntry,
	TopicRelinkingFile,
} from '../interfaces/topic-relinking.interface.js';

import type { TermDecision } from './term-topic-input.js';

/** The file, or null when there is none (nothing to apply) */
export const readTopicRelinking = (): TopicRelinkingFile | null => {
	const file = topicRelinkingFile();
	return existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')) as TopicRelinkingFile) : null;
};

/** Written with its wordings in key order, two-space JSON: reviewed in git like code */
export const writeTopicRelinking = (data: TopicRelinkingFile): void => {
	const file = topicRelinkingFile();
	mkdirSync(path.dirname(file), { recursive: true });
	const terms = Object.fromEntries(
		Object.entries(data.terms).sort(([a], [b]) =>
			a < b ? -1
			: a > b ? 1
			: 0,
		),
	);
	writeFileSync(
		file,
		`${JSON.stringify({ ...data, unanswered: [...data.unanswered].sort(), terms }, null, 2)}\n`,
	);
};

/**
 * A decision as the file keeps it. `decidedAt` null is a wording never decided, which takes
 * `decidedBy` (a name match, else the agent) when the import applies it.
 */
export const relinkingEntry = (
	decidedAt: string | null,
	d: TermDecision,
	decidedBy: 'match' | 'ai' = 'ai',
): TopicRelinkingEntry => {
	const by = decidedAt === null ? { decidedBy } : {};
	return !d.topicKey && !d.modifiers.length && !d.proposedLabel ?
			{ decidedAt, ...by, none: true }
		:	{
				decidedAt,
				...by,
				topic: d.topicKey,
				exact: d.exact,
				...(d.proposedLabel && { proposedLabel: d.proposedLabel }),
				...(d.proposedKind && { proposedKind: d.proposedKind }),
				modifiers: d.modifiers.map(m => ({ topic: m.topicKey, type: m.type })),
			};
};
