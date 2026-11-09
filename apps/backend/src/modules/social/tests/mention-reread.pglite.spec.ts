import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import _ from 'lodash';

import { LlmBacklogRegistry } from 'src/modules/backlog/services/llm-backlog-registry.service.js';
import { City } from 'src/modules/cities/entities/city.entity.js';
import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import {
	PostClaimsAgent,
	type PostClaimsAnswer,
} from 'src/modules/pipeline/read-posts/agents/post-claims.agent.js';
import {
	PostGateAgent,
	type PostGateInput,
} from 'src/modules/pipeline/read-posts/agents/post-gate.agent.js';
import { gateAgent } from 'src/modules/pipeline/read-posts/tests/factories/post-gate.mock.js';
import { rereadPostsPlainly } from 'src/modules/pipeline/read-posts/tests/factories/read-posts.factory.js';
import { ClaimLabelsClassifier } from 'src/modules/statements/classifiers/claim-labels.classifier.js';
import { POSTS_GATED_AT } from 'src/modules/statements/constants/statements-shipped.constant.js';
import { Statement } from 'src/modules/statements/entities/statement.entity.js';
import { StatementService } from 'src/modules/statements/services/statement.service.js';
import { StatementPartsService } from 'src/modules/statements/services/statement-parts.service.js';
import { labelsClassifier } from 'src/modules/statements/tests/factories/claim-labels.mock.js';
import { addStatements } from 'src/modules/statements/tests/factories/statement.factory.js';
import { Term } from 'src/modules/topics/entities/term.entity.js';
import { TermService } from 'src/modules/topics/services/term.service.js';
import { TopicService } from 'src/modules/topics/services/topic.service.js';
import { seedTopics } from 'src/modules/topics/tests/factories/topic.factory.js';
import type { TopicIndex } from 'src/modules/topics/util/topics.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { venueFactory } from 'src/modules/venues/tests/factories/venue.factory.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { Mention, MentionMatchMethodEnum } from '../entities/mention.entity.js';
import {
	PostSkipReasonEnum,
	SocialPlatformEnum,
	SocialPost,
} from '../entities/social-post.entity.js';
import { MentionExtractionService } from '../services/mention-extraction.service.js';

import { ownAccount } from './factories/social-account.factory.js';

/** The reading of a claim, by its text: Jev's labels, and the foods and number agent A copied out; a claim not listed is a neutral opinion about nothing */
const PARTS: Record<
	string,
	{
		sentiment?: 'positive' | 'negative' | 'neutral' | 'mixed';
		aspect?: string | null;
		foods?: string[];
		amount?: number;
		unit?: 'minutes' | 'money';
		kind?: string;
	}
> = {
	'the broth was damn good': { sentiment: 'positive', aspect: 'taste', foods: ['broth'] },
	'the döner cost 15 euros': {
		sentiment: 'negative',
		aspect: 'price_level',
		foods: ['Döner'],
		amount: 15,
		unit: 'money',
	},
	// A change is the claim's kind (claim model v2): the aspect says what it is about
	'Berlin has increasing prices in the last years': {
		sentiment: 'negative',
		aspect: 'price_level',
		kind: 'change',
	},
};
/** Agent A's tokens per call, as the mock reports them */
const TOKENS = 321;
/** When the old agents read the stored posts, the window's edge, and a read by the new agents */
const OLD = new Date('2026-10-10T12:00:00Z');
const BEFORE = new Date('2026-10-20T00:00:00Z');
const NEW = new Date('2026-10-25T12:00:00Z');
const isAfter = (date: Date | null | undefined, than = BEFORE) =>
	!!date && date.getTime() > than.getTime();
/** What a paired mention takes from the answer: its own reading, never its match */
const REFRESHED = ['visited', 'is_new_opening', 'updated_at'];

