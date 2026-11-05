import { Injectable } from '@nestjs/common';

import { z } from 'zod/v4';

import {
	BaseMastraAgent,
	BaseMastraAgentConfig,
} from 'src/modules/llm/abstractions/base-mastra-agent.abstract.js';
import type { LlmModelChoice } from 'src/modules/llm/constants/llm-models.constant.js';

import { REFERENCE_MODEL } from '../constants/eval.constant.js';

import { REFERENCE_PREAMBLE, referenceClaimSchema, stepBlock } from './reference-schemas.js';

const reviewReferenceSchema = z.object({
	claims: z
		.array(referenceClaimSchema)
		.describe('Everything the review says, one claim each, with its parts'),
	notes: z.string().nullable(),
});

/** The pipeline's own instructions: step A (`ReviewClaimsAgent`) and step B (the claim-labels classifier's questions, `claimLabelsRules`) */
export interface ReviewReferenceContext {
	specA: string;
	specB: string;
}

/** The eval's reference for one review: agents A and B done at once by Opus, with what else a careful reader may answer */
@Injectable()
export class ReviewReferenceAgent extends BaseMastraAgent<
	typeof reviewReferenceSchema,
	ReviewReferenceContext
> {
	protected readonly config: BaseMastraAgentConfig<typeof reviewReferenceSchema> = {
		id: 'eval-review-reference',
		name: 'ReviewReferenceAgent',
		outputSchema: reviewReferenceSchema,
	};

	protected getModel(): LlmModelChoice {
		return REFERENCE_MODEL;
	}

	protected getInstructions(context?: ReviewReferenceContext): string {
		return (
			REFERENCE_PREAMBLE +
			' The source is one review of one venue; the input is what step A is given (a batch of one).' +
			stepBlock('Step A: splitting a review into claims', context?.specA ?? '') +
			stepBlock(
				'Step B: the labels of each claim (sentiment, aspect, kind)',
				context?.specB ?? '',
			) +
			"\n\nAnswer the review's claims, each with its foods and number (step A) and its labels (step B)."
		);
	}
}
