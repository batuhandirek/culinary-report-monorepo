import { describe, expect, it } from '@jest/globals';

import type { AspectRef } from 'src/modules/topics/util/topics.js';

import { type ClaimPartsAnswer, claimPartsOf } from '../util/claim-parts-answer.js';

const ROOTS: Record<string, string> = {
	taste: 'food',
	food: 'food',
	other: 'other',
	opening_hours: 'other',
};
const index = {
	aspect: (key: string | null | undefined): AspectRef | undefined =>
		key && ROOTS[key] ? { key, root: ROOTS[key] } : undefined,
};
const answer = (parts: Partial<ClaimPartsAnswer>): ClaimPartsAnswer => ({
	sentiment: 'positive',
	aspect: 'taste',
	foods: [],
	amount: null,
	unit: null,
	kind: 'opinion',
	...parts,
});

/* What a claim stores of agent B's answer: the rules enforced where a quick model breaks them. */
describe('claimPartsOf', () => {
	it('stores the bare root other as no aspect, and its children as they are', () => {
		expect(
			claimPartsOf(answer({ aspect: 'other' }), 'my favourite place', index).aspect,
		).toBeUndefined();
		expect(
			claimPartsOf(answer({ aspect: 'opening_hours' }), 'open late', index).aspect,
		).toEqual({
			key: 'opening_hours',
			root: 'other',
		});
	});

	it('stores a fact that judges as an opinion; a neutral fact stays a fact', () => {
		expect(
			claimPartsOf(
				answer({ kind: 'fact', sentiment: 'negative' }),
				'the fries were forgotten',
				index,
			).kind,
		).toBe('opinion');
		expect(
			claimPartsOf(answer({ kind: 'fact', sentiment: 'neutral' }), 'open until 22', index)
				.kind,
		).toBe('fact');
		expect(
			claimPartsOf(answer({ kind: 'verdict', sentiment: 'positive' }), 'will be back', index)
				.kind,
		).toBe('verdict');
	});
});
