import { jest } from '@jest/globals';

import type { StatementKind } from '../../constants/kind.constant.js';
import type { Sentiment } from '../../constants/sentiment.constant.js';
import { NO_ASPECT } from '../../util/claim-labels.js';

/** A claim's labels as a test wants the classifier to answer them */
export interface MockLabels {
	sentiment?: Sentiment;
	/** An aspect key; null (or absent): no aspect */
	aspect?: string | null;
	kind?: StatementKind | string;
}

const choice = (option: string) => ({
	type: 'choice' as const,
	choice: option,
	probabilities: { [option]: 1 },
});

/**
 * A `ClaimLabelsClassifier` stub for `{ provide: ClaimLabelsClassifier, useValue: labelsClassifier(...) }`:
 * each claim's labels from `labelsOf(text)`, a claim not answered a neutral opinion about no aspect;
 * the answers as Jev gives them (one option each, sure), free.
 */
export const labelsClassifier = (
	labelsOf: (text: string) => MockLabels | undefined = () => undefined,
) => ({
	decide: jest.fn(async (state: unknown, _context?: unknown) => {
		const { claim } = state as { claim: { text: string } };
		const labels = labelsOf(claim.text) ?? {};
		return {
			answers: {
				sentiment: choice(labels.sentiment ?? 'neutral'),
				aspect: choice(labels.aspect ?? NO_ASPECT),
				kind: choice(labels.kind ?? 'opinion'),
			},
			usage: { totalTokens: 0 },
			model: 'typesafe-ai/mock-model',
			usd: 0,
		};
	}),
});

export type MockLabelsClassifier = ReturnType<typeof labelsClassifier>;
