// Pure: the SQL of a search by meaning over claims. The HNSW index covers the vectors' first
// `CLUSTER_DIMENSIONS` values (a third of the size of one over the whole vector); a search picks
// its candidates by that prefix and orders them by the whole vector. Cosine distance ignores
// length, so the prefix needs no renormalising.

import { toVectorLiteral } from 'src/shared/util/vector.js';

import { CLUSTER_DIMENSIONS, NEAR_CANDIDATES } from '../constants/embeddings.constant.js';

/**
 * A claim's (`alias`) vector prefix, in the exact shape the index is built on: a query only uses
 * the index when its expression matches, the cast to `halfvec(N)` included
 */
export const embeddingPrefixSql = (alias: string) =>
	`subvector(${alias}.embedding, 1, ${CLUSTER_DIMENSIONS})::halfvec(${CLUSTER_DIMENSIONS})`;

/** Cosine distance from a claim's prefix to a bound prefix (`prefixLiteral`) */
export const prefixDistanceSql = (alias: string) =>
	`${embeddingPrefixSql(alias)} <=> ?::halfvec(${CLUSTER_DIMENSIONS})`;

/** A vector's prefix as the literal `prefixDistanceSql` binds */
export const prefixLiteral = (vector: number[]) =>
	toVectorLiteral(vector.slice(0, CLUSTER_DIMENSIONS));

/** Candidates to pick for a page: `NEAR_CANDIDATES`, or twice the page's end for a deep page */
export const nearCandidates = (offset: number, limit: number) =>
	Math.max(NEAR_CANDIDATES, (offset + limit) * 2);

/**
 * The index scan's settings for one transaction: the candidate list as deep as the pick (pgvector
 * caps `ef_search` at 1,000), and an iterative scan, so rows a filter drops are replaced by the
 * next ones instead of the scan stopping at `ef_search` rows (without it, "August, negative" gave
 * ~2 rows of 50)
 */
export const nearScanSettingsSql = (candidates: number) => [
	`set local hnsw.ef_search = ${Math.min(1_000, Math.max(40, Math.floor(candidates)))}`,
	`set local hnsw.iterative_scan = relaxed_order`,
];
