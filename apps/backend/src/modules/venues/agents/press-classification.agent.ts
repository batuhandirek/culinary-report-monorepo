import { Injectable } from '@nestjs/common';

import { MastraModelConfig } from '@mastra/core/llm';
import { z } from 'zod/v4';

import {
	BaseMastraAgent,
	BaseMastraAgentConfig,
} from 'src/modules/llm/abstractions/base-mastra-agent.abstract.js';

import { WebMentionKindEnum } from '../entities/web-mention.entity.js';

const pressClassificationSchema = z.object({
	results: z.array(
		z.object({
			id: z.string(),
			kind: z
				.enum(WebMentionKindEnum)
				.describe(
					'feature: about the venue (review, opening, interview); listicle: a list of places with the venue on it; ' +
						'passing: named in passing; unrelated: another place of the same name, or not about the venue at all',
				),
			summary: z
				.string()
				.describe('One English sentence of at most 20 words on what it says about the venue, e.g. "Lists it among the 10 best brunch spots in Neukölln"'),
		}),
	),
});

/** The venue the results were searched for. */
export interface PressClassificationContext {
	venueName: string;
	district?: string;
	cityName: string;
}

/** Whether search results about a venue are a feature, a listicle, a passing mention or a namesake. */
@Injectable()
export class PressClassificationAgent extends BaseMastraAgent<
	typeof pressClassificationSchema,
	PressClassificationContext
> {
	protected readonly config: BaseMastraAgentConfig<typeof pressClassificationSchema> = {
		id: 'press-classification',
		name: 'PressClassificationAgent',
		outputSchema: pressClassificationSchema,
	};

	protected getModel(): MastraModelConfig {
		return 'openai/gpt-5.4-mini';
	}

	protected getInstructions(context?: PressClassificationContext): string {
		const venue =
			context ?
				`${context.venueName}${context.district ? ` in ${context.district}` : ''}, ${context.cityName}`
			:	'a restaurant, bar or café';
		return (
			`You sort news articles and web pages found by searching for ${venue}, for a monthly report to its owner. ` +
			'You get each result\'s title, outlet and snippet. Say whether it is a feature about the venue, a listicle that ' +
			'includes it, a passing mention, or unrelated (a place of the same name elsewhere, a person or a product of that ' +
			'name, or nothing about the venue). Only use what the title and snippet say. Return one entry per id.'
		);
	}
}
