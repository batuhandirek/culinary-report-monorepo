import { defineActor } from './actor.js';

/**
 * `clockworks/tiktok-comments-scraper`: a post's comments, most liked first, $0.00125 a comment on
 * the Free plan. `topLevelCommentsPerPost` caps the top-level ones; `maxRepliesPerComment: 0`
 * leaves replies out (a reply that slips through carries `repliesToId`). Items name their post in
 * `videoWebUrl` and carry no language. 1 GB of memory is plenty for one post. The author's fields
 * (`uid`, `uniqueId`) are never stored.
 */
export interface TiktokCommentsInput {
	postURLs: string[];
	topLevelCommentsPerPost: number;
	commentsPerPost: number;
	maxRepliesPerComment: number;
}

export interface TiktokCommentItem {
	/** The comment's id */
	cid?: string;
	text?: string;
	/** Unix seconds */
	createTime?: number;
	createTimeISO?: string;
	diggCount?: number;
	replyCommentTotal?: number;
	/** Set on a reply: the comment it answers */
	repliesToId?: string | null;
	/** The post */
	videoWebUrl?: string;
	submittedVideoUrl?: string;
	input?: string;
	likedByAuthor?: boolean;
	pinnedByAuthor?: boolean;
	uid?: string;
	uniqueId?: string;
	mentions?: string[];
}

export const TIKTOK_COMMENTS_ACTOR = defineActor<TiktokCommentsInput, TiktokCommentItem>(
	'clockworks/tiktok-comments-scraper',
);
