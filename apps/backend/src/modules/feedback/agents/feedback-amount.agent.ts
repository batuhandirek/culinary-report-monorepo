import { Injectable } from '@nestjs/common';

import { MastraModelConfig } from '@mastra/core/llm';
import { z } from 'zod/v4';

import {
	BaseMastraAgent,
	BaseMastraAgentConfig,
} from 'src/modules/llm/abstractions/base-mastra-agent.abstract.js';

const feedbackAmountSchema = z.object({
	points: z.array(
		z.object({
			id: z.string(),
			amount: z
				.number()
				.nullable()
				.describe('The number the text states; null when it states none'),
		}),
	),
});

/** One stored wait or price point, with the text of its review or post */
export interface FeedbackAmountInputPoint {
	id: string;
	/** What to read: minutes waited, or a price */
	measure: 'minutes waited' | 'price';
	detail: string;
	text: string;
}

/**
 * Reads the number a stored wait or price point's source states ("we waited 40 minutes": 40), for
 * the points whose phrase lost it: the `feedback-amounts` backlog's reader.
 */
@Injectable()
export class FeedbackAmountAgent extends BaseMastraAgent<typeof feedbackAmountSchema> {
	protected readonly config: BaseMastraAgentConfig<typeof feedbackAmountSchema> = {
		id: 'feedback-amount',
		name: 'FeedbackAmountAgent',
		outputSchema: feedbackAmountSchema,
	};

	// Short texts in bulk: mini
	protected getModel(): MastraModelConfig {
		return 'openai/gpt-5.4-mini';
	}

	protected getInstructions(): string {
		return (
			'Each item is a complaint or praise point about a restaurant, bar or café and the review or post it came from. Answer the number ' +
			'the text states for that point: for "minutes waited" the minutes ("an hour" is 60, "half an hour" 30, a range like "30 to 40 ' +
			'minutes" its upper end, 40); for "price" the price in the local currency ("9,50 €" is 9.5). Only a number the text states for ' +
			'that point: never estimate, and answer null for "forever", "ages", "too long", "pricey" or a number about something else. ' +
			'Return one entry per id.'
		);
	}
}
