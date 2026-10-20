import { Injectable } from '@nestjs/common';

import { MastraModelConfig } from '@mastra/core/llm';
import { z } from 'zod/v4';

import {
	BaseMastraAgent,
	BaseMastraAgentConfig,
} from 'src/modules/llm/abstractions/base-mastra-agent.abstract.js';

import {
	PostCommentIntentEnum,
	PostCommentQuestionTopicEnum,
} from '../entities/post-comment.entity.js';

const commentIntentSchema = z.object({
	comments: z.array(
		z.object({
			id: z.string(),
			intent: z
				.enum(PostCommentIntentEnum)
				.describe(
					'intent: wants to go or saves it; confirmation: has been and agrees; disagreement: has been or knows it and ' +
						'disagrees, finds it overrated or worse than before; question: asks something; tag: only tags friends; other',
				),
			questionTopic: z
				.enum(PostCommentQuestionTopicEnum)
				.nullable()
				.describe('For a question: what it asks about. Null otherwise'),
			question: z
				.string()
				.nullable()
				.describe('For a question: it in at most 8 English words, e.g. "Where is it?". Null otherwise'),
		}),
	),
	disagreement: z
		.string()
		.nullable()
		.describe(
			'One English sentence of at most 25 words on what the disagreeing comments say, e.g. "Several say the portions got smaller". Null when none disagree',
		),
});

/** The venue the post is about and its city: context for reading the comments. */
export interface CommentIntentContext {
	venueName: string;
	cityName: string;
}

/** What the comments under one post about a venue say: who wants to go, who disagrees, what they ask. */
@Injectable()
export class CommentIntentAgent extends BaseMastraAgent<typeof commentIntentSchema, CommentIntentContext> {
	protected readonly config: BaseMastraAgentConfig<typeof commentIntentSchema> = {
		id: 'comment-intent',
		name: 'CommentIntentAgent',
		outputSchema: commentIntentSchema,
	};

	protected getModel(): MastraModelConfig {
		return 'openai/gpt-5.4-mini';
	}

	protected getInstructions(context?: CommentIntentContext): string {
		const venue = context ? `${context.venueName} in ${context.cityName}` : 'a restaurant, bar or café';
		return (
			`You read the comments under a TikTok video about ${venue}, for a monthly report to its owner. ` +
			'Comments are in any language and full of slang and emoji. For every comment id, give the one intent that fits best. ' +
			'"Saving this", "we have to go", "going Saturday" or tagging a friend with a plan is intent; "been there, so good" is ' +
			'confirmation; "overrated", "they changed the recipe", "not worth the queue" is disagreement; a comment asking ' +
			'something is a question, with its topic (location for where is it or which branch, price, hours, menu, dietary, ' +
			'payment, reservation, other) and a short English wording. Comments about the creator, not the venue, are other. ' +
			'Only use what the comments say. Return one entry per comment id.'
		);
	}
}
