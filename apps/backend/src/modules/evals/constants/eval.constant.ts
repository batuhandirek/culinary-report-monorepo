import path from 'node:path';

/**
 * `apps/backend/eval`: the cases and runs, in git (this file sits at `{src,dist}/modules/evals/constants`);
 * `EVAL_DIR` puts them elsewhere (the tests' temp folder)
 */
export const evalDir = () =>
	process.env.EVAL_DIR ?? path.resolve(import.meta.dirname, '..', '..', '..', '..', 'eval');
export const casesDir = () => path.join(evalDir(), 'cases');
export const runsDir = () => path.join(evalDir(), 'runs');
/** The run the stored data is scored as */
export const STORED_RUN = 'stored';

/** The one model references and rulings come from: an answer from any other is discarded */
export const REFERENCE_MODEL = 'anthropic/claude-opus-5-5';
/** Room for a long article's claims and the model's thinking */
export const REFERENCE_MAX_OUTPUT_TOKENS = 32_000;
export const REFERENCE_TIMEOUT_MS = 10 * 60_000;
export const REFERENCE_CONCURRENCY = 4;

/** What the collector takes by default */
export const DEFAULT_SAMPLE = { reviews: 150, posts: 150, terms: 500 };

/** Candidates the match reference is shown per place: a wider net than the matcher's five */
export const MATCH_REFERENCE_CANDIDATES = 12;
export const MATCH_REFERENCE_BRANCHES = 15;

export const PLACE_PAIR_SIMILARITY = 0.7;

export { PRICES_PER_MTOK } from 'src/modules/llm/util/llm-cost.js';
