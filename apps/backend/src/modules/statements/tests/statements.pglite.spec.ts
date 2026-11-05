import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { BacklogRun } from 'src/modules/backlog/entities/backlog-run.entity.js';
import { LlmBacklogService } from 'src/modules/backlog/services/llm-backlog.service.js';
import { LlmBacklogRegistry } from 'src/modules/backlog/services/llm-backlog-registry.service.js';
import { City } from 'src/modules/cities/entities/city.entity.js';
import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { PgBossService } from 'src/modules/pgboss/pgboss.service.js';
import { PostClaimsAgent } from 'src/modules/social/agents/post-claims.agent.js';
import { PostGateAgent } from 'src/modules/social/agents/post-gate.agent.js';
import { Mention } from 'src/modules/social/entities/mention.entity.js';
import { SocialPlatformEnum, SocialPost } from 'src/modules/social/entities/social-post.entity.js';
import { MentionExtractionService } from 'src/modules/social/services/mention-extraction.service.js';
import { gateAgent } from 'src/modules/social/tests/factories/post-gate.mock.js';
import { ownAccount } from 'src/modules/social/tests/factories/social-account.factory.js';
import { TermTopicAgent } from 'src/modules/topics/agents/term-topic.agent.js';
import { Term } from 'src/modules/topics/entities/term.entity.js';
import { TermService } from 'src/modules/topics/services/term.service.js';
import { TopicService } from 'src/modules/topics/services/topic.service.js';
import { TopicRelinkService } from 'src/modules/topics/services/topic-relink.service.js';
import { seedTopics } from 'src/modules/topics/tests/factories/topic.factory.js';
import type { TopicIndex } from 'src/modules/topics/util/topics.js';
import { ReviewClaimsAgent } from 'src/modules/venues/agents/review-claims.agent.js';
import { Review } from 'src/modules/venues/entities/review.entity.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { ReviewService } from 'src/modules/venues/services/review.service.js';
import { venueFactory } from 'src/modules/venues/tests/factories/venue.factory.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { mockAgent } from 'src/tests/mock-agent.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { ClaimLabelsClassifier } from '../classifiers/claim-labels.classifier.js';
import { Statement } from '../entities/statement.entity.js';
import { StatementPart } from '../entities/statement-part.entity.js';
import { type Claim, StatementService } from '../services/statement.service.js';
import { StatementPartsService } from '../services/statement-parts.service.js';
import {
	changesOf,
	complaintsOf,
	foodsOf,
	notedOf,
	partTopicKeys,
	praiseOf,
} from '../util/statement-views.js';

import { labelsClassifier } from './factories/claim-labels.mock.js';
import { addStatements } from './factories/statement.factory.js';

/** The reading of a claim, by its text: Jev's labels, and the foods and number agent A copied out; a claim not listed is a neutral opinion about nothing */
interface PartsAnswer {
	sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
	aspect: string | null;
	foods: string[];
	amount: number | null;
	unit: 'minutes' | 'money' | null;
	kind: string;
}
const PARTS: Record<string, Partial<PartsAnswer>> = {
	'I waited darn 50 minutes': {
		sentiment: 'negative',
		aspect: 'wait_for_food',
		amount: 50,
		unit: 'minutes',
	},
	'the döner was damn good': { sentiment: 'positive', aspect: 'taste', foods: ['Doner'] },
	'the döner cost 15 euros': {
		sentiment: 'negative',
		aspect: 'price_level',
		foods: ['Doner'],
		amount: 15,
		unit: 'money',
	},
	'the fries were damn good': { sentiment: 'positive', aspect: 'taste', foods: ['fries'] },
	'the fries cost 10 euros': {
		sentiment: 'neutral',
		aspect: 'price_level',
		foods: ['fries'],
		amount: 10,
		unit: 'money',
	},
	// A change is the claim's kind; its aspect says what it is about
	'Berlin has increasing prices in the last years': {
		sentiment: 'negative',
		aspect: 'price_level',
		kind: 'change',
	},
	'Batu Burger has the best fries': { sentiment: 'positive', aspect: 'taste', foods: ['fries'] },
	'it also has the best waiters': { sentiment: 'positive', aspect: 'friendliness' },
	'rude staff': { sentiment: 'negative', aspect: 'friendliness' },
	// No number answered: the text is parsed for the aspect's unit
	'waited an hour for the food': { sentiment: 'negative', aspect: 'wait_for_food' },
};
/** Agent A's claims for a review, by its text; a review not listed is one claim, its text */
const REVIEW_CLAIMS: Record<string, Claim[]> = {
	'Damn good Doner, but man they were for 15 euros': [
		{ text: 'the döner was damn good', quote: 'Damn good Doner' },
		// Words the review never said (a translation): no quote is kept
		{ text: 'the döner cost 15 euros', quote: 'the döner cost 15 euros' },
	],
};
const place = (venueName: string) => ({
	venueName,
	locationHint: null,
	cuisine: null,
	city: 'Berlin',
	visited: true,
	isNewOpening: false,
});

