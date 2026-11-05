import { describe, expect, it } from '@jest/globals';

import { seedIndex } from 'src/modules/topics/tests/factories/topic.factory.js';

import { aspectEmbeddingText, aspectShortlist, aspectVectors } from '../util/aspect-shortlist.js';
import { claimLabelAspects, claimLabelQuestions, NO_ASPECT } from '../util/claim-labels.js';

const aspects = claimLabelAspects(seedIndex());
// A made-up space: one axis for waiting for food, one for noise, one for everything else
const vectorOf = (text: string): number[] =>
	/^Wait for food/.test(text) ? [1, 0, 0]
	: /^Noise/.test(text) ? [0, 1, 0]
	: [0, 0, 1];
const vectors = aspectVectors(
	aspects,
	aspects.map(a => vectorOf(aspectEmbeddingText(a))),
);

describe('Aspect shortlist (what the claim-labels classifier is offered)', () => {
	it("embeds an aspect by what the classifier is told it is, its root's label beside a child's", () => {
		const queue = aspects.find(a => a.key === 'queue')!;
		expect(aspectEmbeddingText(queue)).toBe(`Queue (Waiting): ${queue.hint}`);
	});

	it('offers the closest aspects with their roots, in the legend order', () => {
		expect(aspectShortlist([0.9, 0.1, 0], vectors, 1)).toEqual(['wait', 'wait_for_food']);
		// The two closest: wait for food, then noise; each with its root
		expect(aspectShortlist([0.9, 0.5, 0], vectors, 2)).toEqual([
			'vibe',
			'noise',
			'wait',
			'wait_for_food',
		]);
		// A root offered for itself is offered once
		expect(aspectShortlist([0, 0, 1], vectors, 1)).toEqual(['food']);
	});

	it('narrows the aspect question to the offered keys, "no aspect" always among them', () => {
		const all = claimLabelQuestions(aspects);
		const short = claimLabelQuestions(aspects, ['wait', 'wait_for_food']);
		expect(Object.keys(short.aspect.criteria)).toEqual(['wait', 'wait_for_food', NO_ASPECT]);
		// Each still reads as it does in the whole list: the root as a whole
		expect(short.aspect.criteria.wait).toBe(all.aspect.criteria.wait);
		expect(short.aspect.criteria.wait).toMatch(/as a whole/);
		expect(short.sentiment).toEqual(all.sentiment);
	});
});