type AnswerClaim = PostClaimsAnswer['claims'][number];
interface Answer {
	isPromotional: boolean;
	places: ReturnType<typeof place>[];
	claims: AnswerClaim[];
}
const place = (venueName: string, extra: Partial<Record<string, unknown>> = {}) => ({
	venueName,
	locationHint: null,
	cuisine: null,
	city: 'Berlin',
	visited: true,
	isNewOpening: false,
	...extra,
});
/** A claim as agent A answers it: its place by the name in the answer's places */
const claim = (
	text: string,
	subject: AnswerClaim['subject'],
	placeName: string | null = null,
	quote: string | null = null,
): AnswerClaim => ({
	text,
	quote,
	// What agent A copies out of the text
	foods: PARTS[text]?.foods ?? [],
	amount: PARTS[text]?.amount ?? null,
	unit: PARTS[text]?.unit ?? null,
	subject,
	place: placeName,
});
const NOTHING: Answer = { isPromotional: false, places: [], claims: [] };

/*
 * The re-read of stored posts (`reread-posts`): the gate first (a skipped post loses its claims and
 * every mention but an admin's), then agent A's places paired with the stored mentions by name: a
 * paired mention takes the answer's reading and the place's claims and is never re-matched, a new
 * place is added, an unnamed unmatched mention is deleted, an unnamed matched one kept unconfirmed,
 * an admin's left alone; the post's city claims are written.
 */
