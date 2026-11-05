import { describe, expect, it } from '@jest/globals';

import type {
	EvalClaim,
	EvalMatch,
	ReferenceClaim,
	ReviewCase,
} from '../interfaces/eval-case.interface.js';
import { applyRulings, type Ruling } from '../services/eval-adjudication.service.js';
import { type CaseTallies, compareRuns } from '../util/eval-compare.js';
import { costUsd } from '../util/eval-cost.js';
import { renderReport } from '../util/eval-report.js';
import { languageGroup, pickStratified } from '../util/eval-sample.js';
import {
	pairPlaces,
	sameFood,
	scoreClaims,
	scoreLabels,
	scorePost,
	scoreTerm,
	validLinks,
} from '../util/eval-score.js';

const claim = (text: string, parts: Partial<EvalClaim> = {}): EvalClaim => ({
	text,
	quote: null,
	sentiment: 'positive',
	aspect: 'taste',
	foods: [],
	amount: null,
	unit: null,
	kind: 'opinion',
	...parts,
});
const ref = (text: string, parts: Partial<ReferenceClaim> = {}): ReferenceClaim => ({
	...claim(text),
	foods: [],
	optional: false,
	alsoAcceptable: { sentiments: [], aspects: [], kinds: [] },
	...parts,
});
const ROOTS: Record<string, string> = {
	taste: 'food',
	portion_size: 'food',
	friendliness: 'service',
	price_level: 'price',
};
const rootOf = (a: string) => ROOTS[a];
const match = (brandId: string | null, venueId: string | null = null): EvalMatch => ({
	method: null,
	brandId,
	brandName: brandId,
	venueId,
	venueName: venueId,
});
const same = (a: string, b: string) => (a.toLowerCase() === b.toLowerCase() ? 1 : 0);

