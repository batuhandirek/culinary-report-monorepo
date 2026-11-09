import { Injectable } from '@nestjs/common';

import { z } from 'zod/v4';

import {
	BaseMastraAgent,
	BaseMastraAgentConfig,
} from 'src/modules/llm/abstractions/base-mastra-agent.abstract.js';
import type { LlmModelChoice } from 'src/modules/llm/constants/llm-models.constant.js';
import {
	PostCommentIntentEnum,
	PostCommentQuestionTopicEnum,
} from 'src/modules/social/entities/post-comment.entity.js';

const commentIntentSchema = z.object({
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
		.describe(
			'For a question: it in at most 8 English words, e.g. "Where is it?". Null otherwise',
		),
});

/** The city the posts are about (the venue goes in the message: what differs per post never breaks the cached instructions) */
/** The agent's answer on one comment */
export type CommentIntentAnswer = z.infer<typeof commentIntentSchema>;

export interface CommentIntentContext {
	cityName: string;
}

/** What one comment under a post about a venue says: wants to go, has been and agrees or disagrees, asks (one comment a call). */
@Injectable()
export class CommentIntentAgent extends BaseMastraAgent<
	typeof commentIntentSchema,
	CommentIntentContext
> {
	protected readonly config: BaseMastraAgentConfig<typeof commentIntentSchema> = {
		id: 'comment-intent',
		name: 'CommentIntentAgent',
		outputSchema: commentIntentSchema,
	};

	protected getModel(): LlmModelChoice {
		return 'mini';
	}

	protected getInstructions(context?: CommentIntentContext): string {
		const city = context?.cityName ?? 'the city';
		return (
			`You read one comment under a TikTok video about a restaurant, bar or café in ${city} (named in the input), for a monthly report to its owner, with the video's caption. ` +
			'Comments are in any language and full of slang and emoji. Give the one intent that fits best. ' +
			'"Saving this", "we have to go", "going Saturday" or tagging a friend with a plan is intent; "been there, so good" is ' +
			'confirmation; "overrated", "they changed the recipe", "not worth the queue" is disagreement; a comment asking ' +
			'something is a question, with its topic (location for where is it or which branch, price, hours, menu, dietary, ' +
			'payment, reservation, other) and a short English wording. A comment about the creator, not the venue, is other. ' +
			'Only use what the comment says.'
		);
	}

	// Worked examples (invented): they teach the cases a quick model gets wrong, and keep the fixed
	// instructions past the 1,024 tokens a provider caches from
	protected getCoaching(): string {
		return (
			'Examples: "omg saving this for Friday 😍" intent; "@lena we HAVE to go" intent; "@lena 😂" tag; "been 3 times, the ' +
			'dumplings are unreal" confirmation; "fr best pho in town" confirmation; "overrated, waited an hour for mid food" ' +
			'disagreement; "they changed the recipe, not the same anymore" disagreement; "used to be good before the new owners" ' +
			'disagreement; "is it halal?" question, dietary, "Is it halal?"; "where is this??" question, location, "Where is it?"; ' +
			'"which branch, Mitte or Kreuzberg?" question, location, "Which branch is it?"; "how much was the platter?" question, ' +
			'price, "How much is the platter?"; "do they take cards" question, payment, "Do they take cards?"; "open on Sundays?" ' +
			'question, hours, "Is it open on Sundays?"; "can you book a table" question, reservation, "Can you reserve?"; "your ' +
			'voice is so calming" other (about the creator); "first 🔥" other; "song name?" other (about the video, not the venue); ' +
			'"Lecker, war gestern da 👍" confirmation; "çok pahalı ama güzel" confirmation (has been, likes it, mentions the price); ' +
			'"nie wieder, total versalzen" disagreement. A comment that both asks and agrees ("so good! is it open late?") is a ' +
			'question; one that tags a friend with a plan is intent, a bare tag is tag.'
		);
	}
}
