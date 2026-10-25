import { Injectable } from '@nestjs/common';

import { MastraModelConfig } from '@mastra/core/llm';
import { z } from 'zod/v4';

import {
	BaseMastraAgent,
	BaseMastraAgentConfig,
} from 'src/modules/llm/abstractions/base-mastra-agent.abstract.js';

import { FEEDBACK_THEME_KEYS, feedbackThemeLegend } from '../constants/feedback-themes.constant.js';

export const FEEDBACK_SENTIMENTS = ['positive', 'mixed', 'negative', 'neutral'] as const;

/**
 * One praise or complaint point: the theme it is about, the phrase, the dish it is about and the
 * number it states. The topic is the theme's, derived in code (`feedbackRows`). Every agent
 * answering this shape puts `FEEDBACK_THEMES_INSTRUCTION` and `FEEDBACK_POINT_INSTRUCTION` in its
 * instructions: the legend is long, and in the schema it would repeat for praise and complaints.
 */
export const feedbackPointSchema = z.object({
	theme: z.enum(FEEDBACK_THEME_KEYS).describe('The one theme the point is about, from the themes in the instructions'),
	detail: z.string().describe('Short phrase in English, e.g. "staff forgot our order"'),
	dish: z
		.string()
		.nullable()
		.describe('The dish or drink the point is about, as written in the dishes list; null when it is about the place or the food as a whole'),
	amount: z
		.number()
		.nullable()
		.describe('For a wait or price point, the number the text states (minutes waited, the price); null when it states none'),
});

/** How the agents answering `feedbackPointSchema` fill `dish` and `amount`. */
export const FEEDBACK_POINT_INSTRUCTION =
	'A point about one dish or drink names it in dish, spelled as in the dishes list ("the burger got pricier": burger); a point ' +
	'about the place or the food as a whole has none. Give amount only when the text states the number, never an estimate: for a ' +
	'wait the minutes ("an hour" is 60, "half an hour" 30, "30 to 40 minutes" 40), for a price the price in the local currency ' +
	'("dürüm now €9.50" is 9.5); "waited forever" or "pricey" has none. ';

/** How the agents answering `feedbackPointSchema` pick a theme. */
export const FEEDBACK_THEMES_INSTRUCTION =
	'Every praise or complaint point carries the theme it is about: the one that fits best, a topic\'s "_other" theme only when ' +
	'none fits. A theme says what the point is about, not whether it was good or bad (portion_size covers generous and small ' +
	'portions). Prices that went up since an earlier visit are price_increase, not price_level; portions that got smaller are ' +
	`portion_size. The themes, by topic: ${feedbackThemeLegend()}. `;

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
			'For every review, list the praise and complaints as points, the dishes or drinks named, and any change the reviewer says happened ' +
			'compared to earlier visits or the past (ownership, staff, menu, prices, quality, opening hours, payment). ' +
			FEEDBACK_THEMES_INSTRUCTION +
			FEEDBACK_POINT_INSTRUCTION +
			'Only use what the review says. Write details as short English phrases. Return one entry per review id.'
		);
	}
}
