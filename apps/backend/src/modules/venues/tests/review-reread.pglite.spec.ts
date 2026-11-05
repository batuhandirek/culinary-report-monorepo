import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import _ from 'lodash';

import { LlmBacklogRegistry } from 'src/modules/backlog/services/llm-backlog-registry.service.js';
import { City } from 'src/modules/cities/entities/city.entity.js';
import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { ClaimLabelsClassifier } from 'src/modules/statements/classifiers/claim-labels.classifier.js';
import { REVIEWS_QUOTED_AT } from 'src/modules/statements/constants/statements-shipped.constant.js';
import { Statement } from 'src/modules/statements/entities/statement.entity.js';
import { StatementPart } from 'src/modules/statements/entities/statement-part.entity.js';
import { type Claim, StatementService } from 'src/modules/statements/services/statement.service.js';
import { StatementPartsService } from 'src/modules/statements/services/statement-parts.service.js';
import { labelsClassifier } from 'src/modules/statements/tests/factories/claim-labels.mock.js';
import { addStatements } from 'src/modules/statements/tests/factories/statement.factory.js';
import { Term } from 'src/modules/topics/entities/term.entity.js';
import { TermService } from 'src/modules/topics/services/term.service.js';
import { TopicService } from 'src/modules/topics/services/topic.service.js';
import { seedTopics } from 'src/modules/topics/tests/factories/topic.factory.js';
import type { TopicIndex } from 'src/modules/topics/util/topics.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { ReviewClaimsAgent } from '../agents/review-claims.agent.js';
import { Review } from '../entities/review.entity.js';
import { Venue } from '../entities/venue.entity.js';
import { ReviewService } from '../services/review.service.js';

import { venueFactory } from './factories/venue.factory.js';

/** The reading of a claim, by its text: Jev's labels, and the foods and number agent A copied out; a claim not listed is a neutral opinion about nothing */
const PARTS: Record<
	string,
	{
		sentiment?: 'positive' | 'negative' | 'neutral' | 'mixed';
		aspect?: string | null;
		foods?: string[];
		amount?: number;
		unit?: 'minutes' | 'money';
	}
> = {
	'I waited darn 50 minutes': {
		sentiment: 'negative',
		aspect: 'wait_for_food',
		amount: 50,
		unit: 'minutes',
	},
	'the döner was damn good': { sentiment: 'positive', aspect: 'taste', foods: ['Döner'] },
	'rude staff': { sentiment: 'negative', aspect: 'friendliness' },
};
/** Agent A's tokens per call, as the mock reports them */
const TOKENS = 70;
/** When the old agents read the stored reviews, the window's edge, and a read by the new agents */
const OLD = new Date('2026-10-10T12:00:00Z');
const BEFORE = new Date('2026-10-20T00:00:00Z');
const NEW = new Date('2026-10-25T12:00:00Z');
const isAfter = (date: Date | null | undefined, than = BEFORE) =>
	!!date && date.getTime() > than.getTime();
const REFRESHED = ['analysed_at', 'updated_at'];

/*
 * The `reread-reviews` backlog: reviews the old agents read are read again by agents A and B, a
 * window of `analysedAt` before a date, newest first, each review's statements replaced and its
 * `analysedAt` restamped; nothing else on the review moves.
 */