describe('eval scoring', () => {
	it('counts recall over required reference claims and precision over produced ones', () => {
		const { tally, issues } = scoreClaims(
			'c',
			[
				ref('the döner was great'),
				ref('a detail', { optional: true }),
				ref('the staff was rude'),
			],
			[claim('the döner was very tasty'), claim('came on a Tuesday')],
			[[0, 0]],
			rootOf,
		);
		// The optional one unpaired is no miss
		expect(tally['claims.recall']).toEqual([1, 2]);
		expect(tally['claims.precision']).toEqual([1, 2]);
		expect(issues.map(i => i.metric).sort()).toEqual(['claims.extra', 'claims.missed']);
	});

	it('scores parts against the reference or what it also accepts, the aspect also at its root', () => {
		const { tally } = scoreClaims(
			'c',
			[
				ref('portions were small', {
					sentiment: 'negative',
					aspect: 'portion_size',
					alsoAcceptable: { sentiments: ['mixed'], aspects: [], kinds: [] },
				}),
				ref('the fries were good', { foods: ['Pommes', 'Mayo'] }),
				ref('waited 40 minutes', {
					aspect: null,
					amount: 40,
					unit: 'minutes',
					alsoAcceptable: { sentiments: [], aspects: ['none'], kinds: [] },
				}),
			],
			[
				claim('the portions were small', { sentiment: 'mixed', aspect: 'taste' }),
				claim('the Pommes were good', { foods: ['pommes'] }),
				claim('we waited 40 min', { aspect: null, amount: 40, unit: 'minutes' }),
			],
			[
				[0, 0],
				[1, 1],
				[2, 2],
			],
			rootOf,
		);
		expect(tally['parts.sentiment']).toEqual([3, 3]);
		// taste for portion_size: wrong exactly, right at the root (food)
		expect(tally['parts.aspect']).toEqual([2, 3]);
		expect(tally['parts.aspect_root']).toEqual([3, 3]);
		expect(tally['parts.amount']).toEqual([1, 1]);
		// Foods by term key: "pommes" is "Pommes", Mayo missed
		expect(tally['parts.foods_precision']).toEqual([1, 1]);
		expect(tally['parts.foods_recall']).toEqual([1, 2]);
	});

	it('scores a change over every claim: an unpaired produced change is a false one', () => {
		const { tally } = scoreClaims(
			'c',
			[ref('prices went up', { kind: 'change' }), ref('delicious as always')],
			[
				claim('the prices went up', { kind: 'change' }),
				claim('as delicious as before', { kind: 'change' }),
				claim('new owner', { kind: 'change' }),
			],
			[
				[0, 0],
				[1, 1],
			],
			rootOf,
		);
		expect(tally['change.precision']).toEqual([1, 3]);
		expect(tally['change.recall']).toEqual([1, 1]);
	});

	it('keeps links inside the lists and each once', () => {
		expect(
			validLinks(
				[
					[0, 0],
					[0, 1],
					[0, 0],
					[2, 5],
					[1, 1],
				],
				2,
				2,
			),
		).toEqual([
			[0, 0],
			[0, 1],
			[1, 1],
		]);
	});

	it('counts a split or a merge as found, and an unread kind as unread, not wrong', () => {
		const { tally } = scoreClaims(
			'c',
			[
				ref('the staff were cool and great'),
				ref('the fries were salty', { kind: 'opinion' }),
			],
			[
				claim('the staff were cool'),
				claim('the staff were great'),
				claim('the fries were too salty', { kind: null }),
			],
			[
				[0, 0],
				[0, 1],
				[1, 2],
			],
			rootOf,
		);
		expect(tally['claims.recall']).toEqual([2, 2]);
		expect(tally['claims.precision']).toEqual([3, 3]);
		// The split one's parts scored once, on its best fragment; the unread kind not at all
		expect(tally['parts.kind']).toEqual([1, 1]);
		expect(tally['parts.kind_read']).toEqual([1, 2]);
	});

	it("scores a split claim's parts on its best fragment, and a claim B never read not at all", () => {
		const { tally, issues } = scoreClaims(
			'c',
			[
				ref('despite reserving they had to eat outside', {
					sentiment: 'negative',
					aspect: 'reservation_handling' as never,
				}),
				ref('the soup was hot', { aspect: 'taste' }),
			],
			[
				claim('they reserved in advance', {
					sentiment: 'neutral',
					aspect: null,
					kind: 'fact',
				}),
				claim('they had to eat outside', {
					sentiment: 'negative',
					aspect: 'reservation_handling' as never,
				}),
				claim('the soup was hot', { sentiment: null, kind: null, aspect: null }),
			],
			[
				[0, 0],
				[0, 1],
				[1, 2],
			],
			rootOf,
		);
		expect(tally['parts.sentiment']).toEqual([1, 1]);
		expect(tally['parts.aspect']).toEqual([1, 1]);
		expect(issues.filter(i => i.metric.startsWith('parts.'))).toEqual([]);
	});

	it('scores foods over a split as a whole', () => {
		const { tally, issues } = scoreClaims(
			'c',
			[ref('ordered beer, cola and juice', { foods: ['Bier', 'Cola', 'Saft'] })],
			[
				claim('ordered beer', { foods: ['Bier'] }),
				claim('ordered cola', { foods: ['Cola'] }),
				claim('ordered juice', { foods: ['juice'] }),
			],
			[
				[0, 0],
				[0, 1],
				[0, 2],
			],
			rootOf,
		);
		// Saft missed (translated to juice), not Cola and Bier once per piece
		expect(tally['parts.foods_recall']).toEqual([2, 3]);
		expect(tally['parts.foods_precision']).toEqual([2, 3]);
		expect(issues.filter(i => i.metric === 'parts.foods')).toHaveLength(2);
	});

	it('leaves foods a classifier never read out of the scores, and counts its sure answers apart', () => {
		const { tally, issues } = scoreClaims(
			'c',
			[ref('the fries were cold', { foods: ['fries'] })],
			[
				claim('the fries were cold', {
					foods: null,
					aspect: 'portion_size',
					probability: { sentiment: 0.95, aspect: 0.5 },
				}),
			],
			[[0, 0]],
			rootOf,
		);
		expect(tally['parts.foods_recall']).toBeUndefined();
		expect(tally['parts.foods_precision']).toBeUndefined();
		expect(issues.filter(i => i.metric === 'parts.foods')).toEqual([]);
		// Sure of the sentiment (and right), unsure of the aspect (and wrong)
		expect(tally['sure.sentiment']).toEqual([1, 1]);
		expect(tally['parts.sentiment@sure']).toEqual([1, 1]);
		expect(tally['sure.aspect']).toEqual([0, 1]);
		expect(tally['parts.aspect@sure']).toBeUndefined();
		expect(tally['parts.aspect']).toEqual([0, 1]);
	});

	it("scores the reference's own claims labelled one to one, on the parts alone", () => {
		const { tally, issues } = scoreLabels(
			'c',
			[ref('the burger was juicy'), ref('the staff was rude', { sentiment: 'negative' })],
			[claim('the burger was juicy'), claim('the staff was rude')],
			rootOf,
		);
		expect(tally['claims.recall']).toBeUndefined();
		expect(tally['claims.precision']).toBeUndefined();
		expect(tally['parts.sentiment']).toEqual([1, 2]);
		expect(issues.map(i => i.metric)).toEqual(['parts.sentiment']);
	});

	it('pairs places by name, best first', () => {
		expect(
			pairPlaces(
				[{ venueName: 'Doree 65' }, { venueName: 'Mustafa' }],
				[{ venueName: 'mustafa' }, { venueName: 'Other' }],
				same,
				0.7,
			),
		).toEqual([[1, 0]]);
		// Matched to the same brand: one place, however differently spelled
		expect(
			pairPlaces(
				[{ venueName: 'Magma', match: match('b1') }],
				[{ venueName: 'Magma Berlin', match: match('b1') }],
				same,
				0.7,
			),
		).toEqual([[0, 0]]);
	});

	it("scores a post's places, matches and which place each claim is about", () => {
		const { tally } = scorePost(
			'p',
			{
				isPromotional: false,
				places: [
					{
						venueName: 'Burgermeister',
						locationHint: null,
						city: null,
						visited: true,
						isNewOpening: false,
						match: match('bm'),
					},
					{
						venueName: 'Doree',
						locationHint: null,
						city: null,
						visited: true,
						isNewOpening: false,
						match: match('dr', 'dr-1'),
					},
				],
				claims: [
					{ ...ref('Burgermeister fries are good'), subject: 'place', place: 0 },
					{ ...ref('Berlin is pricey'), subject: 'city', place: null },
				],
			},
			{
				isPromotional: true,
				places: [
					{
						venueName: 'Doree',
						locationHint: null,
						city: null,
						visited: true,
						isNewOpening: false,
						match: match('dr', null),
					},
					{
						venueName: 'Burgermeister',
						locationHint: null,
						city: null,
						visited: true,
						isNewOpening: false,
						match: match('bm'),
					},
					{
						venueName: 'Park',
						locationHint: null,
						city: null,
						visited: true,
						isNewOpening: false,
						match: match(null),
					},
				],
				claims: [
					{ ...claim('the fries at Burgermeister are good'), subject: 'place', place: 1 },
					{ ...claim('Berlin is expensive'), subject: 'none', place: null },
				],
				referencePlaceMatches: [match('bm'), match(null)],
			},
			[
				[0, 0],
				[1, 1],
			],
			same,
			0.7,
			rootOf,
		);
		expect(tally['places.recall']).toEqual([2, 2]);
		expect(tally['places.precision']).toEqual([2, 3]);
		expect(tally['match.brand']).toEqual([2, 2]);
		// Doree's branch was not given
		expect(tally['match.branch']).toEqual([1, 2]);
		expect(tally['match_isolated.brand']).toEqual([1, 2]);
		expect(tally['claims.subject']).toEqual([1, 2]);
		// The produced place index 1 is the reference's place 0
		expect(tally['claims.place']).toEqual([1, 1]);
		expect(tally['post.promotional']).toEqual([0, 1]);
	});

	it("scores a wording's topics against the reference and what it also accepts", () => {
		const vegan = scoreTerm(
			't',
			'vegan döner',
			{
				topics: [
					{ key: 'kebab', relation: 'kind_of' },
					{ key: 'vegan', relation: 'with' },
				],
				alsoAcceptable: ['turkish'],
			},
			{
				topics: [
					{ key: 'kebab', relation: 'same' },
					{ key: 'turkish', relation: 'with' },
				],
			},
		);
		expect(vegan.tally).toMatchObject({
			'terms.precision': [2, 2],
			'terms.recall': [1, 2],
			'terms.exact': [0, 1],
			'terms.first': [1, 1],
			'terms.relation': [0, 1],
		});
		expect(
			scoreTerm('t', 'food', { topics: [], alsoAcceptable: [] }, { topics: [] }).tally,
		).toEqual({ 'terms.none': [1, 1] });
	});

	it('renders a report that escapes case text', () => {
		const md = renderReport(
			{
				label: 'x',
				at: '2026-11-01T10:00:00Z',
				cases: { review: 1, post: 0, term: 0 },
				unscored: 0,
				byKind: { review: { 'claims.recall': [1, 2] } },
				byTag: {},
				models: {},
				tokens: 0,
				staleReferences: 0,
			},
			[],
			[{ caseId: 'c', metric: 'claims.missed', detail: 'a | b `code`' }],
		);
		expect(md).toContain('| Claims found (of the reference) | 50% (1/2) |');
		expect(md).toContain('a \\| b \\`code\\`');
	});
});

