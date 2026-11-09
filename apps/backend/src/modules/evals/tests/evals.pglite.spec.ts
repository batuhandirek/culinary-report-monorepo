import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { City } from 'src/modules/cities/entities/city.entity.js';
import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { DecisionModelsService } from 'src/modules/llm/services/decision-models.service.js';
import { EmbeddingsService } from 'src/modules/llm/services/embeddings.service.js';
import { PgBossService } from 'src/modules/pgboss/pgboss.service.js';
import { VenueMatchAgent } from 'src/modules/pipeline/match-mentions/agents/venue-match.agent.js';
import { PostClaimsAgent } from 'src/modules/pipeline/read-posts/agents/post-claims.agent.js';
import { PostGateAgent } from 'src/modules/pipeline/read-posts/agents/post-gate.agent.js';
import { gateAgent } from 'src/modules/pipeline/read-posts/tests/factories/post-gate.mock.js';
import { ReviewClaimsAgent } from 'src/modules/pipeline/read-reviews/agents/review-claims.agent.js';
import { Mention, MentionMatchMethodEnum } from 'src/modules/social/entities/mention.entity.js';
import { SocialPlatformEnum, SocialPost } from 'src/modules/social/entities/social-post.entity.js';
import { ClaimLabelsClassifier } from 'src/modules/statements/classifiers/claim-labels.classifier.js';
import { AspectShortlistService } from 'src/modules/statements/services/aspect-shortlist.service.js';
import { addStatements } from 'src/modules/statements/tests/factories/statement.factory.js';
import { TermTopicAgent } from 'src/modules/topics/agents/term-topic.agent.js';
import { TopicService } from 'src/modules/topics/services/topic.service.js';
import { seedTopics } from 'src/modules/topics/tests/factories/topic.factory.js';
import { Review } from 'src/modules/venues/entities/review.entity.js';
import type { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { venueFactory } from 'src/modules/venues/tests/factories/venue.factory.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { mockAgent } from 'src/tests/mock-agent.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { ClaimPairingAgent } from '../agents/claim-pairing.agent.js';
import { MatchReferenceAgent } from '../agents/match-reference.agent.js';
import { PostReferenceAgent } from '../agents/post-reference.agent.js';
import { ReviewReferenceAgent } from '../agents/review-reference.agent.js';
import { TermReferenceAgent } from '../agents/term-reference.agent.js';
import { REFERENCE_MODEL } from '../constants/eval.constant.js';
import type { PostCase, ReviewCase } from '../interfaces/eval-case.interface.js';
import { EvalCitiesService } from '../services/eval-cities.service.js';
import { EvalCollectService } from '../services/eval-collect.service.js';
import { EvalReferenceService } from '../services/eval-reference.service.js';
import { EvalRunService } from '../services/eval-run.service.js';
import { EvalScoreService } from '../services/eval-score.service.js';
import { caseFile, readCases, readResults, readRunJson } from '../util/eval-files.js';

const referenceClaim = (text: string, extra: Record<string, unknown> = {}) => ({
	text,
	quote: null,
	sentiment: 'negative',
	aspect: 'wait_for_food',
	foods: [],
	amount: null,
	unit: null,
	kind: 'opinion',
	optional: false,
	alsoAcceptable: { sentiments: [], aspects: [], kinds: [] },
	...extra,
});

describe('Ingestion eval', () => {
	let harness: PgliteTestingModule;
	let dir: string;
	let city: City;
	let venue: Venue;
	let referenceModel = REFERENCE_MODEL as string;

	const reviewReference = {
		generate: jest.fn(async () => ({
			object: {
				claims: [
					referenceClaim('waited 50 minutes for the food', {
						amount: 50,
						unit: 'minutes',
					}),
					// A key the table lacks is no aspect; "none" stays an allowed alternative
					referenceClaim('the place was loud', {
						aspect: 'made_up_key',
						alsoAcceptable: { sentiments: [], aspects: ['none', 'nope'], kinds: [] },
					}),
				],
				notes: null,
			},
			usage: { inputTokens: 1000, outputTokens: 500 },
			model: referenceModel,
		})),
	};
	// Agent A reads one review a call, naming each claim's foods
	const reviewAgent = mockAgent(() => ({
		claims: [
			{ text: 'waited 50 minutes', quote: null, foods: [], amount: 50, unit: 'minutes' },
			{
				text: 'the fries were cold',
				quote: null,
				foods: ['fries', 'Fries'],
				amount: null,
				unit: null,
			},
		],
	}));
	// Pairs the first claims of the two lists (one case a call)
	const pairingAgent = mockAgent(() => ({ pairs: [{ reference: 0, produced: 0 }] }));
	// The claim-labels classifier: sure of the wait's aspect, unsure of the other claim's
	const labelsClassifier = {
		decide: jest.fn(async (state: unknown, _context?: unknown) => {
			const { claim } = state as { claim: { text: string } };
			const wait = claim.text.includes('waited');
			return {
				answers: {
					sentiment: {
						type: 'choice',
						choice: 'negative',
						probabilities: { negative: 0.95 },
					},
					aspect:
						wait ?
							{
								type: 'choice',
								choice: 'wait_for_food',
								probabilities: { wait_for_food: 0.92 },
							}
						:	{ type: 'choice', choice: 'no_aspect', probabilities: { no_aspect: 0.6 } },
					kind: { type: 'choice', choice: 'opinion', probabilities: { opinion: 0.8 } },
				},
				usage: { inputTokens: 300, totalTokens: 300 },
				model: 'typesafe-ai/jev-latest',
				usd: 0.0001,
			};
		}),
	};
	const decisionModels = { model: jest.fn() };
	// A made-up space: the wait for food on one axis, everything else on another
	const embeddings = {
		embedMany: jest.fn(async (values: string[]) => ({
			embeddings: values.map(v => (/^Wait for food|waited/.test(v) ? [1, 0] : [0, 1])),
			tokens: values.length,
		})),
	};

	const em = () => harness.orm.em;

	beforeAll(async () => {
		dir = mkdtempSync(path.join(tmpdir(), 'eval-'));
		process.env.EVAL_DIR = dir;
		harness = await createPgliteTestingModule({
			providers: [
				TopicService,
				EvalCitiesService,
				EvalCollectService,
				EvalReferenceService,
				EvalRunService,
				AspectShortlistService,
				EvalScoreService,
				{ provide: PgBossService, useValue: {} },
				{ provide: PostGateAgent, useValue: gateAgent() },
				{ provide: ReviewClaimsAgent, useValue: reviewAgent },
				{ provide: ClaimPairingAgent, useValue: pairingAgent },
				{ provide: ReviewReferenceAgent, useValue: reviewReference },
				{
					provide: PostClaimsAgent,
					useValue: mockAgent({ isPromotional: false, places: [], claims: [] }),
				},
				{
					provide: VenueMatchAgent,
					useValue: mockAgent({ venueId: null, branchId: null }),
				},
				{ provide: TermTopicAgent, useValue: mockAgent({ topics: [], suggestion: null }) },
				{ provide: ClaimLabelsClassifier, useValue: labelsClassifier },
				{ provide: DecisionModelsService, useValue: decisionModels },
				{ provide: EmbeddingsService, useValue: embeddings },
				{ provide: PostReferenceAgent, useValue: mockAgent({}) },
				{ provide: MatchReferenceAgent, useValue: mockAgent({ places: [] }) },
				{ provide: TermReferenceAgent, useValue: mockAgent({ terms: [] }) },
			],
		});
		entityManagerManager.setEntityManager(harness.orm.em);
		// The references' spec is each agent's rules; mocked agents have none
		for (const agent of [ReviewClaimsAgent, PostClaimsAgent, TermTopicAgent])
			(harness.moduleRef.get(agent) as unknown as { rulesFor: () => string }).rulesFor = () =>
				'spec';
		seedTopics(em());
		city = testCity(em());
		venue = venueFactory.build(
			{ name: 'Batu Burger', category: 'Hamburger restaurant' },
			{ associations: { city } },
		);
		await em().flush();
		const index = await harness.moduleRef.get(TopicService).index();
		const review = em().create(Review, {
			venue,
			reviewId: 'g-1',
			publishedAt: new Date('2026-09-10T12:00:00Z'),
			stars: 2,
			text: 'Wir haben 50 Minuten gewartet und die Pommes waren kalt',
			textTranslated: 'We waited 50 minutes and the fries were cold',
			language: 'de',
			analysedAt: new Date(),
		});
		addStatements(
			em(),
			review,
			[
				{
					text: 'waited 50 minutes',
					sentiment: 'negative',
					aspect: 'wait_for_food',
					amount: 50,
					unit: 'minutes',
				},
				{
					text: 'the Pommes were cold',
					sentiment: 'negative',
					aspect: 'temperature',
					foods: ['Pommes'],
				},
			],
			{ index },
		);
		const post = em().create(SocialPost, {
			city,
			externalId: 'eval-post-1',
			platform: SocialPlatformEnum.TIKTOK,
			url: 'https://tiktok.com/eval/1',
			author: 'eater',
			text: 'Batu Burger: the fries are huge #berlinfood',
			postedAt: new Date('2026-09-12T12:00:00Z'),
			analysedAt: new Date(),
		});
		const mention = em().create(Mention, {
			post,
			venueName: 'Batu Burger',
			visited: true,
			brand: venue.brand,
			venue,
			matchMethod: MentionMatchMethodEnum.EXACT,
		});
		addStatements(
			em(),
			mention,
			[
				{
					text: 'the fries at Batu Burger are huge',
					sentiment: 'positive',
					aspect: 'portion_size',
					foods: ['fries'],
				},
			],
			{ index },
		);
		await em().flush();
	});

	afterAll(async () => {
		await harness.stop();
		rmSync(dir, { recursive: true, force: true });
		delete process.env.EVAL_DIR;
	});

	it('collects reviews and posts as their agents see them, with what is stored for them', async () => {
		const res = await harness.moduleRef
			.get(EvalCollectService)
			.collect({ reviews: 5, posts: 5, terms: 3 });
		expect(res.reviews).toBe(1);
		expect(res.posts).toBe(1);
		expect(res.terms).toBe(3);

		const [review] = readCases(['review']) as ReviewCase[];
		expect(review.source).toMatchObject({
			reviewId: 'g-1',
			stars: 2,
			venue: 'Batu Burger',
			language: 'de',
		});
		expect(review.tags).toEqual(
			expect.arrayContaining(['lang:de', 'stars:2', 'platform:google']),
		);
		expect(review.stored.claims).toEqual([
			expect.objectContaining({
				text: 'waited 50 minutes',
				aspect: 'wait_for_food',
				amount: 50,
				unit: 'minutes',
				foods: [],
			}),
			expect.objectContaining({
				text: 'the Pommes were cold',
				aspect: 'temperature',
				foods: ['Pommes'],
			}),
		]);

		const [post] = readCases(['post']) as PostCase[];
		expect(post.source).toMatchObject({
			platform: 'tiktok',
			author: 'eater',
			cityName: city.name,
			hashtags: [],
		});
		expect(post.stored.places).toEqual([
			expect.objectContaining({
				venueName: 'Batu Burger',
				match: expect.objectContaining({
					method: 'exact',
					venueId: venue.id,
					brandId: venue.brand.id,
				}),
			}),
		]);
		expect(post.stored.claims).toEqual([
			expect.objectContaining({ subject: 'place', place: 0, foods: ['fries'] }),
		]);

		// Collecting again tops up: nothing new to take
		expect(
			await harness.moduleRef
				.get(EvalCollectService)
				.collect({ reviews: 5, posts: 5, terms: 3 }),
		).toEqual({ reviews: 0, posts: 0, terms: 0 });
	});

	it("keeps only references the reference model wrote, with the table's aspects", async () => {
		const references = harness.moduleRef.get(EvalReferenceService);
		const [review] = readCases(['review']) as ReviewCase[];

		// The roster's fallback answered: discarded, nothing written
		referenceModel = 'openai/gpt-5.4';
		const refused = await references.run({ kinds: ['review'] });
		expect(refused).toMatchObject({ written: 0, rejected: 1 });
		expect(
			(JSON.parse(readFileSync(caseFile('review', review.id), 'utf8')) as ReviewCase)
				.reference,
		).toBeUndefined();

		referenceModel = REFERENCE_MODEL;
		const res = await references.run({ kinds: ['review'] });
		expect(res).toMatchObject({ written: 1, rejected: 0 });
		expect(res.usd).toBeCloseTo((1000 * 4 + 500 * 20) / 1e6);
		const [written] = readCases(['review']) as ReviewCase[];
		expect(written.reference).toMatchObject({
			model: REFERENCE_MODEL,
			specHash: expect.any(String),
		});
		expect(written.reference!.claims.map(c => [c.aspect, c.alsoAcceptable.aspects])).toEqual([
			['wait_for_food', []],
			[null, ['none']],
		]);
		// A case with a reference is not asked again unless forced
		expect((await references.run({ kinds: ['review'] })).written).toBe(0);
	});

	it('runs the current agents on a case the way the services do, and scores the run', async () => {
		const res = await harness.moduleRef.get(EvalRunService).run('test', { kinds: ['review'] });
		expect(res).toMatchObject({ ran: 1, failed: 0 });
		const [review] = readCases(['review']) as ReviewCase[];
		const result = readResults('test').get(review.id)!;
		// Agent A, then the claim-labels classifier: production's reading
		expect(result.models).toEqual({
			'review-claims': 'openai/mock-model',
			'claim-labels': 'typesafe-ai/jev-latest',
		});
		expect(result.claimsFrom).toBeUndefined();
		// The labels the classifier gave; foods once per wording (`claimFoods`) and the number, agent A's
		expect((result.output as { claims: unknown[] }).claims).toEqual([
			expect.objectContaining({
				text: 'waited 50 minutes',
				aspect: 'wait_for_food',
				foods: [],
				amount: 50,
				unit: 'minutes',
			}),
			expect.objectContaining({
				text: 'the fries were cold',
				aspect: null,
				foods: ['fries'],
				amount: null,
			}),
		]);

		const scores = await harness.moduleRef.get(EvalScoreService).score('test');
		expect(scores.cases.review).toBe(1);
		// One of two reference claims paired, one of two produced
		expect(scores.byKind.review!['claims.recall']).toEqual([1, 2]);
		expect(scores.byKind.review!['claims.precision']).toEqual([1, 2]);
		expect(scores.byKind.review!['parts.amount']).toEqual([1, 1]);
		expect(existsSync(path.join(dir, 'runs', 'test', 'report.md'))).toBe(true);
		expect(readFileSync(path.join(dir, 'runs', 'test', 'report.md'), 'utf8')).toContain(
			'the place was loud',
		);

		// Scoring again reuses the pairs
		pairingAgent.generate.mockClear();
		await harness.moduleRef.get(EvalScoreService).score('test');
		expect(pairingAgent.generate).not.toHaveBeenCalled();
	});

	it("labels the reference's own claims with the classifier, and scores the labels alone", async () => {
		reviewAgent.generate.mockClear();
		pairingAgent.generate.mockClear();
		labelsClassifier.decide.mockClear();
		const reading = { claims: 'reference' } as const;
		const res = await harness.moduleRef
			.get(EvalRunService)
			.run('labels', { kinds: ['review'], reading });
		expect(res).toMatchObject({ ran: 1, failed: 0 });
		// Checked once before any claim (keyed, switched on); no agent A
		expect(decisionModels.model).toHaveBeenCalledWith('typesafe-ai/jev-latest', {
			inProduction: true,
		});
		expect(reviewAgent.generate).not.toHaveBeenCalled();
		// The claim with its neighbours as the state; the aspects from the table
		const [state, context] = labelsClassifier.decide.mock.calls[0] as unknown as [
			unknown,
			{ aspects: { key: string }[] },
		];
		expect(state).toEqual({
			source: 'review',
			place: 'Batu Burger',
			otherClaims: ['the place was loud'],
			claim: { text: 'waited 50 minutes for the food' },
		});
		expect(context.aspects.map(a => a.key)).toContain('wait_for_food');

		const [review] = readCases(['review']) as ReviewCase[];
		const result = readResults('labels').get(review.id)!;
		expect(result).toMatchObject({
			claimsFrom: 'reference',
			usd: 0.0002,
			models: { 'claim-labels': 'typesafe-ai/jev-latest' },
		});
		// The amount parsed from the text for the wait; foods never read
		expect((result.output as { claims: unknown[] }).claims).toEqual([
			expect.objectContaining({
				text: 'waited 50 minutes for the food',
				aspect: 'wait_for_food',
				amount: 50,
				unit: 'minutes',
				foods: null,
				probability: { sentiment: 0.95, aspect: 0.92, kind: 0.8 },
			}),
			expect.objectContaining({ text: 'the place was loud', aspect: null, foods: null }),
		]);
		expect(readRunJson('labels', 'run.json')).toEqual(reading);

		const scores = await harness.moduleRef.get(EvalScoreService).score('labels');
		// Paired one to one: nothing asked
		expect(pairingAgent.generate).not.toHaveBeenCalled();
		const tally = scores.byKind.review!;
		expect(tally['claims.recall']).toBeUndefined();
		expect(tally['parts.sentiment']).toEqual([2, 2]);
		expect(tally['parts.aspect']).toEqual([2, 2]);
		expect(tally['parts.amount']).toEqual([1, 1]);
		expect(tally['parts.foods_recall']).toBeUndefined();
		expect(tally['sure.aspect']).toEqual([1, 2]);
		expect(tally['parts.aspect@sure']).toEqual([1, 1]);
		expect(scores.usd).toBeCloseTo(0.0002);
		expect(readFileSync(path.join(dir, 'runs', 'labels', 'report.md'), 'utf8')).toContain(
			'Reading: claims reference',
		);
	});

	it('offers the classifier only the aspects closest to each claim, and scores what the shortlist reached', async () => {
		labelsClassifier.decide.mockClear();
		const res = await harness.moduleRef.get(EvalRunService).run('shortlist', {
			kinds: ['review'],
			reading: { claims: 'reference', aspectShortlist: 1 },
		});
		expect(res).toMatchObject({ ran: 1, failed: 0 });
		// The aspects' descriptions once, then the claims
		expect(embeddings.embedMany).toHaveBeenCalledTimes(2);
		const offered = labelsClassifier.decide.mock.calls.map(
			call => (call[1] as unknown as { offered?: string[] }).offered,
		);
		// The wait with its root; the loud place's closest is the first aspect of the legend
		expect(offered).toEqual([['wait', 'wait_for_food'], ['food']]);
		const [review] = readCases(['review']) as ReviewCase[];
		expect(
			(readResults('shortlist').get(review.id)!.output as { claims: unknown[] }).claims,
		).toEqual([
			expect.objectContaining({ offered: ['wait', 'wait_for_food'] }),
			expect.objectContaining({ offered: ['food'] }),
		]);
		const scores = await harness.moduleRef.get(EvalScoreService).score('shortlist');
		// The wait's aspect was offered; the loud place's is none, always offered
		expect(scores.byKind.review!['shortlist.recall']).toEqual([2, 2]);
	});

	it('puts agent A on a model of its own', async () => {
		reviewAgent.generate.mockClear();
		await harness.moduleRef.get(EvalRunService).run('models', {
			kinds: ['review'],
			reading: { model: 'openai/gpt-5.4' },
		});
		expect(reviewAgent.generate.mock.calls[0][2]).toEqual({ model: 'openai/gpt-5.4' });
	});

	it('writes a second reader as a run, never into the case', async () => {
		const [before] = readCases(['review']) as ReviewCase[];
		referenceModel = 'openai/gpt-5.4';
		try {
			const res = await harness.moduleRef
				.get(EvalReferenceService)
				.run({ kinds: ['review'], model: 'openai/gpt-5.4', asRun: 'second' });
			expect(res).toMatchObject({ written: 1, rejected: 0 });
		} finally {
			referenceModel = REFERENCE_MODEL;
		}
		const [after] = readCases(['review']) as ReviewCase[];
		expect(after.reference).toEqual(before.reference);
		const result = readResults('second').get(before.id)!;
		expect(result.models).toEqual({ reference: 'openai/gpt-5.4' });
		expect((result.output as { claims: unknown[] }).claims).toHaveLength(2);
	});

	it('restamps references to the rules now when a rules change moved no right answer', async () => {
		const agent = harness.moduleRef.get(ReviewClaimsAgent) as unknown as {
			rulesFor: () => string;
		};
		const scoring = harness.moduleRef.get(EvalScoreService);
		agent.rulesFor = () => 'spec, reworded';
		try {
			expect((await scoring.score('test')).staleReferences).toBe(1);
			expect(await scoring.restamp(undefined, 'reworded only')).toBe(1);
			expect((await scoring.score('test')).staleReferences).toBe(0);
			const [review] = readCases(['review']) as ReviewCase[];
			expect(review.reference!.revisions).toEqual([
				{ at: expect.any(String), by: 'restamp', note: 'reworded only' },
			]);
		} finally {
			agent.rulesFor = () => 'spec';
		}
	});

	it('scores a source the agent dropped as nothing read, never leaves it out', async () => {
		reviewAgent.generate.mockImplementationOnce(async () => {
			throw new Error('no answer');
		});
		const res = await harness.moduleRef
			.get(EvalRunService)
			.run('dropped', { kinds: ['review'], force: true });
		expect(res).toMatchObject({ failed: 1 });
		const scores = await harness.moduleRef.get(EvalScoreService).score('dropped');
		expect(scores.dropped).toBe(1);
		expect(scores.cases.review).toBe(1);
		expect(scores.byKind.review!['claims.recall']).toEqual([0, 2]);

		// The next run of the label reads it again (a run the allowance stopped goes on the next day)
		const again = await harness.moduleRef
			.get(EvalRunService)
			.run('dropped', { kinds: ['review'] });
		expect(again).toMatchObject({ ran: 1, failed: 0 });
		expect((await harness.moduleRef.get(EvalScoreService).score('dropped')).dropped).toBe(0);
	});
});
