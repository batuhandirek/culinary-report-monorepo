// Whitespace folded and quotation marks around a quote ignored, case ignored: a model copying a
// span may reflow a line break or capitalise the first letter, never change a word
const fold = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();
const QUOTE_MARKS = /^["'„“”«»‘’]+|["'„“”«»‘’]+$/g;

/**
 * The quote agent A gave for a claim, when it is the source's own words: a substring of one of
 * the source's texts (a review's original, a post's caption, transcript or article) once whitespace
 * is folded and case ignored. Anything else (a translation, a paraphrase, a made-up line) is
 * dropped: a claim keeps no quote rather than a false one. Returned trimmed, marks around it removed.
 */
export const verbatimQuote = (
	quote: string | null | undefined,
	sources: (string | null | undefined)[],
): string | null => {
	const cleaned = quote?.trim().replace(QUOTE_MARKS, '').trim();
	if (!cleaned || cleaned.length < 2) return null;
	const needle = fold(cleaned);
	return sources.some(source => source && fold(source).includes(needle)) ? cleaned : null;
};
