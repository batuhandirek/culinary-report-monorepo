import type {
	CommentsForReading,
	DisagreeingComments,
} from 'src/modules/social/services/post-comment.service.js';

/** The intent agent's message for one comment: the venue, the start of the caption, the comment */
export const commentIntentMessage = (
	post: Pick<CommentsForReading, 'venue' | 'caption'>,
	comment: CommentsForReading['ask'][number],
): string =>
	JSON.stringify({
		venue: post.venue,
		caption: post.caption?.slice(0, 500) ?? null,
		comment: { text: comment.text.slice(0, 400), likes: comment.likes },
	});

/** The disagreement agent's message for one post's disagreeing comments */
export const commentDisagreementMessage = (disagreeing: DisagreeingComments): string =>
	JSON.stringify({
		venue: disagreeing.venue,
		caption: disagreeing.caption?.slice(0, 500) ?? null,
		comments: disagreeing.comments.map(c => c.slice(0, 400)),
	});
