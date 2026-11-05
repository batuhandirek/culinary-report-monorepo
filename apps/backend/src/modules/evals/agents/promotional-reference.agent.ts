import { Injectable } from '@nestjs/common';

import { z } from 'zod/v4';

import {
	BaseMastraAgent,
	BaseMastraAgentConfig,
} from 'src/modules/llm/abstractions/base-mastra-agent.abstract.js';
import type { LlmModelChoice } from 'src/modules/llm/constants/llm-models.constant.js';

import { REFERENCE_MODEL } from '../constants/eval.constant.js';

import { REFERENCE_PREAMBLE, stepBlock } from './reference-schemas.js';

const promotionalReferenceSchema = z.object({
	isPromotional: z.boolean(),
	reason: z.string().describe('In a few words, what in the post decides it'),
});

/** Step A's instructions for posts (`PostClaimsAgent.rulesFor`) */
export interface PromotionalReferenceContext {
	specA: string;
}

/**
 * The eval's references re-answered for one thing only, after the user defined "promotional"
 * (2026-11-02: only a post by someone other than the venue that a venue paid for, gifted or invited):
 * whether one post is promotional, by step A's rules now (`EvalReferenceService.relabelPromotional`).
 */
@Injectable()
export class PromotionalReferenceAgent extends BaseMastraAgent<
	typeof promotionalReferenceSchema,
	PromotionalReferenceContext
> {
	protected readonly config: BaseMastraAgentConfig<typeof promotionalReferenceSchema> = {
		id: 'eval-promotional-reference',
		name: 'PromotionalReferenceAgent',
		outputSchema: promotionalReferenceSchema,
	};

	protected getModel(): LlmModelChoice {
		return REFERENCE_MODEL;
	}

	protected getInstructions(context?: PromotionalReferenceContext): string {
		return (
			REFERENCE_PREAMBLE +
			' Here only one answer is asked again, after its rule was defined: whether the post below is promotional, by step ' +
			"A's rules (isPromotional). The input is what step A is given." +
			stepBlock('Step A: reading a post', context?.specA ?? '') +
			'\n\nAnswer isPromotional for this post, and what decides it.'
		);
	}
}
