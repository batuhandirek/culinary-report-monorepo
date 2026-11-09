import _ from 'lodash';

import type { ClaimLabelAspect } from './claim-labels.js';
import { dot, normalize } from './cluster.js';

/**
 * Aspects offered to the claim-labels classifier for one claim, before their roots are added (the
 * user's call, 2026-11-09: 12, about half the full list's tokens; at 8 the right aspect was missing
 * for 2% of review and 5% of post claims in the eval, almost always a finer aspect just past the
 * 8, never for want of its root)
 */
export const ASPECT_SHORTLIST_SIZE = 12;

/** The text an aspect is embedded by: what the classifier is told it is */
export const aspectEmbeddingText = (aspect: ClaimLabelAspect): string =>
	`${aspect.label}${aspect.root !== aspect.key ? ` (${aspect.rootLabel})` : ''}${aspect.hint ? `: ${aspect.hint}` : ''}`;

/** An aspect with its vector (`aspectEmbeddingText`, embedded once a run) */
export interface AspectVector {
	key: string;
	root: string;
	vector: Float32Array;
}

/** The aspects' vectors, unit length, in the order given */
export const aspectVectors = (
	aspects: ClaimLabelAspect[],
	vectors: ArrayLike<number>[],
): AspectVector[] =>
	aspects.map((a, i) => ({ key: a.key, root: a.root, vector: normalize(vectors[i]) }));

/**
 * The aspects to offer for one claim, to cut what the classifier is sent: the `size` whose
 * description is closest to the claim's text (cosine), then the root of each (so "the root as a
 * whole" stays a choice), in the aspects' order. "No aspect" is always offered by the questions.
 * A shortlist, never a verdict: the classifier still picks.
 */
export const aspectShortlist = (
	claim: ArrayLike<number>,
	aspects: AspectVector[],
	size = ASPECT_SHORTLIST_SIZE,
): string[] => {
	const unit = normalize(claim);
	const closest = _.orderBy(
		aspects.map((a, i) => ({ a, i, cosine: dot(unit, a.vector) })),
		['cosine', 'i'],
		['desc', 'asc'],
	).slice(0, size);
	const keys = new Set(closest.flatMap(({ a }) => [a.key, a.root]));
	return aspects.filter(a => keys.has(a.key)).map(a => a.key);
};
