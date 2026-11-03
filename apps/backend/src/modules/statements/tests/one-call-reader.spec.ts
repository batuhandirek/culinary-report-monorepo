import { describe, expect, it, jest } from '@jest/globals';

import { PostClaimsAgent } from 'src/modules/social/agents/post-claims.agent.js';
import { PostReaderAgent } from 'src/modules/social/agents/post-reader.agent.js';
import { SocialPlatformEnum } from 'src/modules/social/entities/social-post.entity.js';
import type { PostClaimsSource } from 'src/modules/social/util/post-claims-input.js';
import { readPostClaims } from 'src/modules/social/util/post-claims-read.js';
import { seedIndex } from 'src/modules/topics/tests/factories/topic.factory.js';
import { ReviewClaimsAgent } from 'src/modules/venues/agents/review-claims.agent.js';
import { ReviewReaderAgent } from 'src/modules/venues/agents/review-reader.agent.js';

import { ClaimPartsAgent } from '../agents/claim-parts.agent.js';
import { claimPartsOf } from '../util/claim-parts-answer.js';

const index = seedIndex();
const legend = index.aspectLegend();
const topics = index.food.map(t => t.label);
const a = new ReviewClaimsAgent();
const postA = new PostClaimsAgent();
const b = new ClaimPartsAgent();
const reviewReader = new ReviewReaderAgent(a, b);
const postReader = new PostReaderAgent(postA, b);

// OpenAI caches a prompt's start from 1,024 tokens; ~4 characters a token in English
const CACHED_FROM_CHARS = 1_024 * 4;

describe('the one-call readers', () => {
	it("compose their rules from A's and B's own, never a copy", () => {
		const review = reviewReader.rulesFor({ legend });
		expect(review).toContain(a.rulesFor());
		expect(review).toContain(b.rulesFor({ legend }));
		const post = postReader.rulesFor({ legend, topics });
		expect(post).toContain(postA.rulesFor({ cityName: '', topics }));
		expect(post).toContain(b.rulesFor({ legend }));
	});

	it("are coached as A and B are, apart from their rules", () => {
		const review = reviewReader.instructionsFor({ legend });
		expect(review).toContain(a.coachingFor());
		expect(review).toContain(b.coachingFor({ legend }));
		expect(reviewReader.rulesFor({ legend })).not.toContain(b.coachingFor({ legend }));
		const post = postReader.instructionsFor({ legend, topics });
		expect(post).toContain(postA.coachingFor());
		expect(post).toContain(b.coachingFor({ legend }));
	});

	it('keep fixed instructions past what OpenAI caches from, with no city in them', () => {
		expect(reviewReader.instructionsFor({ legend }).length).toBeGreaterThan(CACHED_FROM_CHARS);
		const post = postReader.instructionsFor({ legend, topics });
		expect(post.length).toBeGreaterThan(CACHED_FROM_CHARS);
		// A's rules open with the city when given one ("You read Hamburg social media posts"): the reader gives none
		expect(post).not.toContain(postA.rulesFor({ cityName: 'Hamburg', topics }).slice(0, 40));
		expect(post).toContain(postA.rulesFor({ cityName: '', topics }).slice(0, 40));
	});
});

const source = (text: string): PostClaimsSource => ({
	platform: SocialPlatformEnum.BLOG,
	author: 'blog.example',
	locationName: null,
	hashtags: [],
	taggedHandles: [],
	text,
	subtitles: null,
	subtitlesLanguage: null,
});
const place = (venueName: string) => ({
	venueName,
	locationHint: null,
	cuisine: null,
	city: null,
	visited: true,
	isNewOpening: false,
});
const parts = {
	sentiment: 'positive' as const,
	aspect: 'food',
	foods: ['Pommes'],
	amount: null,
	unit: null,
	kind: 'opinion' as const,
};

describe('reading a post with the one-call reader', () => {
	it('sends the city in every message and keeps each claim with its parts, a long post in parts', async () => {
		const long = Array.from({ length: 150 }, (_, i) => `Sentence ${i} about Imbiss Eins.`).join(' ');
		const generate = jest.fn(async (input: string) => ({
			object:
				input.includes('give no claims') ?
					{ isPromotional: false, places: [place('Imbiss Eins')], claims: [] }
				:	{
						isPromotional: false,
						places: [place('Imbiss Eins')],
						claims: [
							{
								text: 'the Pommes were crispy',
								quote: null,
								subject: 'place' as const,
								place: 'Imbiss Eins',
								...parts,
							},
						],
					},
			usage: { totalTokens: 100, cachedInputTokens: 60 },
			model: 'openai/gpt-5.4' as const,
		}));
		const read = await readPostClaims(
			{ generate },
			source(long),
			{ legend, topics },
			{ cityName: 'Berlin', model: 'openai/gpt-5.4' },
		);
		expect(read.calls).toBeGreaterThan(2);
		for (const [input, , options] of generate.mock.calls as unknown as [
			string,
			unknown,
			unknown,
		][]) {
			expect(input.startsWith('City: Berlin\n')).toBe(true);
			expect(options).toEqual({ model: 'openai/gpt-5.4' });
		}
		expect(read.usage).toEqual({
			totalTokens: 100 * read.calls,
			cachedInputTokens: 60 * read.calls,
		});
		// Every part's claim kept, on its place, with the parts the reader gave it
		expect(read.object.claims).toHaveLength(read.calls - 1);
		const [claim] = read.object.claims;
		expect(claim.place).toBe(0);
		expect(claimPartsOf(claim, claim.text, index)).toMatchObject({
			sentiment: 'positive',
			aspect: { key: 'food' },
			foods: ['Pommes'],
			kind: 'opinion',
		});
	});
});
