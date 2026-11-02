/** What agent A is shown of a review: plain, so the eval sends the very same */
export interface ReviewClaimsSource {
	reviewId: string;
	stars: number | null;
	text: string | null;
	textTranslated: string | null;
}

/**
 * Agent A's input message for one review (one review a call: a packed call drops reviews and mixes
 * them up): the original for the quotes, the translation (when there is one) to read it by
 */
export const reviewClaimsInput = (venue: string, review: ReviewClaimsSource): string =>
	JSON.stringify({
		venue,
		stars: review.stars,
		text: review.text || review.textTranslated,
		...(review.text &&
			review.textTranslated &&
			review.textTranslated !== review.text && { translation: review.textTranslated }),
	});
