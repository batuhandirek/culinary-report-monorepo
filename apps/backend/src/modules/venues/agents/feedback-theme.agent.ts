import { Injectable } from '@nestjs/common';

import { MastraModelConfig } from '@mastra/core/llm';
import { z } from 'zod/v4';

import {
	BaseMastraAgent,
	BaseMastraAgentConfig,
} from 'src/modules/llm/abstractions/base-mastra-agent.abstract.js';

import { FEEDBACK_THEME_KEYS } from '../constants/feedback-themes.constant.js';

import { FEEDBACK_THEMES_INSTRUCTION } from './review-analysis.agent.js';

const feedbackThemeSchema = z.object({
	points: z.array(
		z.object({
			id: z.string(),
			theme: z.enum(FEEDBACK_THEME_KEYS),
		}),
	),
});

/** One stored point without a theme, as the backfill sends it. */
export interface FeedbackThemeInputPoint {
	id: string;
	kind: 'praise' | 'complaint';
	/** The topic the point was filed under when it was extracted */
	topic: string;
	detail: string;
}

/**
 * Files stored praise and complaint points (extracted before themes existed) under a theme
 * each, from their phrase alone: the backfill's classifier.
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
			'theme under that topic where one fits, under another topic when the phrase clearly belongs there. ' +
			FEEDBACK_THEMES_INSTRUCTION +
			'Return one entry per id.'
		);
	}
}
