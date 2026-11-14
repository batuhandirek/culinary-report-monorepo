import path from 'node:path';

import type { LlmModelId } from 'src/modules/llm/constants/llm-models.constant.js';

/**
 * Where agent C's answers about the Google categories travel from the machine that paid for them
 * to every database that applies them: `tmp/venue-topics/` at the repo root, committed, so a build
 * ships it. Not the system `/tmp`. `VENUE_TOPICS_DIR` points a test at its own folder.
 */
export const venueTopicsDir = () =>
	process.env.VENUE_TOPICS_DIR ??
	path.resolve(import.meta.dirname, '..', '..', '..', '..', '..', '..', 'tmp', 'venue-topics');

export const venueTopicsFile = () => path.join(venueTopicsDir(), 'results.jsonl');

/** The model the categories are decided on (the user's call, 2026-11-14: Haiku) */
export const VENUE_TOPICS_MODEL: LlmModelId = 'anthropic/claude-haiku-5-5';

/** Categories asked side by side, one a call */
export const VENUE_TOPICS_CONCURRENCY = 12;
