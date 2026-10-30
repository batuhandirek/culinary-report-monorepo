import { describe, expect, it } from '@jest/globals';

import type { EditorPack } from '../util/editor-pack.js';
import { checkHighlights, type EditorAnswer, fallbackHighlights, sentencesOf } from '../util/highlights-check.js';

const PACK = {
	brand: { name: 'Nhas City Chicken', places: [] },
	month: 'September 2026',
	inNumbers: { postsByOthers: 6, views: 1187886, reviews: 250, writtenReviews: 127, averageStars: 4.8, answeredByOwner: '1 of 250' },
	postsByOthers: [{ creator: '@navito on TikTok, 492700 followers', views: 626500, commentsUnderIt: { read: 79, whatTheDisagreeingOnesSay: 'hype' } }],
	gaps: [],
} as unknown as EditorPack;

const answer = (overrides: Partial<EditorAnswer> = {}): EditorAnswer => ({
	kind: 'story',
	title: 'Hype, and a warning under it',
	headline: 'About 1.2M people saw posts about you this month, and the mood in the comments is turning.',
	letter: [
		'One TikTok creator with half a million followers did most of it: 627k views on one video. Under it, people started calling the place overpriced.',
		'You answered one review of the 250 that came in.',
	],
	attention: [{ title: 'The comments are turning', text: 'Eleven of the comments under the top post disagree.' }],
	tryThis: [{ title: 'Answer the critical reviews', text: 'Start with the one-star ones.' }],
	notes: 'Read the comments.',
	...overrides,
});

describe('checkHighlights', () => {
	it('lets through lines whose numbers were given, as written or rounded, and maps the cards', () => {
		const problems: string[] = [];
		const out = checkHighlights(answer(), PACK, [PACK], (where, problem) => problems.push(`${where}: ${problem}`));
		expect(problems).toEqual([]);
		expect(out).toMatchObject({
			kind: 'story',
			title: 'Hype, and a warning under it',
			letter: answer().letter,
			highlights: [{ title: 'The comments are turning' }],
			actions: [{ title: 'Answer the critical reviews' }],
			notes: 'Read the comments.',
		});
	});

	it('cuts a sentence stating a number it was not given, drops a card with one, and records both', () => {
		const problems: string[] = [];
		const out = checkHighlights(
			answer({
				letter: ['One TikTok creator did most of it. Together your posts reached 1.8M people. You answered one review of the 250.'],
				attention: [{ title: 'Reach', text: 'About 3.4M people saw you.' }, { title: 'Reviews', text: '250 came in.' }],
			}),
			PACK,
			[PACK],
			(where, problem) => problems.push(`${where}: ${problem}`),
		);
		expect(out.letter).toEqual(['One TikTok creator did most of it. You answered one review of the 250.']);
		expect(out.highlights).toEqual([{ title: 'Reviews', text: '250 came in.' }]);
		expect(problems).toEqual([
			'letter paragraph 1 sentence 2: states 1800000, which it was not given',
			'attention 1: states 3400000, which it was not given',
		]);
	});

	it("takes a tool answer's numbers as given", () => {
		const out = checkHighlights(
			answer({ letter: ['The week of 21 September brought 83 reviews.'] }),
			PACK,
			[PACK, { week: '2026-09-21', reviews: 83 }],
		);
		expect(out.letter).toEqual(['The week of 21 September brought 83 reviews.']);
	});

	it("drops a line naming a field of the material, saying 'source:' or a banned word", () => {
		const problems: string[] = [];
		const out = checkHighlights(
			answer({
				letter: ['The postsByOthers list shows one big video. One creator carried the month, source: TikTok. A viral moment. The rest was quiet.'],
				tryThis: [{ title: 'Leverage the hype', text: 'Post more.' }],
			}),
			PACK,
			[PACK],
			(where, problem) => problems.push(`${where}: ${problem}`),
		);
		expect(out.letter).toEqual(['The rest was quiet.']);
		expect(out.actions).toEqual([]);
		expect(problems).toEqual([
			'letter paragraph 1 sentence 1: names the input field postsByOthers',
			'letter paragraph 1 sentence 2: says "source:"',
			'letter paragraph 1 sentence 3: says viral',
			'try this 1 title: says Leverage',
		]);
	});

	it('stands the fallback in for an empty letter, a failed title or headline, and a failed agent', () => {
		const problems: string[] = [];
		const out = checkHighlights(
			answer({ title: 'A 9.9M month', headline: '', letter: ['Reach hit 9.9M.'], attention: [], tryThis: [] }),
			PACK,
			[PACK],
			(where, problem) => problems.push(`${where}: ${problem}`),
		);
		expect(out.title).toBe('September 2026 at Nhas City Chicken');
		expect(out.letter).toEqual(['6 people posted about you in September 2026, and 250 guests reviewed you on Google, 127 with words. The figures are in the sections below.']);
		expect(out.headline).toBe(out.letter![0]);
		expect(problems).toEqual(expect.arrayContaining(['letter: empty after the check: the fallback stands in', 'headline: empty']));

		const failed = checkHighlights(null, PACK, [PACK]);
		expect(failed).toEqual({ ...fallbackHighlights(PACK) });
		expect(failed.kind).toBe('quiet');
		expect(failed.highlights).toEqual([]);
	});

	it('writes the fallback for a month with nothing', () => {
		const out = fallbackHighlights({ ...PACK, inNumbers: { postsByOthers: 0, reviews: 0, monthBefore: undefined } });
		expect(out.headline).toBe('Nobody posted about you in September 2026, and no Google review of the month was read. The figures are in the sections below.');
	});
});

describe('sentencesOf', () => {
	it('splits at sentence ends before a capital, a quote, a handle or a digit, and keeps decimals and handles whole', () => {
		expect(sentencesOf('Views reached 1.2M. @navito did most of it. "Overpriced," said some. 250 reviews came in.')).toEqual([
			'Views reached 1.2M.',
			'@navito did most of it.',
			'"Overpriced," said some.',
			'250 reviews came in.',
		]);
		expect(sentencesOf('Views held at 1.2M, i.e. flat… and then nothing.')).toEqual(['Views held at 1.2M, i.e. flat… and then nothing.']);
	});
});
