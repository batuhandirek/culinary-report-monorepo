import { Injectable } from '@nestjs/common';

import { MastraModelConfig } from '@mastra/core/llm';
import { z } from 'zod/v4';

import {
	BaseMastraAgent,
	BaseMastraAgentConfig,
} from 'src/modules/llm/abstractions/base-mastra-agent.abstract.js';

const reviewReplySchema = z.object({
	replies: z
		.array(
			z.object({
				reviewId: z.string().describe('The reviewId of the review this reply answers'),
				reply: z
					.string()
					.describe("At most 80 words, in the review's language, ready to post"),
			}),
		)
		.describe('One reply per review given'),
});

/** Replies an owner can post under the month's unanswered Google reviews. */
@Injectable()
export class ReviewReplyAgent extends BaseMastraAgent<typeof reviewReplySchema> {
	protected readonly config: BaseMastraAgentConfig<typeof reviewReplySchema> = {
		id: 'review-reply',
		name: 'ReviewReplyAgent',
		outputSchema: reviewReplySchema,
	};

	protected getModel(): MastraModelConfig {
		return 'openai/gpt-5.4';
	}

	protected getInstructions(): string {
		return (
			'You write replies a restaurant, café or bar owner posts under their Google reviews. ' +
			'Write one reply per review, in the language the review was written in (its `language` code, else the language ' +
			'of its text). At most 80 words, usually fewer. Sound like the owner: warm, plain and direct, no corporate phrases, ' +
			'no emojis, no hashtags, no signature. ' +
			'Answer what the guest actually said: name the dish or the moment they mention. ' +
			'For a critical review, thank them, acknowledge the specific problem without excuses or blaming the guest, say what ' +
			'you will look at, and invite them back; never argue, never promise refunds or discounts, never invent facts about ' +
			'the venue (staff names, changes, opening hours). ' +
			'For a positive review, thank them for the specific thing they liked; the praised topics of the month may help you ' +
			'mention what other guests enjoy too. ' +
			'Never mention stars, ratings, other reviews or that the reply was drafted.'
		);
	}
}
