import { Injectable } from '@nestjs/common';

import { z } from 'zod/v4';

import {
	BaseMastraAgent,
	BaseMastraAgentConfig,
} from 'src/modules/llm/abstractions/base-mastra-agent.abstract.js';
import type { LlmModelChoice } from 'src/modules/llm/constants/llm-models.constant.js';

import { REFERENCE_MODEL } from '../constants/eval.constant.js';

import { REFERENCE_PREAMBLE, stepBlock } from './reference-schemas.js';

const aspectReferenceSchema = z.object({
	claims: z.array(
		z.object({
			n: z.number().describe("The claim's number, as given"),
			aspect: z
				.string()
				.nullable()
				.describe(
					'The key of the one aspect the claim is about, from the legend; null when none fits',
				),
			alsoAcceptable: z
				.array(z.string())
				.describe(
					'Other aspect keys the instructions also allow for this claim ("none" for no aspect); empty when only one fits',
				),
		}),
	),
});

/** Step B's instructions, with the aspects' legend as the table has it now */
export interface AspectReferenceContext {
	specB: string;
}

/**
 * The eval's references re-answered for one thing only, after the aspect table changed: each claim
 * of one source keeps its reading and parts, and gets its aspect (and what else is fine) by the
 * table now. One source a call, its claims numbered (`EvalReferenceService.relabelAspects`).
 */
@Injectable()
export class AspectReferenceAgent extends BaseMastraAgent<
	typeof aspectReferenceSchema,
	AspectReferenceContext
> {
	protected readonly config: BaseMastraAgentConfig<typeof aspectReferenceSchema> = {
		id: 'eval-aspect-reference',
		name: 'AspectReferenceAgent',
		outputSchema: aspectReferenceSchema,
	};

	protected getModel(): LlmModelChoice {
		return REFERENCE_MODEL;
	}

	protected getInstructions(context?: AspectReferenceContext): string {
		return (
			REFERENCE_PREAMBLE +
			' Here only one part is asked again: the aspects have just been redefined, so answer, for every claim of the ' +
			'source below, the one aspect it is about by the legend now, and the other aspects the instructions also allow. ' +
			'The claims were read before and stay as they are; you get them numbered, with their quotes, the source they come ' +
			'from and the place it is about.' +
			stepBlock(
				'Step B: the labels of each claim (sentiment, aspect, kind)',
				context?.specB ?? '',
			) +
			'\n\nAnswer every claim by its number.'
		);
	}
}
