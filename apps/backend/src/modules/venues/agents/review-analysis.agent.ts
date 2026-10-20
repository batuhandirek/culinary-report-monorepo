import { Injectable } from '@nestjs/common';

import { MastraModelConfig } from '@mastra/core/llm';
import { z } from 'zod/v4';

import {
	BaseMastraAgent,
	BaseMastraAgentConfig,
} from 'src/modules/llm/abstractions/base-mastra-agent.abstract.js';

export const FEEDBACK_SENTIMENTS = ['positive', 'mixed', 'negative', 'neutral'] as const;
export const FEEDBACK_TOPICS = [
	'food',
	'drinks',
	'service',
	'vibe',
	'price',
	'payment',
	'wait',
	'cleanliness',
	'other',
] as const;

export const feedbackPointSchema = z.object({
	topic: z.enum(FEEDBACK_TOPICS),
	detail: z.string().describe('Short phrase in English, e.g. "staff forgot our order"'),
});

export const feedbackDishSchema = z.object({
	name: z.string(),
	sentiment: z.enum(FEEDBACK_SENTIMENTS),
});

const reviewAnalysisSchema = z.object({
	reviews: z.array(
		z.object({
			reviewId: z.string(),
			sentiment: z.enum(FEEDBACK_SENTIMENTS),
			praise: z.array(feedbackPointSchema),
			complaints: z.array(feedbackPointSchema),
			dishes: z.array(feedbackDishSchema).describe('Specific dishes or drinks named'),
			changes: z
				.array(z.string())
				.describe(
					'Changes the reviewer says happened compared to before, e.g. "new owner", "prices went up". Empty if none.',
				),
		}),
	),
});

/** Topics, dishes and noticed changes of a batch of one venue's Google or TripAdvisor reviews. */
@Injectable()
export class ReviewAnalysisAgent extends BaseMastraAgent<typeof reviewAnalysisSchema> {
	protected readonly config: BaseMastraAgentConfig<typeof reviewAnalysisSchema> = {
		id: 'review-analysis',
		name: 'ReviewAnalysisAgent',
		outputSchema: reviewAnalysisSchema,
	};

	// Thousands of reviews a month: mini, whose daily complimentary allowance is 10M tokens (the
	// full model's is 1M, and one month's reviews used it up), on small batches
	protected getModel(): MastraModelConfig {
		return 'openai/gpt-5.4-mini';
	}

	protected getInstructions(): string {
		return (
			'You analyse Google or TripAdvisor reviews of one restaurant, bar or café for a monthly report to its owner. ' +
			'For every review, list the praise and complaints by topic, the dishes or drinks named, and any change the reviewer says happened ' +
			'compared to earlier visits or the past (ownership, staff, menu, prices, quality, opening hours, payment). ' +
			'Only use what the review says. Write details as short English phrases. Return one entry per review id.'
		);
	}
}
