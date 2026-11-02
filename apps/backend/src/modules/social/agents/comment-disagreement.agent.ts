import { Injectable } from '@nestjs/common';

import { z } from 'zod/v4';

import {
	BaseMastraAgent,
	BaseMastraAgentConfig,
} from 'src/modules/llm/abstractions/base-mastra-agent.abstract.js';
import type { LlmModelChoice } from 'src/modules/llm/constants/llm-models.constant.js';

import type { CommentIntentContext } from './comment-intent.agent.js';

const commentDisagreementSchema = z.object({
	summary: z
		.string()
		.describe(
			'One English sentence of at most 25 words on what these comments disagree about, e.g. "Several say the portions got smaller"',
		),
});

/**
 * What the disagreeing comments under one post say, in one sentence (`SocialPost.commentsDisagreement`):
 * one post a call, after `CommentIntentAgent` found which comments disagree.
 */
@Injectable()
export class CommentDisagreementAgent extends BaseMastraAgent<
	typeof commentDisagreementSchema,
	CommentIntentContext
> {
	protected readonly config: BaseMastraAgentConfig<typeof commentDisagreementSchema> = {
		id: 'comment-disagreement',
		name: 'CommentDisagreementAgent',
		outputSchema: commentDisagreementSchema,
	};

	protected getModel(): LlmModelChoice {
		return 'mini';
	}

	protected getInstructions(context?: CommentIntentContext): string {
		const city = context?.cityName ?? 'the city';
		return (
			`You read the comments under one TikTok video about a restaurant, bar or café in ${city} (named in the input) that ` +
			'disagree with it (overrated, worse than before, not worth the queue), for a monthly report to its owner. Say in one ' +
			'English sentence of at most 25 words what they disagree about, the most said first. Only use what the comments say.'
		);
	}
}