describe('eval sampling and cost', () => {
	it('fills a sample under its caps, counting what is already taken', () => {
		const rows = ['de', 'de', 'en', 'de', 'tr', 'en'].map((lang, id) => ({ id, lang }));
		const picked = pickStratified(rows, 4, r => [`lang:${r.lang}`], { 'lang:de': 2 }, [
			{ lang: 'de' },
		]);
		expect(picked.map(r => r.id)).toEqual([0, 2, 4, 5]);
		expect(languageGroup('zh-Hans')).toBe('other');
		expect(languageGroup('de')).toBe('de');
	});

	it('prices cached and written input apart, and nothing for a model with no price', () => {
		const usage = {
			inputTokens: 10_000,
			outputTokens: 1_000,
			cachedInputTokens: 4_000,
			cacheWriteTokens: 2_000,
		};
		expect(costUsd('anthropic/claude-opus-5-5', usage)).toBeCloseTo(
			(4_000 * 4 + 4_000 * 0.4 + 2_000 * 5 + 1_000 * 20) / 1e6,
		);
		expect(costUsd('openai/gpt-5.4-mini', usage)).toBe(0);
	});
});

describe('eval rulings', () => {
	const review = (): ReviewCase => ({
		id: 'review-x',
		kind: 'review',
		tags: [],
		collectedAt: '',
		source: {} as ReviewCase['source'],
		stored: { analysedAt: null, claims: [] },
		reference: {
			model: 'm',
			specHash: 'h',
			at: '',
			usage: { inputTokens: 0, outputTokens: 0, cachedInputTokens: 0, cacheWriteTokens: 0 },
			notes: null,
			claims: [ref('the döner was great'), ref('a minor aside')],
		},
	});
	const rule = (
		metric: string,
		verdict: Ruling['verdict'],
		at: { ref?: number; got?: number },
	): Ruling => ({
		caseId: 'review-x',
		metric,
		detail: '',
		verdict,
		reason: 'because',
		...at,
	});

	it('folds rulings into the reference and logs each, never an agent error', () => {
		const c = review();
		const output = {
			claims: [
				claim('the döner was very tasty', { aspect: 'portion_size', sentiment: 'mixed' }),
				claim('came with friends'),
			],
		};
		const changed = applyRulings(
			c,
			output,
			[
				rule('parts.aspect', 'both_ok', { ref: 0, got: 0 }),
				rule('parts.sentiment', 'reference_wrong', { ref: 0, got: 0 }),
				rule('claims.missed', 'both_ok', { ref: 1 }),
				rule('claims.extra', 'reference_wrong', { got: 1 }),
				rule('parts.kind', 'agent_wrong', { ref: 0, got: 0 }),
			],
			'baseline',
		);
		expect(changed).toBe(4);
		const [first, second, added] = c.reference!.claims;
		expect(first.alsoAcceptable.aspects).toEqual(['portion_size']);
		expect(first.sentiment).toBe('mixed');
		expect(second.optional).toBe(true);
		expect(added).toMatchObject({ text: 'came with friends', optional: true });
		expect(c.reference!.revisions).toHaveLength(4);
		expect(c.reference!.revisions![0]).toMatchObject({ by: 'adjudication:baseline' });
	});

	it('compares runs case by case: a clear gain is better, a gap inside the noise is not', () => {
		const runOf = (hits: (id: number) => number): CaseTallies =>
			Object.fromEntries(
				Array.from({ length: 60 }, (_, i) => [
					`post-${i}`,
					{
						kind: 'post' as const,
						tally: { 'claims.recall': [hits(i), 10] as [number, number] },
					},
				]),
			);
		const base = runOf(() => 6);
		const noise: [CaseTallies, CaseTallies] = [base, runOf(i => (i % 2 ? 7 : 6))];
		const rows = compareRuns(
			base,
			runOf(() => 9),
			{ noise, split: 'all' },
		);
		expect(rows).toHaveLength(1);
		expect(rows[0].delta).toBeCloseTo(30);
		expect(rows[0].verdict).toBe('better');
		// 5 points of gain against 5 points of noise between two runs of the same prompts: not shown
		const small = compareRuns(
			base,
			runOf(i => (i % 2 ? 7 : 6)),
			{ noise, split: 'all' },
		);
		expect(small[0].threshold).toBeGreaterThanOrEqual(5);
		expect(small[0].verdict).toBe('same');
		expect(
			compareRuns(
				base,
				runOf(() => 3),
				{ split: 'all' },
			)[0].verdict,
		).toBe('worse');
	});

	it('counts a food named shorter or longer as the same food', () => {
		expect(sameFood('naan', new Set(['naan bread']))).toBe(true);
		expect(sameFood('steak frite', new Set(['frite']))).toBe(true);
		expect(sameFood('naan', new Set(['pita bread']))).toBe(false);
	});

	it("reads the reference's kinds through the stored rule: a fact allowed to judge accepts opinion", () => {
		const { tally } = scoreClaims(
			'c',
			[
				ref('serves handmade pasta', {
					sentiment: 'neutral',
					kind: 'fact',
					alsoAcceptable: { sentiments: ['positive'], aspects: [], kinds: [] },
				}),
				ref('the pasta was fine', { sentiment: 'positive', kind: 'opinion' }),
			],
			[
				claim('they serve handmade pasta', { sentiment: 'positive', kind: 'opinion' }),
				claim('the pasta was fine', { sentiment: 'positive', kind: 'fact' }),
			],
			[
				[0, 0],
				[1, 1],
			],
			rootOf,
		);
		// The first accepted (positive is allowed, so opinion is); the second not (no neutral allowed)
		expect(tally['parts.kind']).toEqual([1, 2]);
	});
});
