// Comments under TikTok posts: the scraper's item shape and the comments that need no LLM.

import { PostCommentIntentEnum } from '../entities/post-comment.entity.js';

/** What a stored comment takes from one item of `clockworks/tiktok-comments-scraper`. */
export interface CommentFields {
	externalId: string;
	text: string;
	likes: number;
	replies: number;
	commentedAt: Date | null;
	language: string | null;
}

/**
 * One item of `clockworks/tiktok-comments-scraper` (`cid`, `text`, `createTimeISO`, `diggCount`,
 * `replyCommentTotal`, `repliesToId` for a reply, `videoWebUrl` = the post). It gives no
 * language, so `language` stays null. The author (`uniqueId`, `uid`) is never stored.
 */
export const fromClockworksComment = (item: any): CommentFields | null => {
	const text = typeof item?.text === 'string' ? item.text.trim() : '';
	if (!item?.cid || !text) return null;
	const count = (n: unknown) => (typeof n === 'number' && n > 0 ? n : 0);
	return {
		externalId: `${item.cid}`,
		text,
		likes: count(item.diggCount),
		replies: count(item.replyCommentTotal),
		commentedAt: item.createTimeISO ? new Date(item.createTimeISO) : null,
		language: null,
	};
};

/**
 * Comments whose intent is plain without a model: only @-tags of friends are `tag`, only emoji
 * or punctuation is `other`. Null for everything else.
 */
export const plainIntent = (text: string): PostCommentIntentEnum | null => {
	const t = text.trim();
	if (/^(@[\w.]+[\s,]*)+$/u.test(t)) return PostCommentIntentEnum.TAG;
	if (!/[\p{L}\p{N}]/u.test(t)) return PostCommentIntentEnum.OTHER;
	return null;
};
