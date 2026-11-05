import type {
	ChoiceAnswer,
	ChoiceQuestion,
	ClassifierResult,
	RefusalAnswer,
} from '@mastra/core/classifier';

import type { AspectRef, TopicIndex } from 'src/modules/topics/util/topics.js';

import { KIND_CRITERIA, STATEMENT_KINDS, type StatementKind } from '../constants/kind.constant.js';
import { type Sentiment, SENTIMENTS } from '../constants/sentiment.constant.js';
import type { StatementUnit } from '../entities/statement.entity.js';

import { claimPartsOf, OTHER_ROOT } from './claim-parts-answer.js';

/** The aspect option for a claim about none of them (no aspect key looks like it) */
export const NO_ASPECT = 'no_aspect';

/** The labels a decision model gives a claim: agent B's parts that are a pick of one option */
export const CLAIM_LABELS = ['sentiment', 'aspect', 'kind'] as const;
export type ClaimLabel = (typeof CLAIM_LABELS)[number];

/** How a claim judges, as agent B's rules and coaching put it */
export const SENTIMENT_CRITERIA: Record<Sentiment, string> = {
	positive:
		'It praises what it is about. Describing something approvingly praises it ("the crust is thin and blistered", ' +
		'"a must when you visit"), and so does praise someone else gave: a good score or star rating, a guide\'s pick, ' +
		'a recommendation.',
	mixed: 'It praises and criticises at once ("tasty but tiny").',
	negative: 'It criticises what it is about, a low score ("3 out of 10") included.',
	neutral:
		'A fact that judges nothing ("fries for 10 euros", "open until 22", "we came on a Tuesday").',
};

/** An aspect as the classifier offers it */
export interface ClaimLabelAspect {
	key: string;
	label: string;
	hint: string | null;
	root: string;
	rootLabel: string;
}

/**
 * The aspects a claim can be filed under, in the legend's order: every aspect but the bare root
 * other, which is no aspect (`claimPartsOf`; its children are)
 */
export const claimLabelAspects = (
	index: Pick<TopicIndex, 'aspects' | 'rootOf' | 'label'>,
): ClaimLabelAspect[] =>
	index.aspects
		.filter(t => t.key !== OTHER_ROOT)
		.map(t => {
			const root = index.rootOf(t.key) ?? t.key;
			return {
				key: t.key,
				label: t.label,
				hint: t.hint ?? null,
				root,
				rootLabel: index.label(root),
			};
		});

export type ClaimLabelQuestions = {
	sentiment: ChoiceQuestion<Record<Sentiment, string>>;
	aspect: ChoiceQuestion<Record<string, string>>;
	kind: ChoiceQuestion<Record<StatementKind, string>>;
};

/**
 * The three questions about one claim, each a pick of one option with what the option means:
 * agent B's rules for sentiment, aspect and kind (`KIND_CRITERIA`, the aspects' hints), so a
 * classifier and B answer the same question. A root aspect is offered as the root "as a whole",
 * for a claim no finer aspect under it fits. `offered` (a shortlist, `aspectShortlist`) narrows the
 * aspect options to those keys; each still reads as it does in the whole list.
 */
export const claimLabelQuestions = (
	aspects: ClaimLabelAspect[],
	offered?: readonly string[],
): ClaimLabelQuestions => {
	const hasChildren = new Set(aspects.filter(a => a.root !== a.key).map(a => a.root));
	const shown = offered ? aspects.filter(a => offered.includes(a.key)) : aspects;
	const aspectCriterion = (a: ClaimLabelAspect): string => {
		const hint = a.hint ? `: ${a.hint}` : '';
		if (a.root !== a.key) return `${a.label} (${a.rootLabel})${hint}`;
		return hasChildren.has(a.key) ?
				`${a.label} as a whole, when none of the finer ${a.label.toLowerCase()} aspects fits${hint}`
			:	`${a.label}${hint}`;
	};
	return {
		sentiment: {
			type: 'choice',
			instructions:
				'How does the claim judge what it is about? Read it next to the source\'s other claims ("crispy and juicy" ' +
				'after "we had the wings" praises the wings).',
			criteria: SENTIMENT_CRITERIA,
		},
		aspect: {
			type: 'choice',
			instructions:
				'Which one aspect of the place is the claim about? An aspect says what the claim is about, never whether it ' +
				'was good or bad: portion size covers generous and small portions, prices that went up since an earlier visit ' +
				'are price level. Take the finest aspect that fits; a root as a whole only when none of the aspects under it fits.',
			criteria: {
				...Object.fromEntries(shown.map(a => [a.key, aspectCriterion(a)])),
				[NO_ASPECT]:
					'About none of these: a rating, a ranking, an award, a recommendation, a visit, an event or what kind of ' +
					'place it is ("came on a Tuesday", "the owners are two brothers").',
			},
		},
		kind: {
			type: 'choice',
			instructions: 'What sort of thing does the claim say? Exactly one.',
			criteria: KIND_CRITERIA,
		},
	};
};

