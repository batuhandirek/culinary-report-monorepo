import { Injectable } from '@nestjs/common';

import { MastraModelConfig } from '@mastra/core/llm';
import { z } from 'zod/v4';

import {
	BaseMastraAgent,
	BaseMastraAgentConfig,
} from 'src/modules/llm/abstractions/base-mastra-agent.abstract.js';

const pitchHookSchema = z.object({
	hook: z
		.string()
		.describe(
			'One sentence of at most 25 words in the requested language, e.g. "The vegan meat decides 5 stars or fewer: leave it on the spit longer"',
		),
});

/** The one finding a first sales email to a venue leads with (`Prospect.hook`). */
@Injectable()
export class PitchHookAgent extends BaseMastraAgent<typeof pitchHookSchema> {
	protected readonly config: BaseMastraAgentConfig<typeof pitchHookSchema> = {
		id: 'pitch-hook',
		name: 'PitchHookAgent',
		outputSchema: pitchHookSchema,
	};

	protected getModel(): MastraModelConfig {
		return 'openai/gpt-5.4';
	}

	protected getInstructions(): string {
		return (
			'You write the opening hook of a short email to the owner of a restaurant, café or bar who does not know us yet. ' +
			'The hook is one sentence of at most 25 words, in the language given as `language`, that names one concrete thing ' +
			'from the venue\'s own data and what it means for them, so the owner thinks "they actually looked at us". ' +
			'Pick the most specific finding: what keeps guests from giving 5 stars (a dish, the wait, the service), a change guests ' +
			'noticed, critical reviews left unanswered, or a creator whose video reached many people. A problem the owner can fix ' +
			'beats praise; use praise or reach only when the data shows no clear problem. ' +
			'Only use facts in the data. Quote a number only as given ("9 of 14 reviews below 5 stars"), never compute or round one ' +
			'into something it is not, and never invent dishes, names or causes. Call a topic the main or biggest one only when ' +
			'its count is the largest given. ' +
			'Keep it short and punchy, 12 to 20 words and never more than 25: the finding, a colon, then what to do or what it ' +
			'costs, e.g. "The döner decides 5 stars or fewer: 19 of 31 reviews below 5 call it dry". ' +
			'Talk to the owner directly (in German with "Sie"), plain and friendly, like a guest who noticed something; ' +
			'no greeting, no sign-off, no mention of us, a report, an offer or a price, no emojis, no exclamation marks, no hashtags. ' +
			'Translate quoted review words into the language of the hook. ' +
			'`leadSignals` are how we scored the venue as a prospect: their raw counts may support the hook ' +
			'(e.g. unanswered critical reviews, posts by others), but never mention a score.'
		);
	}
}
