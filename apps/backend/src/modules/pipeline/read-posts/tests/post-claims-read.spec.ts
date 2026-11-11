import { describe, expect, it } from '@jest/globals';

import { SocialPlatformEnum } from 'src/modules/social/entities/social-post.entity.js';

import type { PostClaimsAnswer } from '../agents/post-claims.agent.js';
import {
	POST_PART_CHARS,
	postClaimsPlan,
	type PostClaimsSource,
	splitText,
} from '../util/post-claims-input.js';
import { mergePostParts } from '../util/post-claims-read.js';

const place = (venueName: string, extra: Partial<PostClaimsAnswer['places'][number]> = {}) => ({
	venueName,
	locationHint: null,
	city: null,
	visited: true,
	isNewOpening: false,
	...extra,
});
// Agent A names the place a claim is about; code finds it in the list
const claim = (text: string, place: string | null) => ({
	text,
	quote: null,
	foods: [] as string[],
	amount: null,
	unit: null,
	subject: place === null ? ('city' as const) : ('place' as const),
	place,
});
const source = (text: string, extra: Partial<PostClaimsSource> = {}): PostClaimsSource => ({
	platform: SocialPlatformEnum.BLOG,
	author: 'blog.example',
	locationName: null,
	hashtags: [],
	taggedHandles: [],
	text,
	subtitles: null,
	subtitlesLanguage: null,
	...extra,
});
const sentences = (n: number, word: string) =>
	Array.from({ length: n }, (_, i) => `${word} sentence ${i + 1} is here.`).join(' ');

describe('reading a long post in parts', () => {
	it('cuts at paragraph breaks first, then sentences, never past the size', () => {
		const a = sentences(40, 'Alpha');
		const b = sentences(10, 'Beta');
		const parts = splitText(`${a}\n\n${b}`, 400);
		expect(parts.every(p => p.length <= 400)).toBe(true);
		// Every sentence kept whole, in order
		expect(parts.join(' ').replace(/\s+/g, ' ')).toBe(`${a} ${b}`);
		expect(parts.at(-1)).toContain('Beta sentence 10 is here.');
		expect(splitText('short text', 400)).toEqual(['short text']);
	});

	it('reads a short post in one call and a long one as places, then parts', () => {
		expect(postClaimsPlan(source('A short article.'))).toEqual({
			single: 'Platform: blog article on blog.example\n\nArticle:\nA short article.',
		});
		const long = `${sentences(60, 'Alpha')}\n\n${sentences(60, 'Beta')}`;
		const plan = postClaimsPlan(source(long));
		if ('single' in plan) throw new Error('expected parts');
		expect(plan.places).toContain('give no claims');
		const parts = plan.parts(['Pho House', 'Curry 36']);
		expect(parts.length).toBeGreaterThan(1);
		expect(parts[0]).toContain(`part 1 of ${parts.length} of the article`);
		expect(parts[0]).toContain('The places of the whole text: Pho House; Curry 36');
		// From the second part on, the end of the part before, for which place it goes on about
		expect(parts[0]).not.toContain('The text just before this part ends');
		expect(parts[1]).toContain('The text just before this part ends: «');
		// Each part carries its own slice of the text, not the whole
		expect(parts[0].length).toBeLessThan(POST_PART_CHARS + 1_000);
	});

	it('reads each field once: the caption in its own part, the transcript in parts with the caption as context', () => {
		const plan = postClaimsPlan(
			source('Best döner in town', {
				platform: SocialPlatformEnum.TIKTOK,
				subtitles: sentences(150, 'Talk'),
				subtitlesLanguage: 'de',
			}),
		);
		if ('single' in plan) throw new Error('expected parts');
		const parts = plan.parts([]);
		expect(parts[0]).toContain('Caption:\nBest döner in town');
		expect(parts[0]).toContain('part 1 of 1 of the caption');
		expect(parts[0]).toContain('[context only: its claims are read in other parts]');
		const transcriptParts = parts.slice(1);
		expect(transcriptParts.length).toBeGreaterThan(1);
		expect(
			transcriptParts.every(p =>
				p.includes(
					'Caption:\n[context only: its claims are read in other parts]\nBest döner in town',
				),
			),
		).toBe(true);
		expect(transcriptParts[0]).toContain(
			`part 1 of ${transcriptParts.length} of the transcript`,
		);
	});

	it("keeps a transcript's lines as lines in a part, and shows a part the end of the one before", () => {
		const lines = Array.from(
			{ length: 120 },
			(_, i) => `line number ${i + 1} of the talk`,
		).join('\n');
		const parts = splitText(lines, 400);
		expect(parts[0].split('\n').length).toBeGreaterThan(5);
		expect(parts[0]).not.toContain('\n\n');
		const plan = postClaimsPlan(
			source('', {
				platform: SocialPlatformEnum.TIKTOK,
				subtitles: lines,
				subtitlesLanguage: 'en',
			}),
		);
		if ('single' in plan) throw new Error('expected parts');
		const [, second] = plan.parts([]);
		const before = second.split('The text just before this part ends: «')[1].split('»')[0];
		expect(before.length).toBeGreaterThan(100);
	});

	it("merges the parts: the first pass's places, new ones appended, claims renumbered", () => {
		const merged = mergePostParts(
			{ isPromotional: false, places: [place('Pho House'), place('Curry 36')], claims: [] },
			[
				{
					isPromotional: false,
					// Echoed in another order, one spelled differently, one new
					places: [
						place('Curry 36', { locationHint: 'Kreuzberg' }),
						place('Pho-House'),
						place('Mustafas'),
					],
					claims: [
						claim('the currywurst', 'Curry 36'),
						claim('the pho', 'Pho-House'),
						claim('the kebab', 'Mustafas'),
						claim('Berlin', null),
					],
				},
				{
					isPromotional: true,
					places: [place('Mustafas', { isNewOpening: true })],
					claims: [claim('the queue', 'Mustafas'), claim('out of range', 'Nowhere Bar')],
				},
			],
		);
		expect(merged.places.map(p => p.venueName)).toEqual(['Pho House', 'Curry 36', 'Mustafas']);
		expect(merged.places[1].locationHint).toBe('Kreuzberg');
		// A new place keeps its part's call; a known one keeps the first pass's
		expect(merged.places[2].isNewOpening).toBe(false);
		// The first pass decides: one part's wording is not the whole article's
		expect(merged.isPromotional).toBe(false);
		expect(merged.claims.map(c => [c.text, c.place])).toEqual([
			['the currywurst', 1],
			['the pho', 0],
			['the kebab', 2],
			['Berlin', null],
			['the queue', 2],
			['out of range', null],
		]);
	});

	it('merges a place named short in one part and long in another', () => {
		const merged = mergePostParts(
			{ isPromotional: false, places: [place('Bahadur')], claims: [] },
			[
				{
					isPromotional: false,
					places: [place('Bahadur – Tandoori Grill & Currys')],
					claims: [claim('the naan', 'Bahadur – Tandoori Grill & Currys')],
				},
			],
		);
		expect(merged.places.map(p => p.venueName)).toEqual(['Bahadur']);
		expect(merged.claims[0].place).toBe(0);
	});
});
