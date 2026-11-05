import { Injectable } from '@nestjs/common';

import { z } from 'zod/v4';

import {
	BaseMastraAgent,
	BaseMastraAgentConfig,
} from 'src/modules/llm/abstractions/base-mastra-agent.abstract.js';
import type { LlmModelChoice } from 'src/modules/llm/constants/llm-models.constant.js';

import { REFERENCE_MODEL } from '../constants/eval.constant.js';

import { REFERENCE_PREAMBLE, referenceClaimSchema, stepBlock } from './reference-schemas.js';

const postReferenceSchema = z.object({
	isPromotional: z.boolean(),
	places: z
		.array(
			z.object({
				venueName: z.string(),
				locationHint: z.string().nullable(),
				city: z.string().nullable(),
				visited: z.boolean(),
				isNewOpening: z.boolean(),
			}),
		)
		.describe("The places step A's instructions say to list, in the order the text names them"),
	claims: z.array(
		referenceClaimSchema.extend({
			subject: z.enum(['place', 'city', 'none']),
			place: z
				.number()
				.nullable()
				.describe('For subject place: the index of the place in places; null otherwise'),
		}),
	),
	notes: z.string().nullable(),
});

/** The pipeline's own instructions: step A (`PostClaimsAgent`, for the post's city and own brand) and step B (the claim-labels classifier's questions, `claimLabelsRules`) */
export interface PostReferenceContext {
	specA: string;
	specB: string;
}

/** The eval's reference for one post or article: its places and claims (agents A and B) by Opus */
@Injectable()
export class PostReferenceAgent extends BaseMastraAgent<
	typeof postReferenceSchema,
	PostReferenceContext
> {
	protected readonly config: BaseMastraAgentConfig<typeof postReferenceSchema> = {
		id: 'eval-post-reference',
		name: 'PostReferenceAgent',
		outputSchema: postReferenceSchema,
	};

	protected getModel(): LlmModelChoice {
		return REFERENCE_MODEL;
	}

	protected getInstructions(context?: PostReferenceContext): string {
		return (
			REFERENCE_PREAMBLE +
			" The source is one social media post or blog article; the input is what step A is given. Step A's cuisine field is " +
			'not scored: leave it out.' +
			stepBlock('Step A: the places and the claims', context?.specA ?? '') +
			stepBlock(
				'Step B: the labels of each claim (sentiment, aspect, kind)',
				context?.specB ?? '',
			) +
			'\n\nAnswer the places, then the claims, each with its subject, its foods and number (step A) and its labels (step B).'
		);
	}
}