/**
 * The labels' rules as prose, what the classifier is asked (`claimLabelQuestions`) for a reader that
 * answers in words: the spec of a claim's sentiment, aspect and kind the eval's reference model
 * writes its answers to, and hashes to tell an answer key written under older rules
 */
export const claimLabelsRules = (aspects: ClaimLabelAspect[]): string => {
	const q = claimLabelQuestions(aspects);
	const list = (criteria: Readonly<Record<string, unknown>>) =>
		Object.entries(criteria)
			.map(([option, means]) => `${option}: ${String(means)}`)
			.join('; ');
	return [
		`Each claim's sentiment, one of these. ${String(q.sentiment.instructions)} ${list(q.sentiment.criteria)}.`,
		`Its aspect, the key of one of these (${NO_ASPECT} is null). ${String(q.aspect.instructions)} ${list(q.aspect.criteria)}.`,
		`Its kind, one of these. ${String(q.kind.instructions)} ${list(q.kind.criteria)}. A fact that judges is an opinion.`,
	].join('\n');
};

/** What a claim keeps of the classifier's answers (`claimLabelsOf`) */
export interface ClaimLabelsAnswer {
	/** null: the model declined to answer */
	sentiment: Sentiment | null;
	aspect: AspectRef | undefined;
	kind: StatementKind | null;
	amount: number | null;
	unit: StatementUnit | null;
	/** The chosen option's probability, per label answered */
	probability: Partial<Record<ClaimLabel, number>>;
}

const chosen = <T extends string>(
	answer: ChoiceAnswer<string> | RefusalAnswer,
	allowed: readonly T[],
): { choice: T; probability?: number } | null =>
	answer.type === 'choice' && (allowed as readonly string[]).includes(answer.choice) ?
		{ choice: answer.choice as T, probability: answer.probabilities?.[answer.choice] }
	:	null;

/**
 * The classifier's answers as a claim stores them, through agent B's own post-processing
 * (`claimPartsOf`): the bare root other is no aspect, a judging fact an opinion, the amount agent A
 * stated, else parsed from the text for the aspect's unit. A declined label is null (unread, as a claim B never read),
 * and with it the rule that needs it. Foods are words copied from the text, no decision: never here.
 */
export const claimLabelsOf = (
	answers: ClassifierResult<ClaimLabelQuestions>['answers'],
	text: string,
	index: Pick<TopicIndex, 'aspect'>,
	/** The number agent A said the claim states (`CLAIM_AMOUNT_RULE`): taken over the text parsed */
	stated?: { amount: number | null; unit: StatementUnit | null },
): ClaimLabelsAnswer => {
	const sentiment = chosen(answers.sentiment, SENTIMENTS);
	const kind = chosen(answers.kind, STATEMENT_KINDS);
	const aspect =
		answers.aspect.type === 'choice' ?
			{
				choice: answers.aspect.choice,
				probability: answers.aspect.probabilities?.[answers.aspect.choice],
			}
		:	null;
	const parts = claimPartsOf(
		{
			sentiment: sentiment?.choice ?? 'neutral',
			aspect: aspect && aspect.choice !== NO_ASPECT ? aspect.choice : null,
			foods: [],
			amount: stated?.amount ?? null,
			unit: stated?.unit ?? null,
			kind: kind?.choice ?? 'opinion',
		},
		text,
		index,
	);
	const probability: Partial<Record<ClaimLabel, number>> = {};
	for (const [label, answer] of [
		['sentiment', sentiment],
		['aspect', aspect],
		['kind', kind],
	] as const)
		if (answer?.probability !== undefined) probability[label] = answer.probability;
	return {
		sentiment: sentiment?.choice ?? null,
		aspect: parts.aspect,
		kind:
			kind === null ? null
			: sentiment === null ? kind.choice
			: (parts.kind as StatementKind),
		amount: parts.amount,
		unit: parts.unit,
		probability,
	};
};
