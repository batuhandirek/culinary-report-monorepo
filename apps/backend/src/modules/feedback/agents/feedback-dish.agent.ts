import { Injectable } from '@nestjs/common';

import { MastraModelConfig } from '@mastra/core/llm';
import { z } from 'zod/v4';

import {
	BaseMastraAgent,
	BaseMastraAgentConfig,
} from 'src/modules/llm/abstractions/base-mastra-agent.abstract.js';

const feedbackDishSchema = z.object({
	points: z.array(
		z.object({
			id: z.string(),
			dish: z
				.string()
				.nullable()
				.describe("One of the point's dishes, spelled as given; null when none fits"),
		}),
	),
});

/** One stored food or drinks point, with the dishes its review or post names */
export interface FeedbackDishInputPoint {
	id: string;
	kind: 'praise' | 'complaint';
	detail: string;
	dishes: string[];
}

/**
 * Links stored food and drinks points to the dish or drink they are about, among the dishes their
 * source names: the `feedback-dish-links` backlog's reader. Never extracts a source again.
 */
@Injectable()
export class FeedbackDishAgent extends BaseMastraAgent<typeof feedbackDishSchema> {
	protected readonly config: BaseMastraAgentConfig<typeof feedbackDishSchema> = {
		id: 'feedback-dish',
		name: 'FeedbackDishAgent',
		outputSchema: feedbackDishSchema,
	};

	// Thousands of short phrases: mini
	protected getModel(): MastraModelConfig {
		return 'openai/gpt-5.4-mini';
	}

	protected getInstructions(): string {
		return (
			'You link short praise or complaint phrases, read from reviews and social media posts about restaurants, bars and cafés, to the ' +
			'dish or drink they are about. Each phrase comes with the dishes and drinks its review or post names. Answer one only when the ' +
			'phrase names it or plainly describes that one dish or drink: its patty, broth, crust, filling or sauce ("crispy and juicy": the ' +
			'chicken wings, when those are named and nothing else fits). Answer it spelled exactly as given. Answer null, even when only one ' +
			'dish is listed, when the phrase is about the food, the ingredients, the menu, the portions, the drinks or the cuisine in general ' +
			'("delicious food", "fresh ingredients", "great choice of drinks"), about the place, the service, the price or the atmosphere, ' +
			"about several of the dishes, or about something not listed. A phrase that doesn't say what was eaten or drunk is about the " +
			'food in general and is null whatever is listed: "always fresh", "everything is fresh", "fresh quality", "taste was good", ' +
			'"always delicious", "very satisfying", "absolutely number one", "generous portions", "Italian cuisine". Return one entry per id.'
		);
	}
}
