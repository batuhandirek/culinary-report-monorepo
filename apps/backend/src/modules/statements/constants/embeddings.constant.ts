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
 * with money only after the user said yes to the estimate). Until it is set, the backlog waits
 * and embeds nothing, whatever the nightly run or "Run now" asks; it also waits while the
 * `reread-posts` backlog has posts left, since the re-read rewrites the post claims and their
 * vectors would be paid for and deleted the same night. Set to the day of the yes.
 */
export const STATEMENT_EMBEDDINGS_APPROVED_AT: Date | null = null;

/** The backlog the embeddings wait for: it rewrites the post claims */
export const EMBEDDINGS_WAIT_FOR_BACKLOG = 'reread-posts';

/** "Missing aspects" (`StatementClusterService`): what a cluster needs to be shown */
export const CLUSTER_FLOORS = {
	/** Cosine a claim needs with a cluster's centroid; tuned on dev Berlin once it is embedded */
	threshold: 0.82,
	minClaims: 5,
	minSources: 3,
	/** The city counts as its own brand for a claim about the city */
	minBrands: 2,
};

/**
 * The clustering reads each vector's first 256 values, renormalised: text-embedding-3 is trained
 * so a prefix is a shorter embedding of its own (what OpenAI's `dimensions` returns), and a greedy
 * pass over a Berlin month (~7,000 claims, many alone) took ~12 s at 1024 against ~3 s at 256.
 */
export const CLUSTER_DIMENSIONS = 256;

/** Claims a scope clusters at most, taken in a fixed pseudo-random order (a quarter of Berlin holds ~20,000) */
export const CLUSTER_MAX_CLAIMS = 6_000;

/** Clusters labelled by the suggestion agent (one mini call each), the largest first */
export const CLUSTER_MAX_LABELLED = 30;

/** Samples a cluster shows, one per sub-cluster at the tighter threshold, so not five paraphrases */
export const CLUSTER_SAMPLES = 5;
export const CLUSTER_SAMPLE_THRESHOLD = 0.92;

/** How long a scope's clusters are served from memory before they are worked out again */
export const CLUSTER_CACHE_MS = 6 * 60 * 60_000;
export const CLUSTER_CACHE_SCOPES = 20;
