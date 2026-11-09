import { Injectable } from '@nestjs/common';

import { z } from 'zod/v4';

import {
	BaseMastraAgent,
	BaseMastraAgentConfig,
} from 'src/modules/llm/abstractions/base-mastra-agent.abstract.js';
import type { LlmModelChoice } from 'src/modules/llm/constants/llm-models.constant.js';
import { WebMentionKindEnum } from 'src/modules/venues/entities/web-mention.entity.js';

const pressClassificationSchema = z.object({
	kind: z
		.enum(WebMentionKindEnum)
		.describe(
			'feature: about the venue (review, opening, interview); listicle: a list of places with the venue on it; ' +
				'passing: named in passing; unrelated: another place of the same name, or not about the venue at all',
		),
	summary: z
		.string()
		.describe(
			'One English sentence of at most 20 words on what it says about the venue, e.g. "Lists it among the 10 best brunch spots in Neukölln"',
		),
});

/** The city searched in (the venue goes in the message: what differs per page never breaks the cached instructions) */
export interface PressClassificationContext {
	cityName: string;
}

/** Whether one search result about a venue is a feature, a listicle, a passing mention or a namesake (one a call). */
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

	protected getModel(): LlmModelChoice {
		return 'mini';
	}

	protected getInstructions(context?: PressClassificationContext): string {
		const city = context?.cityName ?? 'the city';
		return (
			`You sort one news article or web page found by searching for a restaurant, bar or café in ${city} (named in the input, with its district when known), for a monthly report to its owner. ` +
			'You get its title, outlet and snippet. Say whether it is a feature about the venue, a listicle that ' +
			'includes it, a passing mention, or unrelated (a place of the same name elsewhere, a person or a product of that ' +
			'name, or nothing about the venue). Only use what the title and snippet say.'
		);
	}
}