describe('ReviewService.reread (pglite)', () => {
	let harness: PgliteTestingModule;
	let city: City;
	let venue: Venue;
	let other: Venue;
	let index: TopicIndex;
	let seededTermMax = 0;
	/** Agent A's claims by review text; a review not listed is one claim, its text */
	let reviewClaims: Record<string, Claim[]> = {};
	/** The error agent A throws for a venue's review, when any */
	let failFor: ((venue: string) => Error | undefined) | undefined;

	const reviewAgent = {
		generate: jest.fn(async (input: string) => {
			// One review a call
			const { venue: name, text } = JSON.parse(input) as { venue: string; text: string };
			const error = failFor?.(name);
			if (error) throw error;
			return {
				// Each claim with what agent A copies out of the text
				object: {
					claims: (reviewClaims[text] ?? [{ text, quote: text }]).map(c => ({
						foods: PARTS[c.text]?.foods ?? [],
						amount: PARTS[c.text]?.amount ?? null,
						unit: PARTS[c.text]?.unit ?? null,
						...c,
					})),
				},
				usage: { totalTokens: TOKENS },
			};
		}),
	};
	// The claim-labels classifier, one claim a call
	const labels = labelsClassifier(text => PARTS[text]);

	const em = () => harness.orm.em;
	const sql = <T>(query: string, params: unknown[] = []): Promise<T[]> =>
		em().getConnection().execute(query, params);
	const service = () => harness.moduleRef.get(ReviewService);
	const registry = () => harness.moduleRef.get(LlmBacklogRegistry);

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				ReviewService,
				StatementService,
				StatementPartsService,
				TermService,
				TopicService,
				LlmBacklogRegistry,
				{ provide: ReviewClaimsAgent, useValue: reviewAgent },
				{ provide: ClaimLabelsClassifier, useValue: labels },
			],
		});
		entityManagerManager.setEntityManager(harness.orm.em);
		// Registered as at module init: agent B's backlog and the re-read
		harness.moduleRef.get(StatementPartsService).onModuleInit();
		service().onModuleInit();
		seedTopics(em());
		city = testCity(em());
		venue = venueFactory.build({ name: 'Batu Burger' }, { associations: { city } });
		other = venueFactory.build({ name: 'Curry 36' }, { associations: { city } });
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
		reviewClaims = {};
		failFor = undefined;
		reviewAgent.generate.mockClear();
		labels.decide.mockClear();
		const ids = { city: city.id, venue: venue.id, other: other.id };
		em().clear();
		await em().nativeDelete(Statement, {});
		await em().nativeDelete(Review, {});
		await em().nativeDelete(Term, { id: { $gt: seededTermMax } });
		city = await em().findOneOrFail(City, ids.city);
		venue = await em().findOneOrFail(Venue, ids.venue, { populate: ['brand'] });
		other = await em().findOneOrFail(Venue, ids.other, { populate: ['brand'] });
	});

	let n = 0;
	/** A written review of the venue, read by the old agents, not flushed */
	const review = (fields: Partial<Review> = {}) =>
		em().create(Review, {
			venue,
			reviewId: `rr-${n++}`,
			publishedAt: new Date('2026-09-10T12:00:00Z'),
			stars: 3,
			text: 'I waited darn 50 minutes',
			analysedAt: OLD,
			...fields,
		});
	/** A review's statements as the readers load them, in id order */
	const rowsOf = (reviewId: string) =>
		em().find(
			Statement,
			{ review: reviewId },
			{ orderBy: { id: 'asc' }, populate: ['parts.topic', 'parts.term'] },
		);
	/** A statement's parts as `[role, key]`, in rank order */
	const partsOf = (s: Statement) =>
		s.parts.getItems().map(p => [p.role, p.role === 'aspect' ? p.topic!.key : p.term!.key]);
	/** Every review's `analysedAt` by `reviewId`, read fresh */
	const analysedAt = async () => {
		em().clear();
		return Object.fromEntries(
			(await em().find(Review, {})).map(r => [r.reviewId, r.analysedAt ?? null]),
		);
	};
	const row = async (id: string) =>
		(await sql<Record<string, unknown>>('select * from reviews where id = ?', [id]))[0];
	/** The reviews agent A was asked about, in call order, by their text */
	const textsAsked = () =>
		reviewAgent.generate.mock.calls.map(
			([input]) => (JSON.parse(input) as { text: string }).text,
		);

	it('re-reads the reviews with text analysed before `before`, newest first within `limit`, nothing else; the count agrees', async () => {
		review({ reviewId: 'a', text: 'review a', publishedAt: new Date('2026-09-20T12:00:00Z') });
		review({
			reviewId: 'b',
			text: 'review b',
			venue: other,
			publishedAt: new Date('2026-09-15T12:00:00Z'),
		});
		review({ reviewId: 'c', text: 'review c', publishedAt: new Date('2026-09-05T12:00:00Z') });
		// Read by the new agents already; no text; not analysed yet (the pipeline's `analyseMonth` reads it)
		review({
			reviewId: 'later',
			publishedAt: new Date('2026-09-25T12:00:00Z'),
			analysedAt: NEW,
		});
		review({
			reviewId: 'blank',
			publishedAt: new Date('2026-09-30T12:00:00Z'),
			text: null,
			textTranslated: null,
		});
		review({
			reviewId: 'fresh',
			publishedAt: new Date('2026-09-28T12:00:00Z'),
			analysedAt: null,
		});
		await em().flush();
		expect(await service().countToReread(BEFORE)).toBe(3);

		expect(await service().reread({ before: BEFORE, limit: 2 })).toEqual({
			analysed: 2,
			tokens: 2 * TOKENS,
		});
		// The two newest, one a call
		expect(textsAsked()).toEqual(['review a', 'review b']);
		expect(await service().countToReread(BEFORE)).toBe(1);
		let at = await analysedAt();
		expect([isAfter(at.a), isAfter(at.b)]).toEqual([true, true]);
		expect([at.c, at.later, at.blank, at.fresh]).toEqual([OLD, NEW, OLD, null]);

		reviewAgent.generate.mockClear();
		expect(await service().reread({ before: BEFORE, limit: 10 })).toEqual({
			analysed: 1,
			tokens: TOKENS,
		});
		expect(textsAsked()).toEqual(['review c']);
		expect(await service().countToReread(BEFORE)).toBe(0);
		at = await analysedAt();
		expect([isAfter(at.c), at.later, at.blank, at.fresh]).toEqual([true, NEW, OLD, null]);
	});

	it("replaces the review's statements and parts with agents A and B's reading and restamps `analysedAt`; the rest of the row stays", async () => {
		const r = review({
			text: 'Rude staff, but the Pommes were good.',
			stars: 2,
			likes: 4,
			language: 'de',
			ownerResponse: 'Sorry to hear that!',
		});
		const old = addStatements(
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
		const oldIds = old.map(s => s.id);
		const oldPartIds = old.flatMap(s => s.parts.getItems().map(p => p.id));
		expect([oldIds.length, oldPartIds.length]).toEqual([2, 3]);
		const before = await row(r.id);
		expect(before.venue_id).toBe(venue.id);

		reviewClaims = {
			'Rude staff, but the Pommes were good.': [
				{ text: 'I waited darn 50 minutes', quote: 'Rude staff' },
				{ text: 'the döner was damn good', quote: 'not in the review' },
			],
		};
		expect(await service().reread({ before: BEFORE, limit: 10 })).toEqual({
			analysed: 1,
			tokens: TOKENS,
		});
		// Agent A got the venue and the review's text
		expect(JSON.parse(reviewAgent.generate.mock.calls[0][0])).toEqual({
			venue: 'Batu Burger',
			stars: 2,
			text: 'Rude staff, but the Pommes were good.',
		});
		// The labeller got one claim a call: the source, the venue and the review's other claims beside it
		expect(
			(
				labels.decide.mock.calls.map(([state]) => state) as { claim: { text: string } }[]
			).sort((x, y) => x.claim.text.localeCompare(y.claim.text)),
		).toEqual([
			{
				source: 'review',
				place: 'Batu Burger',
				otherClaims: ['the döner was damn good'],
				claim: { text: 'I waited darn 50 minutes', quote: 'Rude staff' },
			},
			{
				source: 'review',
				place: 'Batu Burger',
				otherClaims: ['I waited darn 50 minutes'],
				claim: { text: 'the döner was damn good' },
			},
		]);
		em().clear();
		const rows = await rowsOf(r.id);
		expect(
			rows.map(s => [s.text, s.sentiment, s.amount, s.unit, partsOf(s), !!s.partsAt]),
		).toEqual([
			[
				'I waited darn 50 minutes',
				'negative',
				50,
				'minutes',
				[['aspect', 'wait_for_food']],
				true,
			],
			[
				'the döner was damn good',
				'positive',
				null,
				null,
				[
					['aspect', 'taste'],
					['food', 'doner'],
				],
				true,
			],
		]);
		expect(
			rows.map(s => [s.sourceKind, s.subject, s.review?.id, s.city.id, s.month, s.saidAt]),
		).toEqual([
			['review', 'place', r.id, city.id, '2026-09', new Date('2026-09-10T12:00:00Z')],
			['review', 'place', r.id, city.id, '2026-09', new Date('2026-09-10T12:00:00Z')],
		]);
		// The old rows and their parts are gone, new ids throughout
		expect(await em().count(Statement, { id: { $in: oldIds } })).toBe(0);
		expect(await em().count(StatementPart, { id: { $in: oldPartIds } })).toBe(0);
		expect(rows.every(s => !oldIds.includes(s.id))).toBe(true);
		// A quote is kept only when it is the review's own words; B's kind is stored
		expect(rows.map(s => [s.quote ?? null, s.kind])).toEqual([
			['Rude staff', 'opinion'],
			[null, 'opinion'],
		]);
		// Restamped; venue, text, stars and every other column as they were (a review has no sentiment of its own)
		const after = await row(r.id);
		expect(isAfter(new Date(after.analysed_at as string))).toBe(true);
		expect(_.omit(after, REFRESHED)).toEqual(_.omit(before, REFRESHED));
	});

	it('is the `reread-reviews` backlog: priority 40, `remaining()` the count, a batch reads and reports `done` and the tokens', async () => {
		review({ reviewId: 'x', text: 'review x' });
		review({ reviewId: 'y', text: 'review y', venue: other });
		review({ reviewId: 'z', analysedAt: new Date(REVIEWS_QUOTED_AT.getTime() + 60_000) });
		await em().flush();
		const backlog = registry().get('reread-reviews')!;
		expect([backlog.label, backlog.priority]).toEqual(['Re-read reviews as claims', 40]);
		// After agent B's parts (10): the re-read feeds it
		expect(
			registry()
				.list()
				.map(b => b.key),
		).toEqual(['statement-parts', 'reread-reviews']);
		expect(await backlog.remaining()).toBe(2);
		expect(await service().countToReread(REVIEWS_QUOTED_AT)).toBe(2);

		expect(await backlog.runBatch()).toEqual({ done: 2, tokens: 2 * TOKENS });
		// One a call (the same `publishedAt`: no order between them)
		expect(textsAsked().sort()).toEqual(['review x', 'review y']);
		expect(await backlog.remaining()).toBe(0);
		const at = await analysedAt();
		expect([isAfter(at.x, REVIEWS_QUOTED_AT), isAfter(at.y, REVIEWS_QUOTED_AT)]).toEqual([
			true,
			true,
		]);
		// Agent B read the new claims in the same batch: nothing left for its backlog
		expect(await registry().get('statement-parts')!.remaining()).toBe(0);
	});

	it('keeps the other reviews when one fails, the failed ones left to be read again', async () => {
		const ok = review({ reviewId: 'ok' });
		const bad1 = review({ reviewId: 'bad1', venue: other, text: 'Rude staff.' });
		review({ reviewId: 'bad2', venue: other, text: 'Slow.' });
		const kept = addStatements(
			em(),
			bad1,
			[{ text: 'rude staff', sentiment: 'negative', aspect: 'friendliness' }],
			{
				index,
			},
		);
		await em().flush();

		failFor = name => (name === 'Curry 36' ? new Error('boom') : undefined);
		expect(await service().reread({ before: BEFORE, limit: 10 })).toEqual({
			analysed: 1,
			tokens: TOKENS,
		});
		// One review a call
		expect(reviewAgent.generate).toHaveBeenCalledTimes(3);
		let at = await analysedAt();
		expect([isAfter(at.ok), at.bad1, at.bad2]).toEqual([true, OLD, OLD]);
		expect((await rowsOf(bad1.id)).map(s => s.id)).toEqual(kept.map(s => s.id));
		expect((await rowsOf(ok.id)).map(s => [s.text, !!s.partsAt])).toEqual([
			['I waited darn 50 minutes', true],
		]);
		expect(await service().countToReread(BEFORE)).toBe(2);

		// Every account out of credits: the pool stops and the step fails; what finished before it
		// is kept, its claims left to the `statement-parts` backlog (agent B never ran)
		const ok2 = review({ reviewId: 'ok2' });
		await em().flush();
		failFor = name => (name === 'Curry 36' ? new Error('No credits remaining') : undefined);
		await expect(service().reread({ before: BEFORE, limit: 10 })).rejects.toThrow(
			'No credits remaining',
		);
		at = await analysedAt();
		expect([isAfter(at.ok2), at.bad1, at.bad2]).toEqual([true, OLD, OLD]);
		expect((await rowsOf(ok2.id)).map(s => [s.text, s.partsAt ?? null])).toEqual([
			['I waited darn 50 minutes', null],
		]);
		expect((await rowsOf(bad1.id)).map(s => s.id)).toEqual(kept.map(s => s.id));
		expect(await service().countToReread(BEFORE)).toBe(2);
	});
});
