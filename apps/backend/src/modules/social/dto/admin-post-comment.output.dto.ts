import type {
	PostCommentIntentEnum,
	PostCommentQuestionTopicEnum,
} from '../entities/post-comment.entity.js';

/** A comment under a post, as stored: no author. */
export interface AdminPostCommentOutputDto {
	id: string;
	externalId: string;
	text: string;
	likes: number;
	replies: number;
	commentedAt?: string;
	language?: string;
	/** Absent until the comment analysis ran */
	intent?: PostCommentIntentEnum;
	questionTopic?: PostCommentQuestionTopicEnum;
	question?: string;
}

/** A post's scraped comments, most liked first. */
export interface AdminPostCommentsOutputDto {
	/** Absent when its comments were never scraped */
	scrapedAt?: string;
	/** What the disagreeing comments say, in one line */
	disagreement?: string;
	comments: AdminPostCommentOutputDto[];
}
