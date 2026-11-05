import { Injectable } from '@nestjs/common';

import { z } from 'zod/v4';

import {
	BaseMastraAgent,
	BaseMastraAgentConfig,
} from 'src/modules/llm/abstractions/base-mastra-agent.abstract.js';
import type { LlmModelChoice } from 'src/modules/llm/constants/llm-models.constant.js';

import { REFERENCE_MODEL } from '../constants/eval.constant.js';

import { stepBlock } from './reference-schemas.js';

const matchReferenceSchema = z.object({
	places: z.array(
		z.object({
			index: z.number(),
			brandId: z
				.string()
				.nullable()
				.describe('The candidate brand the post means; null when it is none of them'),
			venueId: z
				.string()
				.nullable()
				.describe(
					"One of that brand's branches, only when the post says which (a street, neighbourhood, landmark or tagged place naming one); null otherwise",
				),
			note: z
				.string()
				.nullable()
				.describe('Why, in a sentence, when it was a close call; else null'),
		}),
	),
});

/** The matcher's own instructions (`VenueMatchAgent`), told as the rules the reference follows */
export interface MatchReferenceContext {
	spec: string;
}

/**
 * The eval's reference for which venue each place of a post is: Opus picks among a wider net of
 * the city's brands than the matcher's five, the brand always and the branch only when the post
 * says which.
 */
@Injectable()
export class MatchReferenceAgent extends BaseMastraAgent<
	typeof matchReferenceSchema,
	MatchReferenceContext
> {
	protected readonly config: BaseMastraAgentConfig<typeof matchReferenceSchema> = {
		id: 'eval-match-reference',
		name: 'MatchReferenceAgent',
		outputSchema: matchReferenceSchema,
	};

	protected getModel(): LlmModelChoice {
		return REFERENCE_MODEL;
	}

	protected getInstructions(context?: MatchReferenceContext): string {
		return (
			'You write the reference answer a venue matcher is scored against. You get a social media post or blog article ' +
			"from the city's food scene (its start), the places it names, and for each place the Google Maps businesses of the " +
			'city whose names are closest, each a brand with its branches. For each place, pick the brand the post means, or ' +
			'null when it means none of them (another venue, a place in another city, one not on the list). Pick the branch ' +
			'too only when the post says which one: a street or address, the neighbourhood it is in, a landmark next to it, a ' +
			'tagged location naming one branch; a brand with one branch is that branch. A similar name is not enough: a post ' +
			"giving an address none of a brand's branches is on means another venue. The matcher works by these rules:" +
			stepBlock('The matcher', context?.spec ?? '') +
			'\n\nAnswer every place by its index.'
		);
	}
}
