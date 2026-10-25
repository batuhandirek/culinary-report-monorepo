import { Injectable } from '@nestjs/common';

import { MastraModelConfig } from '@mastra/core/llm';
import { z } from 'zod/v4';

import {
	BaseMastraAgent,
	BaseMastraAgentConfig,
} from 'src/modules/llm/abstractions/base-mastra-agent.abstract.js';
import { FEEDBACK_THEMES_INSTRUCTION } from 'src/modules/venues/agents/review-analysis.agent.js';
import { FEEDBACK_THEME_KEYS } from 'src/modules/venues/constants/feedback-themes.constant.js';

const feedbackThemeSchema = z.object({
	points: z.array(
		z.object({
			id: z.string(),
			theme: z.enum(FEEDBACK_THEME_KEYS),
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
export class FeedbackThemeAgent extends BaseMastraAgent<typeof feedbackThemeSchema> {
	protected readonly config: BaseMastraAgentConfig<typeof feedbackThemeSchema> = {
		id: 'feedback-theme',
		name: 'FeedbackThemeAgent',
		outputSchema: feedbackThemeSchema,
	};

	// Tens of thousands of short phrases, ~10 tokens each: mini
	protected getModel(): MastraModelConfig {
		return 'openai/gpt-5.4-mini';
	}

	protected getInstructions(): string {
		return (
			'You file short phrases of praise or complaint, extracted from reviews and social media posts about restaurants, bars and cafés, ' +
			'under one theme each. Each phrase comes with whether it was praise or a complaint and the topic it was filed under: pick the ' +
			'theme under that topic where one fits, under another topic when the phrase clearly belongs there. A phrase of kind change ' +
			'is something the reviewer says changed since before: file it under what changed ("new owner": ownership_change, "prices went ' +
			'up": price_increase, "portions got smaller": portion_size, "the food got worse": quality_change, "renovated": renovation, "new ' +
			'staff": staff_change, "now card only": card_payment). ' +
			FEEDBACK_THEMES_INSTRUCTION +
			'Return one entry per id.'
		);
	}
}