/*
 * What posts, articles and reviews say is rows: one statement per claim, written with its source
 * and gone with it, its parts (an aspect, the food wordings as terms) read by agent B right after
 * agent A or as the `statement-parts` backlog; a term's decision and a mention's match reach every
 * statement through joins, no row rewritten.
 */
describe('statements (pglite)', () => {
	let harness: PgliteTestingModule;
	let city: City;
	let venue: Venue;
	let other: Venue;
	let index: TopicIndex;
	/** The seed's alias terms stay; every later term is a test's */
	let seededTermMax = 0;
	let reviewClaims: ((text: string) => Claim[]) | undefined;
	let partsOverride: ((text: string) => Partial<PartsAnswer>) | undefined;
	let postAnswer: object = { isPromotional: false, places: [], claims: [] };
	const pgBoss = { sendJob: jest.fn(async (..._args: unknown[]) => 'job-id') };

	const readingOf = (text: string): Partial<PartsAnswer> =>
		partsOverride?.(text) ?? PARTS[text.trim()] ?? {};
	// A claim as agent A answers it: with the foods and the number it copied out of the text
	const copied = <C extends { text: string }>(claim: C) => {
		const reading = readingOf(claim.text);
		return {
			foods: reading.foods ?? [],
			amount: reading.amount ?? null,
			unit: reading.unit ?? null,
			...claim,
		};
	};
	// Agent A reads one review a call
	const reviewAgent = mockAgent((input: unknown) => {
		const { text } = JSON.parse(input as string) as { text: string };
		const claims = reviewClaims?.(text) ?? REVIEW_CLAIMS[text] ?? [{ text, quote: text }];
		return { claims: claims.map(copied) };
	});
	const postAgent = mockAgent(() => ({
		...postAnswer,
		claims: ((postAnswer as { claims?: { text: string }[] }).claims ?? []).map(copied),
	}));
	// The claim-labels classifier (Jev) reads one claim a call, its source's other claims beside it
	const labels = labelsClassifier(text => {
		const reading = readingOf(text);
		return { sentiment: reading.sentiment, aspect: reading.aspect, kind: reading.kind };
	});
	// Agent C, one wording a call: every wording none, so the `terms` backlog settles whatever a drain hands it
	const termAgent = mockAgent(() => ({ topics: [], suggestion: null }));

	const em = () => harness.orm.em;
	const sql = <T>(query: string, params: unknown[] = []): Promise<T[]> =>
		em().getConnection().execute(query, params);
	const reviews = () => harness.moduleRef.get(ReviewService);
	const statements = () => harness.moduleRef.get(StatementService);
	const parts = () => harness.moduleRef.get(StatementPartsService);
	const terms = () => harness.moduleRef.get(TermService);

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				StatementService,
				StatementPartsService,
				TermService,
				TopicService,
				TopicRelinkService,
				ReviewService,
				MentionExtractionService,
				LlmBacklogRegistry,
				LlmBacklogService,
				{ provide: PgBossService, useValue: pgBoss },
				{ provide: ReviewClaimsAgent, useValue: reviewAgent },
				{ provide: PostClaimsAgent, useValue: postAgent },
				{ provide: PostGateAgent, useValue: gateAgent() },
				{ provide: ClaimLabelsClassifier, useValue: labels },
				{ provide: TermTopicAgent, useValue: termAgent },
			],
		});
		entityManagerManager.setEntityManager(harness.orm.em);
		// Registered as at module init: the two backlogs and the terms re-linker
		parts().onModuleInit();
		terms().onModuleInit();
		// The whole tree: every kind of food and every aspect, the seed's aliases as admin terms
		seedTopics(em());
		city = testCity(em());
		venue = venueFactory.build(
			{ name: 'Batu Burger', category: 'Hamburger restaurant' },
			{ associations: { city } },
		);
		other = venueFactory.build(
			{ name: 'Curry 36', category: 'Fast food restaurant' },
			{ associations: { city } },
		);
		await em().flush();
		index = await harness.moduleRef.get(TopicService).index();
		seededTermMax = (
			await sql<{ n: number }>('select coalesce(max(id), 0)::int as n from terms')
		)[0].n;
	});

	afterAll(async () => {
		await harness.stop();
	});

	// Each case on its own rows and fresh references: a case clears the entity manager
	beforeEach(async () => {
		reviewClaims = undefined;
		partsOverride = undefined;
		postAnswer = { isPromotional: false, places: [], claims: [] };
		reviewAgent.generate.mockClear();
		labels.decide.mockClear();
		const ids = { city: city.id, venue: venue.id, other: other.id };
		em().clear();
		await em().nativeDelete(Statement, {});
		await em().nativeDelete(Review, {});
		await em().nativeDelete(SocialPost, {});
		await em().nativeDelete(Mention, {});
		await em().nativeDelete(BacklogRun, {});
		await em().nativeDelete(Term, { id: { $gt: seededTermMax } });
		city = await em().findOneOrFail(City, ids.city);
		venue = await em().findOneOrFail(Venue, ids.venue, { populate: ['brand'] });
		other = await em().findOneOrFail(Venue, ids.other, { populate: ['brand'] });
	});

	let n = 0;
	/** A written review of the venue, not analysed yet, not flushed */
	const review = (fields: Partial<Review> = {}) =>
		em().create(Review, {
			venue,
			reviewId: `st-${n++}`,
			publishedAt: new Date('2026-09-10T12:00:00Z'),
			stars: 3,
			text: 'I waited darn 50 minutes',
			...fields,
		});
	/** A post of the city with a caption long enough to extract, not analysed yet, not flushed */
	const post = (fields: Partial<SocialPost> = {}) =>
		em().create(SocialPost, {
			city,
			externalId: `st-post-${n++}`,
			platform: SocialPlatformEnum.TIKTOK,
			url: `https://tiktok.com/st/${n}`,
			author: `eater${n}`,
			views: 100,
			text: 'Batu Burger in Kreuzberg: damn good fries for 10 euros, go there now #berlinfood #fries',
			postedAt: new Date('2026-09-12T12:00:00Z'),
			...fields,
		});
	/** The statements of a source as the readers load them, in id order */
	const rowsOf = (where: object) =>
		em().find(Statement, where, {
			orderBy: { id: 'asc' },
			populate: ['parts.topic.parent', 'parts.term.topics.topic'],
		});
	/** A statement's parts as `[role, key]`, in rank order */
	const partsOf = (s: Statement) =>
		s.parts.getItems().map(p => [p.role, p.role === 'aspect' ? p.topic!.key : p.term!.key]);
	const foodPart = (s: Statement) => s.parts.getItems().find(p => p.role === 'food')!;
	const extract = () =>
		harness.moduleRef.get(MentionExtractionService).extract({ limit: 10, cityId: city.id });

	it('scenario 1: "I waited darn 50 minutes" is one negative statement of the review, under waiting, 50 minutes', async () => {
		const r = review({ text: 'I waited darn 50 minutes' });
		await em().flush();
		await reviews().analyseMonth('2026-09');
		em().clear();
		const rows = await rowsOf({ review: r.id });
		expect(rows).toHaveLength(1);
		const [s] = rows;
		expect(s).toMatchObject({
			sourceKind: 'review',
			subject: 'place',
			month: '2026-09',
			saidAt: new Date('2026-09-10T12:00:00Z'),
			text: 'I waited darn 50 minutes',
			// The review's own words, verbatim: kept
			quote: 'I waited darn 50 minutes',
			sentiment: 'negative',
			kind: 'opinion',
			amount: 50,
			unit: 'minutes',
			partsAt: expect.any(Date),
		});
		expect([s.review?.id, s.post ?? null, s.mention ?? null, s.city.id]).toEqual([
			r.id,
			null,
			null,
			city.id,
		]);
		// The aspect part is the seeded row, under the root `wait`
		expect(
			s.parts
				.getItems()
				.map(p => [p.role, p.topic?.key, p.topic?.parent?.key, p.term ?? null, p.rank]),
		).toEqual([['aspect', 'wait_for_food', 'wait', null, 0]]);
		expect(praiseOf(rows)).toEqual([]);
		expect(complaintsOf(rows)).toEqual([
			{
				text: 'I waited darn 50 minutes',
				quote: 'I waited darn 50 minutes',
				sentiment: 'negative',
				kind: 'opinion',
				aspect: 'wait_for_food',
				root: 'wait',
				amount: 50,
				unit: 'minutes',
			},
		]);
	});

	it('scenario 2: "Damn good Doner, but 15 euros" is two statements naming one term, matched to Döner & kebab', async () => {
		const r = review({ text: 'Damn good Doner, but man they were for 15 euros' });
		await em().flush();
		await reviews().analyseMonth('2026-09');
		em().clear();
		const rows = await rowsOf({ review: r.id });
		expect(rows.map(s => [s.text, s.sentiment, s.amount, s.unit, !!s.partsAt])).toEqual([
			['the döner was damn good', 'positive', null, null, true],
			['the döner cost 15 euros', 'negative', 15, 'money', true],
		]);
		// A quote is kept only when the review said it: the second is an English rendering, dropped
		expect(rows.map(s => s.quote ?? null)).toEqual(['Damn good Doner', null]);
		expect(rows.map(partsOf)).toEqual([
			[
				['aspect', 'taste'],
				['food', 'doner'],
			],
			[
				['aspect', 'price_level'],
				['food', 'doner'],
			],
		]);
		expect(rows.map(s => s.parts.getItems()[0].topic!.parent!.key)).toEqual(['food', 'price']);
		// One wording, one term, created by `TermService.ensure` with the first spelling
		const [a, b] = rows.map(foodPart);
		expect(a.term!.id).toBe(b.term!.id);
		expect(await em().count(Term, { key: 'doner' })).toBe(1);
		// "Doner" is the seed's Döner & kebab as a whole: decided at once, the part's topics are the term's
		expect([a.term!.name, a.term!.decidedBy, partTopicKeys(a)]).toEqual([
			'Doner',
			'match',
			['kebab'],
		]);
		expect(foodsOf(rows)).toEqual([
			{ name: 'Doner', key: 'doner', sentiment: 'mixed', topics: ['kebab'] },
		]);
		expect(praiseOf(rows).map(v => v.text)).toEqual(['the döner was damn good']);
		expect(complaintsOf(rows).map(v => [v.text, v.root, v.amount])).toEqual([
			['the döner cost 15 euros', 'price', 15],
		]);
	});

	it('scenario 3: a post’s "damn good fries for 10 euros" is praise and a neutral price fact, and a term decision moves both at once', async () => {
		const p = post();
		await em().flush();
		postAnswer = {
			isPromotional: false,
			places: [place('Batu Burger')],
			claims: [
				{
					text: 'the fries were damn good',
					quote: 'damn good fries',
					subject: 'place',
					place: 'Batu Burger',
				},
				{
					text: 'the fries cost 10 euros',
					quote: 'fries for 10 euros',
					subject: 'place',
					place: 'Batu Burger',
				},
			],
		};
		expect(await extract()).toEqual({ analysed: 1, mentions: 1, skipped: 0 });
		em().clear();
		const mention = await em().findOneOrFail(Mention, { post: p.id });
		// A mention has no sentiment or summary of its own: both come from its claims
		expect(mention.venueName).toBe('Batu Burger');
		const rows = await rowsOf({ post: p.id });
		expect(
			rows.map(s => [
				s.text,
				s.sourceKind,
				s.subject,
				s.mention?.id,
				s.post?.id,
				s.month,
				s.sentiment,
				s.amount,
				s.unit,
			]),
		).toEqual([
			[
				'the fries were damn good',
				'post',
				'place',
				mention.id,
				p.id,
				'2026-09',
				'positive',
				null,
				null,
			],
			[
				'the fries cost 10 euros',
				'post',
				'place',
				mention.id,
				p.id,
				'2026-09',
				'neutral',
				10,
				'money',
			],
		]);
		expect(rows.map(s => s.saidAt)).toEqual([
			new Date('2026-09-12T12:00:00Z'),
			new Date('2026-09-12T12:00:00Z'),
		]);
		expect(rows.map(partsOf)).toEqual([
			[
				['aspect', 'taste'],
				['food', 'fry'],
			],
			[
				['aspect', 'price_level'],
				['food', 'fry'],
			],
		]);
		expect(praiseOf(rows).map(v => v.text)).toEqual(['the fries were damn good']);
		expect(notedOf(rows)).toEqual([
			{
				text: 'the fries cost 10 euros',
				quote: 'fries for 10 euros',
				sentiment: 'neutral',
				kind: 'opinion',
				aspect: 'price_level',
				root: 'price',
				amount: 10,
				unit: 'money',
			},
		]);
		expect(complaintsOf(rows)).toEqual([]);

		// "fries" names no topic as a whole: the term waits, its parts have no topic yet
		const fries = await em().findOneOrFail(Term, { key: 'fry' });
		expect([
			fries.name,
			fries.decidedBy ?? null,
			rows.map(s => partTopicKeys(foodPart(s))),
		]).toEqual(['fries', null, [[], []]]);
		expect(foodsOf(rows)).toEqual([
			{ name: 'fries', key: 'fry', sentiment: 'positive', topics: [] },
		]);
		const before = rows.map(s => [s.id, s.createdAt, s.parts.getItems().map(x => x.id)]);
		// An admin decides the wording: every statement naming it follows, no row rewritten
		await terms().change(fries.id, { topicKeys: ['vegan'] });
		em().clear();
		const after = await rowsOf({ post: p.id });
		expect(after.map(s => [s.id, s.createdAt, s.parts.getItems().map(x => x.id)])).toEqual(
			before,
		);
		expect(after.map(s => partTopicKeys(foodPart(s)))).toEqual([['vegan'], ['vegan']]);
		expect(foodsOf(after)[0].topics).toEqual(['vegan']);
	});

	it('scenario 4: a blog article’s city claim has the post and no mention; its place claims the place’s mention', async () => {
		const p = post({
			platform: SocialPlatformEnum.BLOG,
			author: 'berlinfoodblog.de',
			text: 'Berlin has increasing prices in the last years. Batu Burger has the best fries. It also has the best waiters. Curry 36 is fine.',
		});
		await em().flush();
		postAnswer = {
			isPromotional: false,
			places: [place('Batu Burger'), place('Curry 36')],
			claims: [
				{
					text: 'Berlin has increasing prices in the last years',
					quote: 'Berlin has increasing prices in the last years',
					subject: 'city',
					place: null,
				},
				{
					text: 'Batu Burger has the best fries',
					quote: 'Batu Burger has the best fries',
					subject: 'place',
					place: 'Batu Burger',
				},
				{
					text: 'it also has the best waiters',
					quote: 'It also has the best waiters',
					subject: 'place',
					place: 'Batu Burger',
				},
				{ text: 'the weather was nice', quote: null, subject: 'none', place: null },
			],
		};
		expect(await extract()).toEqual({ analysed: 1, mentions: 2, skipped: 0 });
		em().clear();
		const mentions = await em().find(Mention, { post: p.id }, { orderBy: { id: 'asc' } });
		expect(mentions.map(m => m.venueName)).toEqual(['Batu Burger', 'Curry 36']);
		const rows = await rowsOf({ post: p.id });
		expect(
			rows.map(s => [
				s.text,
				s.subject,
				s.sourceKind,
				s.post?.id,
				s.mention?.id ?? null,
				s.review ?? null,
				s.city.id,
				s.month,
			]),
		).toEqual([
			[
				'Berlin has increasing prices in the last years',
				'city',
				'post',
				p.id,
				null,
				null,
				city.id,
				'2026-09',
			],
			[
				'Batu Burger has the best fries',
				'place',
				'post',
				p.id,
				mentions[0].id,
				null,
				city.id,
				'2026-09',
			],
			[
				'it also has the best waiters',
				'place',
				'post',
				p.id,
				mentions[0].id,
				null,
				city.id,
				'2026-09',
			],
			['the weather was nice', 'none', 'post', p.id, null, null, city.id, '2026-09'],
		]);
		expect(rows.map(s => [s.sentiment, s.kind, partsOf(s)])).toEqual([
			['negative', 'change', [['aspect', 'price_level']]],
			[
				'positive',
				'opinion',
				[
					['aspect', 'taste'],
					['food', 'fry'],
				],
			],
			['positive', 'opinion', [['aspect', 'friendliness']]],
			['neutral', 'opinion', []],
		]);
		// The city claim is a noticed change, never a complaint; the second place has no claim
		expect(changesOf(rows).map(v => [v.text, v.root])).toEqual([
			['Berlin has increasing prices in the last years', 'price'],
		]);
		expect(complaintsOf(rows)).toEqual([]);
		expect(await em().count(Statement, { mention: mentions[1].id })).toBe(0);
		expect(await em().count(Statement, { mention: mentions[0].id })).toBe(2);
	});

	it('keeps a re-matched mention’s statements as they are: the same rows, found under the new brand through the mention', async () => {
		const p = post();
		const mention = em().create(Mention, {
			post: p,
			brand: venue.brand,
			venue,
			venueName: 'Batu Burger',
			visited: true,
		});
		const [s] = addStatements(
			em(),
			mention,
			[
				{
					text: 'the fries were damn good',
					sentiment: 'positive',
					aspect: 'taste',
					foods: ['fries'],
				},
			],
			{
				index,
			},
		);
		await em().flush();
		const rows = () =>
			sql<{ id: number; created_at: Date; parts: number[] }>(
				`select s.id, s.created_at, (select array_agg(p.id order by p.id) from statement_parts p where p.statement_id = s.id) as parts
				from statements s where s.mention_id = ? order by s.id`,
				[mention.id],
			);
		const underBrand = async (brandId: string) =>
			(
				await sql<{ id: number }>(
					`select s.id from statements s join mentions m on m.id = s.mention_id where m.brand_id = ? order by s.id`,
					[brandId],
				)
			).map(r => r.id);
		const before = await rows();
		expect(before.map(r => [r.id, r.parts.length])).toEqual([[s.id, 2]]);
		expect(await underBrand(venue.brand.id)).toEqual([s.id]);

		// An admin re-matches the mention to another brand and branch
		mention.brand = other.brand;
		mention.venue = other;
		await em().flush();
		expect(await rows()).toEqual(before);
		expect(await underBrand(venue.brand.id)).toEqual([]);
		expect(await underBrand(other.brand.id)).toEqual([s.id]);
	});

	it('replaces a review’s statements and their parts on a second analysis', async () => {
		const r = review({ text: 'I waited darn 50 minutes' });
		await em().flush();
		await reviews().analyseMonth('2026-09');
		em().clear();
		const old = await rowsOf({ review: r.id });
		const oldIds = old.map(s => s.id);
		const oldPartIds = old.flatMap(s => s.parts.getItems().map(p => p.id));
		expect([oldIds.length, oldPartIds.length]).toEqual([1, 1]);

		await em().nativeUpdate(Review, { id: r.id }, { analysedAt: null });
		reviewClaims = () => [{ text: 'rude staff' }];
		await reviews().analyseMonth('2026-09');
		em().clear();
		const rows = await rowsOf({ review: r.id });
		expect(rows.map(s => [s.text, s.sentiment, partsOf(s)])).toEqual([
			['rude staff', 'negative', [['aspect', 'friendliness']]],
		]);
		expect(rows[0].id).not.toBe(oldIds[0]);
		expect(await em().count(Statement, { id: { $in: oldIds } })).toBe(0);
		expect(await em().count(StatementPart, { id: { $in: oldPartIds } })).toBe(0);
	});

	it('drops a review’s statements and parts with the review; the wordings stay', async () => {
		const r = review({ text: 'Rude staff, but the Pommes were good.' });
		const created = addStatements(
			em(),
			r,
			[
				{ text: 'rude staff', sentiment: 'negative', aspect: 'friendliness' },
				{
					text: 'the Pommes were good',
					sentiment: 'positive',
					aspect: 'taste',
					foods: ['Pommes'],
				},
			],
			{ index },
		);
		await em().flush();
		const ids = created.map(s => s.id);
		const partIds = created.flatMap(s => s.parts.getItems().map(p => p.id));
		expect([ids.length, partIds.length]).toEqual([2, 3]);
		em().remove(r);
		await em().flush();
		em().clear();
		expect(await em().count(Review, { id: r.id })).toBe(0);
		expect(await em().count(Statement, { id: { $in: ids } })).toBe(0);
		expect(await em().count(StatementPart, { id: { $in: partIds } })).toBe(0);
		expect(await em().count(Term, { key: 'pomme' })).toBe(1);
	});

	it('reads the claims without parts as the `statement-parts` backlog, no source analysed again', async () => {
		const r = review({ text: 'Rude staff. We waited an hour for the food.' });
		statements().replaceForReview(r, [
			{ text: 'rude staff' },
			{ text: 'waited an hour for the food' },
			// Each wording once, blanks out
			{ text: ' rude staff ' },
			{ text: '   ' },
		]);
		await em().flush();
		const backlog = harness.moduleRef.get(LlmBacklogRegistry).get('statement-parts')!;
		expect([backlog.label, backlog.priority]).toEqual(['Labels of claims', 10]);
		expect(await backlog.remaining()).toBe(2);
		expect(await parts().countPending()).toBe(2);

		const runs = await harness.moduleRef.get(LlmBacklogService).drain({ budget: 1_000_000 });
		expect(runs.map(x => [x.key, x.done, x.stopReason, x.remaining])).toEqual([
			['statement-parts', 2, 'empty', 0],
			['terms', 0, 'empty', 0],
		]);
		expect(reviewAgent.generate).not.toHaveBeenCalled();
		// One claim a call, with the place it is about, the source's other claims beside it, and the aspects
		expect(labels.decide).toHaveBeenCalledTimes(2);
		const calls = labels.decide.mock.calls as unknown as [
			unknown,
			{ aspects: { key: string }[] },
		][];
		expect(calls.map(([state]) => state)).toEqual([
			{
				source: 'review',
				place: 'Batu Burger',
				otherClaims: ['waited an hour for the food'],
				claim: { text: 'rude staff' },
			},
			{
				source: 'review',
				place: 'Batu Burger',
				otherClaims: ['rude staff'],
				claim: { text: 'waited an hour for the food' },
			},
		]);
		const [, context] = calls[0];
		expect(context.aspects.map(a => a.key)).toEqual(expect.arrayContaining(['wait', 'queue']));
		em().clear();
		const rows = await rowsOf({ review: r.id });
		expect(
			rows.map(s => [s.text, s.sentiment, partsOf(s), s.amount, s.unit, !!s.partsAt]),
		).toEqual([
			['rude staff', 'negative', [['aspect', 'friendliness']], null, null, true],
			// No number from agent A: "an hour" read from the text for the wait aspect
			[
				'waited an hour for the food',
				'negative',
				[['aspect', 'wait_for_food']],
				60,
				'minutes',
				true,
			],
		]);
		expect(await backlog.remaining()).toBe(0);
		expect((await em().findOneOrFail(Review, r.id)).analysedAt ?? null).toBeNull();
	});

	it("keeps agent A's foods and numbers when the labeller can't serve: the claims wait unlabelled", async () => {
		const r = review({ text: 'Damn good Doner, but man they were for 15 euros' });
		await em().flush();
		const down = async () => {
			throw new Error('No model can serve typesafe-ai/jev-latest: TypeSafe is switched off');
		};
		labels.decide.mockImplementationOnce(down).mockImplementationOnce(down);
		await expect(reviews().analyseMonth('2026-09')).rejects.toThrow('No model can serve');
		em().clear();
		const rows = await rowsOf({ review: r.id });
		expect(
			rows.map(s => [s.text, s.sentiment ?? null, partsOf(s), s.amount, !!s.partsAt]),
		).toEqual([
			['the döner was damn good', null, [['food', 'doner']], null, false],
			['the döner cost 15 euros', null, [['food', 'doner']], 15, false],
		]);
		expect(await parts().countPending()).toBe(2);
	});

	it('settles a claim answered with an aspect key the table lacks: no aspect part, its sentiment and foods stored, never re-asked', async () => {
		const r = review({ text: 'The sauce was odd.' });
		await em().flush();
		partsOverride = () => ({ sentiment: 'negative', aspect: 'no_such_key', foods: ['sauce'] });
		await reviews().analyseMonth('2026-09');
		em().clear();
		const [s] = await rowsOf({ review: r.id });
		expect([s.text, s.partsAt, s.sentiment, partsOf(s)]).toEqual([
			'The sauce was odd.',
			expect.any(Date),
			'negative',
			[['food', 'sauce']],
		]);
		expect(await parts().countPending()).toBe(0);
		expect(await em().count(Term, { key: 'sauce' })).toBe(1);
	});

	it("takes the labeller's kind as final: a claim read again loses a kind it was wrongly given, and the quote is read with the text", async () => {
		const r = review({ text: 'Lecker wie immer!' });
		const [s] = statements().replaceForReview(r, [
			{ text: 'delicious as always', quote: 'Lecker wie immer' },
		]);
		s.kind = 'change';
		await em().flush();
		partsOverride = () => ({ sentiment: 'positive', aspect: 'taste', kind: 'opinion' });
		labels.decide.mockClear();
		await parts().read({ ids: [s.id] });
		em().clear();
		const [read] = await rowsOf({ review: r.id });
		expect([read.kind, read.quote, read.sentiment]).toEqual([
			'opinion',
			'Lecker wie immer',
			'positive',
		]);
		const [state] = labels.decide.mock.calls[0] as unknown as [{ claim: unknown }];
		expect(state.claim).toEqual({
			text: 'delicious as always',
			quote: 'Lecker wie immer',
		});
	});

	it('counts a backlog batch whose answers carry only unknown aspect keys as done, the claims settled', async () => {
		const r = review({ text: 'The sauce was odd.' });
		statements().replaceForReview(r, [{ text: 'The sauce was odd.' }]);
		await em().flush();
		partsOverride = () => ({ sentiment: 'negative', aspect: 'no_such_key' });
		// `LlmBacklog.runBatch`: `done` counts the items settled
		expect(
			await harness.moduleRef.get(LlmBacklogRegistry).get('statement-parts')!.runBatch(),
		).toMatchObject({ done: 1 });
		expect(await parts().countPending()).toBe(0);
	});

	it('TermService.ensure: new wordings get rows under their key, a topic’s name is decided at once, nothing is duplicated', async () => {
		const map = await terms().ensure(
			['Pommes', 'pommes ', ' ', '', 'Döner', 'Lahmacun'],
			index,
		);
		await em().flush();
		expect([...map.keys()].sort()).toEqual(['doner', 'lahmacun', 'pomme']);
		// The first spelling is kept; a wording no topic has waits for the backlog
		expect([
			map.get('pomme')!.name,
			map.get('pomme')!.decidedBy ?? null,
			map.get('pomme')!.topics.count(),
		]).toEqual(['Pommes', null, 0]);
		em().clear();
		const linked = async (key: string) => {
			const term = await em().findOneOrFail(Term, { key }, { populate: ['topics.topic'] });
			return [
				term.name,
				term.decidedBy ?? null,
				term.topics.getItems().map(l => l.topic.key),
			];
		};
		expect(await linked('doner')).toEqual(['Döner', 'match', ['kebab']]);
		expect(await linked('lahmacun')).toEqual(['Lahmacun', 'match', ['lahmacun']]);
		expect(await linked('pomme')).toEqual(['Pommes', null, []]);
		// Asked again in another spelling: the same row
		const again = await terms().ensure(['POMMES', 'Pomme'], index);
		expect([again.size, again.get('pomme')!.id]).toEqual([1, map.get('pomme')!.id]);
		expect(await em().count(Term, { key: 'pomme' })).toBe(1);
		expect((await terms().ensure(['', '  '], index)).size).toBe(0);
		expect(await terms().countPending()).toBe(1);
	});

	it('answers how many venues had a waiting complaint, and how long; an own post never counts', async () => {
		const own = ownAccount(em(), venue.brand, city, 'batuburger');
		addStatements(
			em(),
			review(),
			[
				{
					text: 'waited 50 minutes',
					sentiment: 'negative',
					aspect: 'wait_for_food',
					amount: 50,
					unit: 'minutes',
				},
			],
			{ index },
		);
		addStatements(
			em(),
			review({ venue: other }),
			[
				{ text: 'long queue', sentiment: 'negative', aspect: 'queue' },
				{
					text: 'an hour for food',
					sentiment: 'negative',
					aspect: 'wait_for_food',
					amount: 60,
					unit: 'minutes',
				},
				// Praise under waiting, and a complaint about something else: not counted
				{ text: 'no wait at all', sentiment: 'positive', aspect: 'wait_for_table' },
				{ text: 'pricey', sentiment: 'negative', aspect: 'price_level' },
			],
			{ index },
		);
		// No text: not a written review; another month
		addStatements(
			em(),
			review({ venue: other, text: null }),
			[{ text: 'queue', sentiment: 'negative', aspect: 'queue' }],
			{ index },
		);
		addStatements(
			em(),
			review({ publishedAt: new Date('2026-08-10T12:00:00Z') }),
			[{ text: 'queue', sentiment: 'negative', aspect: 'queue' }],
			{
				index,
			},
		);
		const mentionOf = (p: SocialPost) =>
			em().create(Mention, {
				post: p,
				brand: venue.brand,
				venue,
				venueName: 'Batu Burger',
				visited: true,
			});
		addStatements(
			em(),
			mentionOf(post()),
			[
				{
					text: 'waited 20 minutes for a table',
					sentiment: 'negative',
					aspect: 'wait_for_table',
					amount: 20,
					unit: 'minutes',
				},
			],
			{
				index,
			},
		);
		addStatements(
			em(),
			mentionOf(post({ account: own, author: own.handle })),
			[{ text: 'own queue', sentiment: 'negative', aspect: 'queue' }],
			{ index },
		);
		await em().flush();

		const res = await statements().waitComplaints(city.id, '2026-09');
		expect(res).toMatchObject({
			month: '2026-09',
			venues: 2,
			brands: 2,
			sources: 3,
			reviews: 2,
			posts: 1,
		});
		expect(res.byTheme).toEqual([
			{ theme: 'queue', venues: 1, brands: 1, sources: 1 },
			{ theme: 'wait_for_food', venues: 2, brands: 2, sources: 2 },
			{ theme: 'wait_for_table', venues: 1, brands: 1, sources: 1 },
		]);
		expect(res.stated).toEqual({
			complaints: 3,
			of: 3,
			median: 50,
			upperQuartile: 55,
			max: 60,
		});
		expect((await statements().waitComplaints(city.id, '2026-07')).sources).toBe(0);
	});

	it('a dish-only statement from the factory has no text and one food part: a food named, never praise', async () => {
		const r = review({ text: 'Had the lahmacun.' });
		const [s] = addStatements(em(), r, [{ foods: ['Lahmacun'], sentiment: 'positive' }], {
			index,
		});
		await em().flush();
		em().clear();
		const rows = await rowsOf({ review: r.id });
		expect(rows.map(x => [x.id, x.text ?? null, x.sentiment, partsOf(x), !!x.partsAt])).toEqual(
			[[s.id, null, 'positive', [['food', 'lahmacun']], true]],
		);
		expect(foodsOf(rows)).toEqual([
			{ name: 'Lahmacun', key: 'lahmacun', sentiment: 'positive', topics: ['lahmacun'] },
		]);
		expect(praiseOf(rows)).toEqual([]);
		expect(notedOf(rows)).toEqual([]);
		// Nothing for agent B: a dish-only statement has no claim to read
		expect(await parts().countPending()).toBe(0);
	});
});
