import type { EntityManager } from '@mikro-orm/postgresql';

import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';

import type { City } from 'src/modules/cities/entities/city.entity.js';
import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { Mention, MentionMatchMethodEnum } from 'src/modules/social/entities/mention.entity.js';
import { SocialPlatformEnum, SocialPost } from 'src/modules/social/entities/social-post.entity.js';
import { ownAccount } from 'src/modules/social/tests/factories/social-account.factory.js';
import { TopicService } from 'src/modules/topics/services/topic.service.js';
import { seedTopics } from 'src/modules/topics/tests/factories/topic.factory.js';
import type { TopicIndex } from 'src/modules/topics/util/topics.js';
import { Review } from 'src/modules/venues/entities/review.entity.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { toVectorLiteral } from 'src/shared/util/vector.js';
import { mockAgent } from 'src/tests/mock-agent.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { type AspectSuggestion, AspectSuggestionAgent } from '../agents/aspect-suggestion.agent.js';
import { AdminStatementsController } from '../controllers/admin.statements.controller.js';
import type { Statement } from '../entities/statement.entity.js';
import { StatementClusterService } from '../services/statement-cluster.service.js';

import { addStatements, type TestClaim } from './factories/statement.factory.js';

/** A 1024-long vector starting with the given values, zeros after */
const vec = (...lead: number[]) => [...lead, ...Array(1024 - lead.length).fill(0)];
// Two wordings of "the music is too loud" (cos 0.86: one cluster, two sub-clusters), cash, a stray claim
const MUSIC = vec(0, 0, 1);
const MUSIC_TOO = vec(0, 0, 1, 0, 0, 0.6);
const CASH = vec(0, 0, 0, 1);
const STRAY = vec(0, 0, 0, 0, 1);

/*
 * "Missing aspects": a city's month of claims with no aspect or only a root, own posts out, other
 * months and finer aspects out, clustered at the floors (5 claims, 3 sources, 2 brands with the city
 * as one), each named by the suggestion agent (mocked), samples one per sub-cluster, kept in memory.
 */
