import { Injectable } from '@nestjs/common';

import { MastraModelConfig } from '@mastra/core/llm';
import { z } from 'zod/v4';

import {
	BaseMastraAgent,
	BaseMastraAgentConfig,
} from 'src/modules/llm/abstractions/base-mastra-agent.abstract.js';
import {
	type AspectsContext,
	aspectsInstruction,
} from 'src/modules/venues/agents/review-analysis.agent.js';

const feedbackThemeSchema = z.object({
	points: z.array(
		z.object({
			id: z.string(),
			theme: z.string().describe('The key of the aspect, from the aspects in the instructions'),
		}),
	),
});

/** One stored point without a theme, as the theme backlog sends it. */
export interface FeedbackThemeInputPoint {
	id: string;
	/** A noticed change is something the reviewer says changed since before */
	kind: 'praise' | 'complaint' | 'change';
	/** The topic the point was filed under when it was extracted */
	topic: string;
	detail: string;
}

/**
 * Files stored praise and complaint points without a theme (extracted before themes existed, or
 * sent back by `FeedbackService.realign` after the vocabulary changed) under a theme each, from
 * their phrase alone: the `feedback-themes` backlog's classifier.
 */
@Injectable()
export class FeedbackThemeAgent extends BaseMastraAgent<typeof feedbackThemeSchema, AspectsContext> {
	protected readonly config: BaseMastraAgentConfig<typeof feedbackThemeSchema> = {
		id: 'feedback-theme',
		name: 'FeedbackThemeAgent',
		outputSchema: feedbackThemeSchema,
	};

	// Tens of thousands of short phrases, ~10 tokens each: mini
	protected getModel(): MastraModelConfig {
		return 'openai/gpt-5.4-mini';
	}

	protected getInstructions(context?: AspectsContext): string {
		return (
			'You file short phrases of praise or complaint, extracted from reviews and social media posts about restaurants, bars and cafés, ' +
			'under one aspect each. Each phrase comes with whether it was praise or a complaint and the root it was filed under: pick the ' +
			'aspect under that root where one fits, under another root when the phrase clearly belongs there. A phrase of kind change ' +
			'is something the reviewer says changed since before: file it under what changed ("new owner": ownership_change, "prices went ' +
			'up": price_increase, "portions got smaller": portion_size, "the food got worse": quality_change, "renovated": renovation, "new ' +
			'staff": staff_change, "now card only": card_payment). ' +
			aspectsInstruction(context?.legend ?? '') +
			'Return one entry per id.'
		);
	}
}
