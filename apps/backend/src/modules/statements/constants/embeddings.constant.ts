/**
 * A claim's vector: `text-embedding-3-large` shortened by OpenAI's `dimensions` to 1024 (at 1024 it
 * still ranks above the small model at 1536), stored as `Statement.embedding` `halfvec(1024)`.
 */
export const STATEMENT_EMBEDDING_DIMENSIONS = 1024;

/** Claims a `statement-embeddings` backlog batch embeds, most recent month first */
export const EMBEDDING_BATCH_CLAIMS = 2_000;

/** Claims a request to OpenAI carries (it takes up to 2,048 inputs) */
export const EMBEDDING_REQUEST_CLAIMS = 1_000;

/**
 * The user's yes to the first drain of `statement-embeddings`, a spend (POC rule: data is re-read
 * with money only after the user said yes to the estimate): 2026-11-02, ~$0.08 for every claim,
 * now rather than after the re-read, to find the aspect list's gaps (aspect discovery) on the
 * claims there are. Until it is set the backlog embeds nothing. A claim a re-read rewrites is a
 * new claim, embedded the next night (cents).
 */
export const STATEMENT_EMBEDDINGS_APPROVED_AT: Date | null = new Date('2026-11-02');

/**
 * The grouping (Explore, aspect discovery) reads each vector's first 256 values, renormalised: text-embedding-3 is trained
 * so a prefix is a shorter embedding of its own (what OpenAI's `dimensions` returns), and a greedy
 * pass over a Berlin month (~7,000 claims, many alone) took ~12 s at 1024 against ~3 s at 256.
 */
export const CLUSTER_DIMENSIONS = 256;

/** Claims Explore's grouping reads at most, in a fixed pseudo-random order (`md5(id)`) */
export const CLUSTER_MAX_CLAIMS = 6_000;

/** A group's samples are one per sub-cluster at this tighter cosine, so not five paraphrases */
export const CLUSTER_SAMPLE_THRESHOLD = 0.92;
