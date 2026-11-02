import { describe, expect, it } from '@jest/globals';

import { verbatimQuote } from '../util/quotes.js';

/* A claim keeps the source's own words only when they are the source's: a substring of one of its texts. */
describe('verbatimQuote', () => {
	const review = 'Die Pommes waren matschig.\nAber der Döner   war richtig gut!';

	it('keeps a span of the source, whitespace folded and case ignored, as the agent gave it', () => {
		expect(verbatimQuote('Die Pommes waren matschig', [review])).toBe(
			'Die Pommes waren matschig',
		);
		expect(verbatimQuote('matschig. aber der döner war', [review])).toBe(
			'matschig. aber der döner war',
		);
		expect(verbatimQuote('  der Döner war richtig gut  ', [review])).toBe(
			'der Döner war richtig gut',
		);
	});

	it('strips the quotation marks a model wraps a quote in', () => {
		expect(verbatimQuote('"Die Pommes waren matschig"', [review])).toBe(
			'Die Pommes waren matschig',
		);
		expect(verbatimQuote('„der Döner war richtig gut“', [review])).toBe(
			'der Döner war richtig gut',
		);
	});

	it('looks in every text of the source: a post’s caption or its transcript', () => {
		expect(
			verbatimQuote('best kebab in town', [
				null,
				'caption here',
				'honestly the best kebab in town',
			]),
		).toBe('best kebab in town');
	});

	it('drops a translation, a paraphrase or a made-up line, and nothing at all', () => {
		expect(verbatimQuote('the fries were soggy', [review])).toBeNull();
		expect(verbatimQuote('Die Pommes waren sehr matschig', [review])).toBeNull();
		expect(verbatimQuote(null, [review])).toBeNull();
		expect(verbatimQuote(undefined, [review])).toBeNull();
		expect(verbatimQuote('', [review])).toBeNull();
		expect(verbatimQuote('a', [review])).toBeNull();
		expect(verbatimQuote('Die Pommes', [null, undefined])).toBeNull();
	});
});
