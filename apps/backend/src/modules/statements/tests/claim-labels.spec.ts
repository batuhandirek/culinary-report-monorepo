import { describe, expect, it } from '@jest/globals';

import { seedIndex } from 'src/modules/topics/tests/factories/topic.factory.js';

import { KIND_CRITERIA, KIND_RULES, STATEMENT_KINDS } from '../constants/kind.constant.js';
import { SENTIMENTS } from '../constants/sentiment.constant.js';
import {
	claimLabelAspects,
	claimLabelQuestions,
	claimLabelsOf,
	NO_ASPECT,
} from '../util/claim-labels.js';

const index = seedIndex();
const aspects = claimLabelAspects(index);

type Answers = Parameters<typeof claimLabelsOf>[0];
const choice = (option: string, probability = 0.95) => ({
	type: 'choice' as const,
	choice: option,
	probabilities: { [option]: probability },
});

describe('Claim labels (the classifier of sentiment, aspect and kind)', () => {
	it('offers every aspect but the bare root other, a root as a whole, and none', () => {
		const keys = aspects.map(a => a.key);
		expect(keys).not.toContain('other');
		expect(keys).toEqual(
			expect.arrayContaining(['food', 'taste', 'wait_for_food', 'opening_hours']),
		);
		const questions = claimLabelQuestions(aspects);
		expect(Object.keys(questions.aspect.criteria)).toEqual([...keys, NO_ASPECT]);
		expect(questions.aspect.criteria.food).toMatch(/^Food as a whole/);
		// A child names its root by label: "Practical" is other's
		expect(questions.aspect.criteria.opening_hours).toMatch(/^Opening hours \(Practical\): /);
		expect(Object.keys(questions.kind.criteria)).toEqual([...STATEMENT_KINDS]);
		expect(Object.keys(questions.sentiment.criteria).sort()).toEqual([...SENTIMENTS].sort());
	});

	it("builds agent B's kind rules from the same criteria", () => {
		for (const kind of STATEMENT_KINDS)
			expect(KIND_RULES).toContain(`${kind} (${KIND_CRITERIA[kind]})`);
	});

	it("keeps the answers as agent B's are kept: a judging fact an opinion, the amount from the text", () => {
		const labels = claimLabelsOf(
			{
				sentiment: choice('negative'),
				aspect: choice('wait_for_food', 0.92),
				kind: choice('fact', 0.8),
			} as Answers,
			'waited 50 minutes for the food',
			index,
		);
		expect(labels).toEqual({
			sentiment: 'negative',
			aspect: expect.objectContaining({ key: 'wait_for_food', root: 'wait' }),
			kind: 'opinion',
			amount: 50,
			unit: 'minutes',
			probability: { sentiment: 0.95, aspect: 0.92, kind: 0.8 },
		});
	});

	it('takes the number agent A said the claim states over the text parsed', () => {
		const answers = {
			sentiment: choice('negative'),
			aspect: choice('wait_for_food'),
			kind: choice('opinion'),
		} as Answers;
		// "almost an hour" parses as 60; A read 50 from the review
		const text = 'waited almost an hour for the food';
		expect(claimLabelsOf(answers, text, index)).toMatchObject({ amount: 60, unit: 'minutes' });
		expect(claimLabelsOf(answers, text, index, { amount: 50, unit: 'minutes' })).toMatchObject({
			amount: 50,
			unit: 'minutes',
		});
		// No number from A: the text parsed, as before
		expect(claimLabelsOf(answers, text, index, { amount: null, unit: null })).toMatchObject({
			amount: 60,
		});
	});

	it('files none as no aspect, and leaves a declined label unread', () => {
		const labels = claimLabelsOf(
			{
				sentiment: { type: 'refusal' },
				aspect: choice(NO_ASPECT, 0.7),
				kind: choice('fact'),
			} as Answers,
			'came on a Tuesday',
			index,
		);
		// No sentiment, so no rule turns the fact into an opinion
		expect(labels).toMatchObject({
			sentiment: null,
			aspect: undefined,
			kind: 'fact',
			amount: null,
		});
		expect(labels.probability).toEqual({ aspect: 0.7, kind: 0.95 });
	});
});
