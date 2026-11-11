import path from 'node:path';

import type { LlmModelId } from 'src/modules/llm/constants/llm-models.constant.js';

/**
 * Where the converted decisions travel from the machine that paid for them to every database that
 * applies them: `tmp/topic-relinking/` at the repo root, committed, so a build ships it. Not the
 * system `/tmp`. `TOPIC_RELINKING_DIR` points a test at its own folder.
 */
export const topicRelinkingDir = () =>
	process.env.TOPIC_RELINKING_DIR ??
	path.resolve(import.meta.dirname, '..', '..', '..', '..', '..', '..', 'tmp', 'topic-relinking');

export const topicRelinkingFile = () => path.join(topicRelinkingDir(), 'terms.json');

/** The model the conversion runs on (the user's call, 2026-11-10: Haiku, ~$0.0003 a wording) */
export const TOPIC_RELINKING_MODEL: LlmModelId = 'anthropic/claude-haiku-5-5';

/** Wordings asked side by side, one a call */
export const TOPIC_RELINKING_CONCURRENCY = 12;

/** Answers between two saves of the file, so a run that dies keeps what it paid for */
export const TOPIC_RELINKING_SAVE_EVERY = 250;

/** `decided_at` as text, exact to the microsecond: what an entry is matched against */
export const DECIDED_AT_SQL = (column: string) =>
	`to_char(${column} at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;