describe('MentionExtractionService.reread (pglite)', () => {
	let harness: PgliteTestingModule;
	let city: City;
	let pho: Venue;
	let kaffee: Venue;
	let index: TopicIndex;
	let seededTermMax = 0;
	/** Agent A's answer per post, found by the caption's marker */
	let answers: Record<string, Answer> = {};
	/** The marker of the post agent A fails on, when any */
	let failFor: string | undefined;
	/** The gate's reason to skip a post, by its caption's marker */
	let skipFor: Record<string, PostSkipReasonEnum> = {};
	const gate = gateAgent(p => skipFor[/\[(p\d+)\]/.exec(p.text)?.[1] ?? '']);

	const postAgent = {
		generate: jest.fn(async (input: string) => {
			const marker = Object.keys(answers).find(k => input.includes(k));
			if (!marker) throw new Error(`unexpected post: ${input.slice(0, 80)}`);
			if (marker === failFor) throw new Error('boom');
			return { object: answers[marker], usage: { totalTokens: TOKENS } };
		}),
	};
	// The claim-labels classifier, one claim a call
	const labels = labelsClassifier(text => PARTS[text]);

	const em = () => harness.orm.em;
	const sql = <T>(query: string, params: unknown[] = []): Promise<T[]> =>
		em().getConnection().execute(query, params);
	const service = () => harness.moduleRef.get(MentionExtractionService);
	const registry = () => harness.moduleRef.get(LlmBacklogRegistry);
	const reread = () => rereadPostsPlainly(harness.moduleRef, { before: BEFORE, limit: 10 });

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				MentionExtractionService,
				StatementService,
				StatementPartsService,
				TermService,
				TopicService,
				LlmBacklogRegistry,
				{ provide: PostClaimsAgent, useValue: postAgent },
				{ provide: PostGateAgent, useValue: gate },
				{ provide: ClaimLabelsClassifier, useValue: labels },
			],
		});
		entityManagerManager.setEntityManager(harness.orm.em);
		// Registered as at module init: agent B's backlog
		harness.moduleRef.get(StatementPartsService).onModuleInit();
		seedTopics(em());
		city = testCity(em());
		pho = venueFactory.build({ name: 'Pho House' }, { associations: { city } });
		kaffee = venueFactory.build({ name: 'Kiez Kaffee' }, { associations: { city } });
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
		answers = {};
		failFor = undefined;
		skipFor = {};
		postAgent.generate.mockClear();
		gate.generate.mockClear();
		labels.decide.mockClear();
		const ids = { city: city.id, pho: pho.id, kaffee: kaffee.id };
		em().clear();
		await em().nativeDelete(Statement, {});
		await em().nativeDelete(Mention, {});
		await em().nativeDelete(SocialPost, {});
		await em().nativeDelete(Term, { id: { $gt: seededTermMax } });
		city = await em().findOneOrFail(City, ids.city);
		pho = await em().findOneOrFail(Venue, ids.pho, { populate: ['brand'] });
		kaffee = await em().findOneOrFail(Venue, ids.kaffee, { populate: ['brand'] });
	});

	let n = 0;
	/** A post of the city read by the old agents, its caption carrying `marker`, not flushed */
	const post = (marker: string, fields: Partial<SocialPost> = {}) =>
		em().create(SocialPost, {
			city,
			externalId: `rr-${marker}`,
			platform: SocialPlatformEnum.TIKTOK,
			url: `https://tiktok.com/rr/${n++}`,
			author: 'eater',
			views: 100,
			text: `Post [${marker}] about the places we ate at in Berlin this week, all worth a visit #berlinfood`,
			postedAt: new Date('2026-09-12T12:00:00Z'),
			analysedAt: OLD,
			isPromotional: false,
			analysisTokens: 1234,
			...fields,
		});
	/** A stored mention of the post, as the old agents read it, not flushed */
	const mention = (p: SocialPost, venueName: string, extra: Partial<Mention> = {}) =>
		em().create(Mention, { post: p, venueName, visited: true, ...extra });
	/** A mention matched to a venue by the matcher */
	const matched = (venue: Venue, extra: Partial<Mention> = {}) => ({
		venue,
		brand: venue.brand,
		matchMethod: MentionMatchMethodEnum.EXACT,
		matchScore: 1,
		matchedAt: new Date('2026-10-11T00:00:00Z'),
		...extra,
	});
	/** A mention's old statement, one claim about the place */
	const oldClaim = (m: Mention, text: string) =>
		addStatements(em(), m, [{ text, sentiment: 'positive', aspect: 'taste' }], { index });
	/** A post's statements as the readers load them, in id order */
	const rowsOf = (postId: string) =>
		em().find(
			Statement,
			{ post: postId },
			{ orderBy: { id: 'asc' }, populate: ['parts.topic', 'parts.term'] },
		);
	/** A statement's parts as `[role, key]`, in rank order */
	const partsOf = (s: Statement) =>
		s.parts.getItems().map(p => [p.role, p.role === 'aspect' ? p.topic!.key : p.term!.key]);
	const row = async (id: number) =>
		(await sql<Record<string, unknown>>('select * from mentions where id = ?', [id]))[0];
	const matchOf = (r: Record<string, unknown>) => _.omit(r, REFRESHED);
	const markersAsked = () =>
		postAgent.generate.mock.calls.map(([input]) => /\[(p\d+)\]/.exec(input)![1]);

	it("pairs the answered places with the stored mentions by name, replaces the paired mentions' statements and the post's city claims, adds a new place", async () => {
		const p = post('p1');
		const m1 = mention(p, 'Pho House', matched(pho));
		// An admin linked it: a manual mention keeps its correction and takes the new claims
		const m2 = mention(p, 'Döner Palast', {
			venue: kaffee,
			brand: kaffee.brand,
			matchMethod: MentionMatchMethodEnum.MANUAL,
			matchNote: 'the kiosk inside Kiez Kaffee',
		});
		const old = [
			...oldClaim(m1, 'old pho claim'),
			...oldClaim(m2, 'old palast claim'),
			...addStatements(
				em(),
				m1,
				[{ text: 'old city claim', subject: 'city', aspect: 'price_level', change: true }],
				{ index },
			),
		];
		await em().flush();
		expect(old.map(s => s.mention?.id ?? null)).toEqual([m1.id, m2.id, null]);
		const before = [await row(m1.id), await row(m2.id)];
		answers = {
			'[p1]': {
				isPromotional: true,
				// The case and the accent differ from the stored names; the third place is new to the post
				places: [
					place('PHO HOUSE', { visited: false, isNewOpening: true }),
					place('Doner Palast'),
					place('Some New Bar'),
				],
				claims: [
					// The caption's own words are kept as the quote; words it never said are not
					claim('the broth was damn good', 'place', 'PHO HOUSE', 'all worth a visit'),
					claim(
						'the döner cost 15 euros',
						'place',
						'Doner Palast',
						'der Döner kostet 15 Euro',
					),
					claim('some new bar is great', 'place', 'Some New Bar'),
					claim('Berlin has increasing prices in the last years', 'city', null),
					claim('the weather was nice', 'none'),
				],
			},
		};
		expect(await service().countToReread(BEFORE)).toBe(1);
		expect(await reread()).toEqual({
			posts: 1,
			read: 1,
			failed: 0,
			skipped: 0,
			paired: 2,
			added: 1,
			deleted: 0,
			unconfirmed: 0,
			claims: 5,
			cityClaims: 1,
			tokens: TOKENS,
		});
		expect(await service().countToReread(BEFORE)).toBe(0);
		const [, context] = postAgent.generate.mock.calls[0] as unknown as [
			string,
			{ cityName: string; topics: string[] },
		];
		expect([context.cityName, context.topics.length > 0]).toEqual(['Berlin', true]);

		em().clear();
		// The new place is a mention of its own, unmatched until the next matching run, with its claim
		const mentions = await em().find(Mention, {}, { orderBy: { id: 'asc' } });
		expect(mentions.map(m => m.id).slice(0, 2)).toEqual([m1.id, m2.id]);
		const added = mentions[2];
		expect([
			mentions.length,
			added.venueName,
			added.matchMethod ?? null,
			added.matchedAt ?? null,
		]).toEqual([3, 'Some New Bar', null, null]);
		const rows = await rowsOf(p.id);
		expect(
			rows.map(s => [
				s.text,
				s.subject,
				s.mention?.id ?? null,
				s.sentiment,
				s.amount,
				partsOf(s),
				!!s.partsAt,
			]),
		).toEqual([
			[
				'the broth was damn good',
				'place',
				m1.id,
				'positive',
				null,
				[
					['aspect', 'taste'],
					['food', 'broth'],
				],
				true,
			],
			[
				'the döner cost 15 euros',
				'place',
				m2.id,
				'negative',
				15,
				[
					['aspect', 'price_level'],
					['food', 'doner'],
				],
				true,
			],
			['some new bar is great', 'place', added.id, 'neutral', null, [], true],
			[
				'Berlin has increasing prices in the last years',
				'city',
				null,
				'negative',
				null,
				[['aspect', 'price_level']],
				true,
			],
			['the weather was nice', 'none', null, 'neutral', null, [], true],
		]);
		expect(
			rows.map(s => [s.sourceKind, s.post?.id, s.city.id, s.month, s.kind, s.quote ?? null]),
		).toEqual([
			['post', p.id, city.id, '2026-09', 'opinion', 'all worth a visit'],
			['post', p.id, city.id, '2026-09', 'opinion', null],
			['post', p.id, city.id, '2026-09', 'opinion', null],
			['post', p.id, city.id, '2026-09', 'change', null],
			['post', p.id, city.id, '2026-09', 'opinion', null],
		]);
		expect(await em().count(Statement, { id: { $in: old.map(s => s.id) } })).toBe(0);
		// The paired mentions take the answer's reading; brand, venue, method, note and score are byte-identical
		const after = [await row(m1.id), await row(m2.id)];
		expect(after.map(r => [r.visited, r.is_new_opening])).toEqual([
			[false, true],
			[true, false],
		]);
		expect(after.map(matchOf)).toEqual(before.map(matchOf));
		expect([
			after[0].venue_id,
			after[0].brand_id,
			after[0].match_method,
			after[0].match_score,
		]).toEqual([pho.id, pho.brand.id, 'exact', 1]);
		expect([
			after[1].venue_id,
			after[1].brand_id,
			after[1].match_method,
			after[1].match_note,
		]).toEqual([kaffee.id, kaffee.brand.id, 'manual', 'the kiosk inside Kiez Kaffee']);
		const saved = await em().findOneOrFail(SocialPost, p.id);
		expect([saved.isPromotional, saved.analysisTokens, isAfter(saved.analysedAt)]).toEqual([
			true,
			TOKENS,
			true,
		]);
		// Agent B read the new claims in the same batch, one call a claim
		expect(labels.decide).toHaveBeenCalledTimes(5);
		expect(await registry().get('statement-parts')!.remaining()).toBe(0);
	});

	it('pairs the one stored mention left with the one answered place left, spelled another way', async () => {
		const p = post('p2');
		const m = mention(p, 'Kiez Kaffee', matched(kaffee));
		const old = oldClaim(m, 'old kaffee claim');
		await em().flush();
		const before = await row(m.id);
		answers = {
			'[p2]': {
				isPromotional: false,
				places: [place('Kiezkaffee Neukölln', { visited: false })],
				claims: [claim('the flat white was great', 'place', 'Kiezkaffee Neukölln')],
			},
		};
		expect(await reread()).toMatchObject({
			read: 1,
			paired: 1,
			added: 0,
			deleted: 0,
			unconfirmed: 0,
			claims: 1,
			cityClaims: 0,
		});
		em().clear();
		expect((await rowsOf(p.id)).map(s => [s.text, s.mention?.id])).toEqual([
			['the flat white was great', m.id],
		]);
		expect(await em().count(Statement, { id: old[0].id })).toBe(0);
		expect(await em().count(Mention, {})).toBe(1);
		const after = await row(m.id);
		expect([after.visited, after.venue_name]).toEqual([false, 'Kiez Kaffee']);
		expect(matchOf(after)).toEqual(matchOf(before));
	});

	it("keeps a matched mention the answer didn't name with its statements, unconfirmed, and leaves an ignored mention alone even when a place names it", async () => {
		const p = post('p3');
		const named = mention(p, 'Pho House', matched(pho));
		const quiet = mention(p, 'Kiez Kaffee', matched(kaffee));
		const q = post('p4');
		const named2 = mention(q, 'Pho House', matched(pho));
		// An admin marked it as not a venue
		const ignored = mention(q, 'Lazy Bar', {
			matchMethod: MentionMatchMethodEnum.IGNORED,
			matchNote: 'a club',
		});
		const kept = [
			...oldClaim(quiet, 'old kaffee claim'),
			...oldClaim(ignored, 'old lazy claim'),
		];
		oldClaim(named, 'old pho claim');
		oldClaim(named2, 'old pho claim');
		await em().flush();
		const before = [await row(quiet.id), await row(ignored.id)];
		answers = {
			'[p3]': {
				...NOTHING,
				places: [place('Pho House')],
				claims: [claim('the pho was great', 'place', 'Pho House')],
			},
			'[p4]': {
				...NOTHING,
				places: [place('Pho House'), place('Lazy Bar', { visited: false })],
				claims: [
					claim('the pho was great', 'place', 'Pho House'),
					claim('lazy bar was loud', 'place', 'Lazy Bar'),
				],
			},
		};
		expect(await reread()).toEqual({
			posts: 2,
			read: 2,
			failed: 0,
			skipped: 0,
			paired: 2,
			added: 0,
			deleted: 0,
			unconfirmed: 1,
			claims: 2,
			cityClaims: 0,
			tokens: 2 * TOKENS,
		});
		em().clear();
		const after = [await row(quiet.id), await row(ignored.id)];
		expect(after[1]).toEqual(before[1]);
		// The matched one keeps its match and is listed for an admin
		expect(_.omit(after[0], ['unconfirmed_at', 'updated_at'])).toEqual(
			_.omit(before[0], ['unconfirmed_at', 'updated_at']),
		);
		expect([
			before[0].unconfirmed_at,
			isAfter(new Date(after[0].unconfirmed_at as string)),
		]).toEqual([null, true]);
		expect((await rowsOf(p.id)).map(s => [s.text, s.mention?.id])).toEqual([
			['old kaffee claim', quiet.id],
			['the pho was great', named.id],
		]);
		expect((await rowsOf(q.id)).map(s => [s.text, s.mention?.id])).toEqual([
			['old lazy claim', ignored.id],
			['the pho was great', named2.id],
		]);
		expect(await em().count(Statement, { id: { $in: kept.map(s => s.id) } })).toBe(2);
		expect(await em().count(Mention, {})).toBe(4);
	});

	it('never pairs a place naming an ignored mention with the one other mention left: the ignored one is the match and left alone, the unmatched one unnamed is deleted', async () => {
		const p = post('p5');
		const taco = mention(p, 'Taco Loco', { matchMethod: MentionMatchMethodEnum.NONE });
		const lazy = mention(p, 'Lazy Bar', { matchMethod: MentionMatchMethodEnum.IGNORED });
		const kept = [...oldClaim(taco, 'old taco claim'), ...oldClaim(lazy, 'old lazy claim')];
		await em().flush();
		const before = [await row(taco.id), await row(lazy.id)];
		answers = {
			'[p5]': {
				...NOTHING,
				places: [place('Lazy Bar', { visited: false })],
				claims: [claim('lazy bar was loud', 'place', 'Lazy Bar')],
			},
		};
		expect(await reread()).toMatchObject({
			read: 1,
			paired: 0,
			added: 0,
			deleted: 1,
			unconfirmed: 0,
			claims: 0,
		});
		em().clear();
		expect([await row(taco.id), await row(lazy.id)]).toEqual([undefined, before[1]]);
		expect((await rowsOf(p.id)).map(s => s.id)).toEqual([kept[1].id]);
	});

	it('takes the posts analysed before `before` most viewed first within `limit`, and leaves the others as they were', async () => {
		post('p6', { views: 300 });
		post('p7', { views: 200 });
		const low = post('p8', { views: 100 });
		const later = post('p9', { views: 900, analysedAt: NEW });
		const kept = [
			...oldClaim(mention(low, 'Pho House', matched(pho)), 'old low claim'),
			...oldClaim(mention(later, 'Pho House', matched(pho)), 'old later claim'),
		];
		await em().flush();
		answers = { '[p6]': NOTHING, '[p7]': NOTHING, '[p8]': NOTHING, '[p9]': NOTHING };
		expect(await service().countToReread(BEFORE)).toBe(3);
		expect(
			await rereadPostsPlainly(harness.moduleRef, { before: BEFORE, limit: 2 }),
		).toMatchObject({
			posts: 2,
			read: 2,
			failed: 0,
		});
		expect(markersAsked()).toEqual(['p6', 'p7']);
		expect(await service().countToReread(BEFORE)).toBe(1);
		em().clear();
		const at = Object.fromEntries(
			(await em().find(SocialPost, {})).map(x => [x.externalId, x.analysedAt ?? null]),
		);
		expect([isAfter(at['rr-p6']), isAfter(at['rr-p7']), at['rr-p8'], at['rr-p9']]).toEqual([
			true,
			true,
			OLD,
			NEW,
		]);
		expect((await em().find(Statement, {}, { orderBy: { id: 'asc' } })).map(s => s.id)).toEqual(
			kept.map(s => s.id),
		);
	});

	it('takes the posts read before the cutoff, as many as asked, and counts what is left', async () => {
		post('p10');
		post('p11');
		post('p12', { analysedAt: new Date(POSTS_GATED_AT.getTime() + 60_000) });
		await em().flush();
		answers = { '[p10]': NOTHING, '[p11]': NOTHING, '[p12]': NOTHING };
		expect(await service().countToReread(POSTS_GATED_AT)).toBe(2);
		expect(
			await rereadPostsPlainly(harness.moduleRef, { before: POSTS_GATED_AT, limit: 10 }),
		).toMatchObject({
			read: 2,
			tokens: 2 * TOKENS,
		});
		expect(markersAsked().sort()).toEqual(['p10', 'p11']);
		expect(await service().countToReread(POSTS_GATED_AT)).toBe(0);
	});

	it('counts a failing post as `failed`, keeps its statements and `analysedAt`, and writes the other posts of the batch', async () => {
		const ok = post('p13');
		const bad = post('p14');
		const okM = mention(ok, 'Pho House', matched(pho));
		const kept = oldClaim(mention(bad, 'Pho House', matched(pho)), 'old bad claim');
		oldClaim(okM, 'old ok claim');
		await em().flush();
		answers = {
			'[p13]': {
				...NOTHING,
				places: [place('Pho House')],
				claims: [claim('the pho was great', 'place', 'Pho House')],
			},
			'[p14]': NOTHING,
		};
		failFor = '[p14]';
		expect(await reread()).toEqual({
			posts: 2,
			read: 1,
			failed: 1,
			skipped: 0,
			paired: 1,
			added: 0,
			deleted: 0,
			unconfirmed: 0,
			claims: 1,
			cityClaims: 0,
			tokens: TOKENS,
		});
		em().clear();
		const saved = await em().findOneOrFail(SocialPost, bad.id);
		expect([saved.analysedAt, saved.isPromotional, saved.analysisTokens]).toEqual([
			OLD,
			false,
			1234,
		]);
		expect((await rowsOf(bad.id)).map(s => s.id)).toEqual(kept.map(s => s.id));
		expect((await rowsOf(ok.id)).map(s => [s.text, s.mention?.id, !!s.partsAt])).toEqual([
			['the pho was great', okM.id, true],
		]);
		expect(await service().countToReread(BEFORE)).toBe(1);
	});

	it("doesn't digest a post the gate skips: its claims go, and every mention but an admin's, with the reason kept", async () => {
		const p = post('p15');
		const gone = mention(p, 'Grunewald', matched(pho));
		const none = mention(p, 'Tegeler Forst', { matchMethod: MentionMatchMethodEnum.NONE });
		const manual = mention(p, 'Pilz Bar', {
			venue: kaffee,
			brand: kaffee.brand,
			matchMethod: MentionMatchMethodEnum.MANUAL,
		});
		oldClaim(gone, 'some mushrooms are poisonous');
		oldClaim(none, 'the forest has Steinpilze');
		const kept = oldClaim(manual, 'pilz bar serves mushrooms');
		addStatements(em(), gone, [{ text: 'mushroom season ended', subject: 'city' }], { index });
		await em().flush();
		skipFor = { p15: PostSkipReasonEnum.OUTDOORS };
		expect(await reread()).toMatchObject({
			posts: 1,
			read: 1,
			skipped: 1,
			deleted: 2,
			claims: 0,
			failed: 0,
		});
		expect(postAgent.generate).not.toHaveBeenCalled();
		em().clear();
		expect((await em().find(Mention, {})).map(m => m.id)).toEqual([manual.id]);
		expect((await rowsOf(p.id)).map(s => s.id)).toEqual(kept.map(s => s.id));
		const saved = await em().findOneOrFail(SocialPost, p.id);
		expect([saved.skipReason, isAfter(saved.gatedAt), isAfter(saved.analysedAt)]).toEqual([
			'outdoors',
			true,
			true,
		]);
		expect(await service().countToReread(BEFORE)).toBe(0);
	});

	it("skips a post with nothing to read without asking the gate, tells agent A and the gate when the post is a venue's own, and never stores it as promotional", async () => {
		const empty = post('p16', { text: '#berlinfood #fyp' });
		const own = post('p17', { account: ownAccount(em(), pho.brand, city, 'phohouse') });
		await em().flush();
		answers = {
			'[p17]': {
				...NOTHING,
				// A venue's own post is never promotional, whatever agent A says
				isPromotional: true,
				places: [place(pho.brand.name)],
				claims: [claim('three new flavours', 'place', pho.brand.name)],
			},
		};
		expect(await reread()).toMatchObject({ read: 2, skipped: 1, added: 1, claims: 1 });
		// One post a call: the empty one never reaches the gate
		expect(gate.generate).toHaveBeenCalledTimes(1);
		const asked = JSON.parse(gate.generate.mock.calls[0][0] as string) as PostGateInput;
		expect(asked).toEqual(expect.objectContaining({ ownBrand: pho.brand.name }));
		// Agent A is told in the message, never the context (the cached instructions stay one)
		const [message, context] = postAgent.generate.mock.calls[0] as unknown as [
			string,
			{ ownBrand?: string },
		];
		expect(message).toContain(`Posted by the venue's own account: ${pho.brand.name}`);
		expect(context.ownBrand).toBeUndefined();
		em().clear();
		expect((await em().findOneOrFail(SocialPost, empty.id)).skipReason).toBe('no_content');
		const saved = await em().findOneOrFail(SocialPost, own.id);
		expect([saved.skipReason ?? null, saved.isPromotional]).toEqual([null, false]);
	});
});
