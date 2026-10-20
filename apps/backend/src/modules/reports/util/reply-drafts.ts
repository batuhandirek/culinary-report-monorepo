import _ from 'lodash';

const MAX_DRAFTS = 10;

export interface ReplyCandidate {
	reviewId: string;
	publishedAt: Date;
	stars?: number | null;
	text?: string | null;
	textTranslated?: string | null;
	language?: string | null;
	ownerResponse?: string | null;
}

/**
 * The reviews a report drafts replies for: unanswered and written, the lowest stars first,
 * then the newest, ten at most.
 */
export const replyCandidates = <T extends ReplyCandidate>(reviews: T[]): T[] =>
	_.orderBy(
		reviews.filter(r => !r.ownerResponse && (r.text || r.textTranslated)),
		[r => r.stars ?? 5, r => r.publishedAt.getTime()],
		['asc', 'desc'],
	).slice(0, MAX_DRAFTS);
