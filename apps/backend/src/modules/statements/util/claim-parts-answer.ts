import _ from 'lodash';

import type { AspectRef, TopicIndex } from 'src/modules/topics/util/topics.js';
import { termKey } from 'src/modules/venues/util/dishes.js';

import type { StatementKind } from '../constants/kind.constant.js';
import type { Sentiment } from '../constants/sentiment.constant.js';
import type { StatementUnit } from '../entities/statement.entity.js';

import { AMOUNT_UNITS, parseAmount, statedAmount } from './amounts.js';

/** The aspect root for what no other root covers: never an answer on its own */
export const OTHER_ROOT = 'other';

/** Food wordings a claim keeps */
export const MAX_FOODS = 10;

/** One claim as agent B (`ClaimPartsAgent`) answers it */
export interface ClaimPartsAnswer {
	sentiment: Sentiment;
	aspect: string | null;
	foods: string[];
	amount: number | null;
	unit: StatementUnit | null;
	kind: StatementKind;
}

/**
 * What a claim stores of B's answer (`StatementPartsService`, and the eval scores the same): the
 * aspect when the table has it (the bare root other is none), a judging "fact" as an opinion, the stated amount (the agent's, else the text parsed for the
 * aspect's unit), the food wordings once per `termKey` as first spelled, `MAX_FOODS` at most.
 */
export const claimPartsOf = (
	answer: ClaimPartsAnswer,
	text: string,
	index: Pick<TopicIndex, 'aspect'>,
) => {
	// The root other alone says nothing the claim is about: no aspect (its children do)
	const aspect: AspectRef | undefined =
		answer.aspect === OTHER_ROOT ? undefined : index.aspect(answer.aspect);
	const amount =
		statedAmount(answer.amount, answer.unit) ??
		parseAmount(text, aspect ? AMOUNT_UNITS[aspect.root] : null);
	return {
		sentiment: answer.sentiment,
		// A fact judges nothing (`KIND_RULES`): one with a side is an opinion
		kind: answer.kind === 'fact' && answer.sentiment !== 'neutral' ? 'opinion' : answer.kind,
		aspect,
		amount: amount?.amount ?? null,
		unit: amount?.unit ?? null,
		foods: claimFoods(answer.foods),
	};
};

/** The food wordings a claim keeps, whoever named them (agent B, or agent A): once per `termKey` as first spelled, `MAX_FOODS` at most */
export const claimFoods = (foods: string[]): string[] =>
	_.uniqBy(
		foods.slice(0, MAX_FOODS).filter(f => termKey(f)),
		termKey,
	);
