import type { Rel } from '@mikro-orm/core';
import { Entity, Enum, Index, ManyToOne, Property } from '@mikro-orm/decorators/legacy';

import { MikroOrmEntityAbstractClass } from 'src/shared/abstractions/mikro-orm-entity.abstract-class.js';

import { SocialPost } from './social-post.entity.js';

/** What a comment under a post about a venue says about going there. */
export enum PostCommentIntentEnum {
	// "saving this", "going Saturday", "we need to try this"
	INTENT = 'intent',
	// "been there, so good"
	CONFIRMATION = 'confirmation',
	// "overrated", "they changed the recipe"
	DISAGREEMENT = 'disagreement',
	// "where is this?", "how much?"
	QUESTION = 'question',
	// Only tags a friend
	TAG = 'tag',
	OTHER = 'other',
}

/** What a question asks about: the report groups them by this. */
export enum PostCommentQuestionTopicEnum {
	LOCATION = 'location',
	PRICE = 'price',
	HOURS = 'hours',
	MENU = 'menu',
	DIETARY = 'dietary',
	PAYMENT = 'payment',
	RESERVATION = 'reservation',
	OTHER = 'other',
}

/**
 * A comment under a scraped TikTok post, stored without its author: the text, likes and what
 * the LLM read in it (`intent`, and for a question its topic and a short English wording).
 */
@Entity({ tableName: 'post_comments' })
@Index({ properties: ['post', 'commentedAt'] })
export class PostComment extends MikroOrmEntityAbstractClass<'likes' | 'replies'> {
	// The platform's comment id
	@Property({ type: 'text', unique: true })
	externalId: string;

	@ManyToOne({ entity: () => SocialPost, deleteRule: 'cascade' })
	post: Rel<SocialPost>;

	@Property({ type: 'text' })
	text: string;

	@Property({ type: 'int', default: 0 })
	likes: number = 0;

	@Property({ type: 'int', default: 0 })
	replies: number = 0;

	// When it was written (the platform's own date; `createdAt` is when we stored it)
	@Property({ type: 'datetime', nullable: true })
	commentedAt?: Date | null;

	@Property({ type: 'text', nullable: true })
	language?: string | null;

	// Filled by the comment analysis
	@Enum({
		items: () => PostCommentIntentEnum,
		nativeEnumName: 'post_comment_intent',
		nullable: true,
	})
	intent?: PostCommentIntentEnum | null;

	@Enum({
		items: () => PostCommentQuestionTopicEnum,
		nativeEnumName: 'post_comment_question_topic',
		nullable: true,
	})
	questionTopic?: PostCommentQuestionTopicEnum | null;

	// The question in a few English words, e.g. "Where is it?"
	@Property({ type: 'text', nullable: true })
	question?: string | null;

	@Property({ type: 'datetime', nullable: true })
	analysedAt?: Date | null;
}