describe('statement clusters (pglite)', () => {
	let harness: PgliteTestingModule;
	let em: EntityManager;
	let city: City;
	let index: TopicIndex;
	let controller: AdminStatementsController;
	let answer: AspectSuggestion | Error;
	const agent = mockAgent(() => {
		if (answer instanceof Error) throw answer;
		return answer;
	});
	const vectors = new Map<Statement, number[] | null>();
	const claims = (source: Review | Mention, list: (TestClaim & { vector: number[] | null })[]) =>
		addStatements(em, source, list, { index }).forEach((s, i) =>
			vectors.set(s, list[i].vector),
		);
	let n = 0;
	const post = (opts: { account?: ReturnType<typeof ownAccount>; month?: string } = {}) =>
		em.create(SocialPost, {
			city,
			externalId: `sc-p${++n}`,
			platform: SocialPlatformEnum.TIKTOK,
			url: `https://tiktok.com/sc-p${n}`,
			author: opts.account?.handle ?? 'eater',
			account: opts.account,
			postedAt: new Date(`${opts.month ?? '2026-10'}-10T18:00:00Z`),
		});
	const mention = (p: SocialPost, venue: Venue) =>
		em.create(Mention, {
			post: p,
			venue,
			brand: venue.brand,
			venueName: venue.name,
			matchMethod: MentionMatchMethodEnum.EXACT,
			visited: true,
		});
	const review = (venue: Venue, month = '2026-10') =>
		em.create(Review, {
			venue,
			reviewId: `sc-r${++n}`,
			publishedAt: new Date(`${month}-12T12:00:00Z`),
		});

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				StatementClusterService,
				TopicService,
				AdminStatementsController,
				{ provide: AspectSuggestionAgent, useValue: agent },
			],
		});
		entityManagerManager.setEntityManager(harness.orm.em);
		em = harness.orm.em as EntityManager;
		controller = harness.moduleRef.get(AdminStatementsController);
		seedTopics(em, ['vibe', 'payment', 'price_level']);
		city = testCity(em, { name: 'Berlin', aliases: [] });
		const bar = em.create(Venue, { city, placeId: 'sc-1', name: 'Bar Eins' });
		const club = em.create(Venue, { city, placeId: 'sc-2', name: 'Club Zwei' });
		await em.flush();
		index = await harness.moduleRef.get(TopicService).index();
		const barOwn = ownAccount(em, bar.brand, city, 'bareins');

		// The cluster: five claims, five sources, two brands and the city, at a root or under no aspect
		const r1 = review(bar);
		claims(r1, [
			{
				text: 'the music was way too loud',
				sentiment: 'negative',
				aspect: 'vibe',
				vector: MUSIC,
			},
		]);
		claims(review(club), [
			{
				text: "couldn't hear each other over the music",
				sentiment: 'negative',
				vector: MUSIC_TOO,
			},
		]);
		claims(review(club), [
			{
				text: 'the music volume is crazy',
				sentiment: 'negative',
				aspect: 'vibe',
				vector: MUSIC,
			},
		]);
		claims(mention(post(), bar), [
			{ text: 'loud music all night', sentiment: 'negative', vector: MUSIC_TOO },
		]);
		claims(mention(post(), bar), [
			{
				text: 'Berlin bars play their music too loud',
				sentiment: 'negative',
				subject: 'city',
				vector: MUSIC,
			},
		]);
		// Out: a finer aspect, another month, the brand's own post (about itself and about the city)
		claims(review(club), [
			{ text: 'music made the drinks pricey', aspect: 'price_level', vector: MUSIC },
		]);
		claims(review(bar, '2026-09'), [{ text: 'september music was loud', vector: MUSIC }]);
		const own = post({ account: barOwn });
		claims(mention(own, bar), [
			{ text: 'the best music in town', sentiment: 'positive', vector: MUSIC },
			{ text: 'Berlin nights need loud music', subject: 'city', vector: MUSIC },
		]);
		// "Cash only" five times, but from two sources: under the floor
		const r4 = review(bar);
		const r5 = review(club);
		claims(r4, [
			{ text: 'cash only', aspect: 'payment', vector: CASH },
			{ text: 'no cards', aspect: 'payment', vector: CASH },
			{ text: 'bring cash', vector: CASH },
		]);
		claims(r5, [
			{ text: 'cash only, really', vector: CASH },
			{ text: 'they only take cash', vector: CASH },
		]);
		claims(review(club), [
			{ text: 'came on a Tuesday', vector: STRAY },
			// Not embedded yet: counted, not clustered
			{ text: 'the bouncer was nice', vector: null },
		]);
		await em.flush();
		for (const [statement, vector] of vectors)
			if (vector)
				await em
					.getConnection()
					.execute(
						`update statements set embedding = ?::halfvec(1024), embedded_at = now() where id = ?`,
						[toVectorLiteral(vector), statement.id],
					);
		em.clear();
	});

	afterAll(async () => {
		await harness.stop();
	});

	beforeEach(() => {
		agent.generate.mockClear();
		answer = {
			isAspect: true,
			label: 'Music volume',
			hint: 'How loud the music is, not which music',
			root: 'vibe',
			fits: null,
		};
	});

	it("clusters the month's claims no aspect fits, at the floors, and names each", async () => {
		const res = await controller.getStatementClusters({ cityId: city.id, month: '2026-10' });
		// Five music claims, five cash claims, the stray: own posts, other months and finer aspects out
		expect([res.months, res.claims, res.considered, res.notEmbedded, res.more]).toEqual([
			['2026-10'],
			11,
			11,
			1,
			0,
		]);
		expect(res.clusters).toHaveLength(1);
		const [music] = res.clusters;
		expect(music).toMatchObject({
			label: 'Music volume',
			hint: 'How loud the music is, not which music',
			root: 'vibe',
			claims: 5,
			sources: 5,
		});
		expect(music.fits).toBeUndefined();
		expect(music.brands.map(b => [b.name, b.claims, !!b.id]).sort()).toEqual([
			['Bar Eins', 2, true],
			['Club Zwei', 2, true],
			['The city', 1, false],
		]);
		expect(music.filedAt).toEqual([
			{ label: 'No aspect', claims: 3 },
			{ aspect: 'vibe', label: index.label('vibe'), claims: 2 },
		]);
		// One sample per wording, never two of one
		expect(music.samples).toHaveLength(2);
		const loud = [
			'the music was way too loud',
			'the music volume is crazy',
			'Berlin bars play their music too loud',
		];
		const over = ["couldn't hear each other over the music", 'loud music all night'];
		expect(loud).toContain(music.samples[0].text);
		expect(over).toContain(music.samples[1].text);
		expect(music.like).toBe(music.samples[0].text);

		expect(agent.generate).toHaveBeenCalledTimes(1);
		const [input, context] = agent.generate.mock.calls[0] as [
			string,
			{ legend: string; roots: string[] },
		];
		const asked = JSON.parse(input);
		expect(asked.claims.slice().sort()).toEqual([...loud, ...over].sort());
		expect(asked.filedAt).toEqual([
			{ aspect: 'none', claims: 3 },
			{ aspect: 'vibe', claims: 2 },
		]);
		expect(context.roots).toEqual(expect.arrayContaining(['vibe', 'payment', 'price']));
		expect(context.legend).toContain('price_level');
	});

	it('serves a scope from memory the second time', async () => {
		const again = await controller.getStatementClusters({ cityId: city.id, month: '2026-10' });
		expect(again.clusters[0].label).toBe('Music volume');
		expect(agent.generate).not.toHaveBeenCalled();
	});

	it('narrows to one root or to the claims under none, and refuses a key that is no root', async () => {
		const none = await controller.getStatementClusters({
			cityId: city.id,
			month: '2026-10',
			root: 'none',
		});
		// Three music claims under no aspect: under the floor
		expect([none.considered, none.clusters.length]).toEqual([7, 0]);
		const vibe = await controller.getStatementClusters({
			cityId: city.id,
			month: '2026-10',
			root: 'vibe',
		});
		expect([vibe.considered, vibe.clusters.length]).toEqual([2, 0]);
		await expect(
			controller.getStatementClusters({
				cityId: city.id,
				month: '2026-10',
				root: 'price_level',
			}),
		).rejects.toThrow('Not a root aspect: price_level');
	});

	it('takes a quarter, keeps an existing aspect it fits, and drops a root it was never given', async () => {
		answer = {
			isAspect: true,
			label: 'Loud music in the bars tonight',
			hint: 'Loudness',
			root: 'nonsense',
			fits: 'price_level',
		};
		const res = await controller.getStatementClusters({ cityId: city.id, quarter: '2026-q4' });
		expect(res.months).toEqual(['2026-10', '2026-11', '2026-12']);
		expect(res.clusters[0]).toMatchObject({
			label: 'Loud music in the',
			// The root its claims are filed at, as the agent's was none
			root: 'vibe',
			fits: { key: 'price_level', label: index.label('price_level') },
		});
	});

	it('shows a cluster unnamed when the agent fails, and asks again next time', async () => {
		(
			harness.moduleRef.get(StatementClusterService) as unknown as {
				cache: Map<string, unknown>;
			}
		).cache.clear();
		answer = new Error('boom');
		const unnamed = await controller.getStatementClusters({
			cityId: city.id,
			month: '2026-10',
		});
		expect([unnamed.clusters[0].label, unnamed.clusters[0].claims]).toEqual([undefined, 5]);

		answer = { isAspect: true, label: 'Music volume', hint: '-', root: 'vibe', fits: null };
		const named = await controller.getStatementClusters({ cityId: city.id, month: '2026-10' });
		expect(named.clusters[0].label).toBe('Music volume');
		expect(agent.generate).toHaveBeenCalledTimes(2);
	});
});
