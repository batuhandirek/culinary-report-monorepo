import { Injectable } from '@nestjs/common';

import {
	BaseMastraClassifier,
	type BaseMastraClassifierConfig,
} from 'src/modules/llm/abstractions/base-mastra-classifier.abstract.js';
import type { DecisionModelId } from 'src/modules/llm/constants/decision-models.constant.js';

import {
	type ClaimLabelAspect,
	type ClaimLabelQuestions,
	claimLabelQuestions,
} from '../util/claim-labels.js';

/** The aspects it picks from (`claimLabelAspects`, read from the topics table) */
export interface ClaimLabelsContext {
	aspects: ClaimLabelAspect[];
	/** Only these aspects offered (`aspectShortlist`): fewer options, fewer tokens */
	offered?: string[];
}

/**
 * Agent B's three picks of one option as a decision model's questions: a claim's sentiment, the
 * aspect it is about and its kind (`claimLabelQuestions`), answered with probabilities. Reads what
 * B reads (`claimPartsQuestions`' state: the claim, its quote, the place, its neighbours); its answers
 * go through B's post-processing (`claimLabelsOf`). Foods and amounts are not its job (words and
 * numbers copied from the text: agent A's). The labeller of every claim (`StatementPartsService`),
 * and the eval's by default.
 */
@Injectable()
export class ClaimLabelsClassifier extends BaseMastraClassifier<
	ClaimLabelQuestions,
	ClaimLabelsContext
> {
	protected readonly config: BaseMastraClassifierConfig = {
		id: 'claim-labels',
		name: 'ClaimLabelsClassifier',
		// The user's call (2026-11-05): the claims' labels on Jev in production, ~$22 a month for Berlin
		paidInProduction: true,
		ingestion: true,
	};

	protected getModel(): DecisionModelId {
		return 'typesafe-ai/jev-latest';
	}

	protected getQuestions(context?: ClaimLabelsContext): ClaimLabelQuestions {
		if (!context?.aspects.length) throw new Error('ClaimLabelsClassifier needs the aspects');
		return claimLabelQuestions(context.aspects, context.offered);
	}
}
