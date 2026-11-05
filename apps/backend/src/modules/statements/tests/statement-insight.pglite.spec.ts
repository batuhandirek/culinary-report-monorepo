import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';

import type { City } from 'src/modules/cities/entities/city.entity.js';
import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { Mention } from 'src/modules/social/entities/mention.entity.js';
import type { SocialAccount } from 'src/modules/social/entities/social-account.entity.js';
import { SocialPlatformEnum, SocialPost } from 'src/modules/social/entities/social-post.entity.js';
import { ownAccount } from 'src/modules/social/tests/factories/social-account.factory.js';
import { ASPECT_SEED } from 'src/modules/topics/constants/aspect-seed.constant.js';
import { Term } from 'src/modules/topics/entities/term.entity.js';
import { TermTopic } from 'src/modules/topics/entities/term-topic.entity.js';
import { TopicService } from 'src/modules/topics/services/topic.service.js';
import { VenueTopicService } from 'src/modules/topics/services/venue-topic.service.js';
import { linkTopics, seedTopics } from 'src/modules/topics/tests/factories/topic.factory.js';
import { ThemeInsightService } from 'src/modules/trends/services/theme-insight.service.js';
import { Review } from 'src/modules/venues/entities/review.entity.js';
import type { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { venueFactory } from 'src/modules/venues/tests/factories/venue.factory.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';


import { AdminExploreController } from '../controllers/admin.explore.controller.js';
import type { AdminExploreInputDto } from '../dto/admin-explore.dto.js';
import { Statement } from '../entities/statement.entity.js';
import { StatementPart } from '../entities/statement-part.entity.js';
import { StatementInsightService } from '../services/statement-insight.service.js';

import { addStatements, type TestClaim } from './factories/statement.factory.js';

const wait = (aspect: string, text: string, extra: Partial<TestClaim> = {}): TestClaim => ({
	text,
	sentiment: 'negative',
	aspect,
	...extra,
});

/** A 1024-long vector starting with the given values, zeros after */
const vec = (...lead: number[]) => `[${[...lead, ...Array(1024 - lead.length).fill(0)].join(',')}]`;

/*
 * "Who talked about X" (the Explore page): a node counts its descendants and every source kind
 * (reviews, posts, a blog's claim about the city, Google's tags apart), a source once per node;
 * own posts, unmatched places, other cities and reviews without text are out; sides include
 * noted and unread; stated numbers; scope by brand, branch, district and months; further nodes and
 * wordings; breakdowns; the claims and their groups by meaning; and the same counts as the
 * Praise and complaints tab for the same selection.
 */
describe('StatementInsightService (pglite)', () => {
	let harness: PgliteTestingModule;
	let controller: AdminExploreController;
	let city: City;
	let doner: Venue;
	let cafe: Venue;
	const ids: Record<string, number> = {};
	const view = (extra: Partial<AdminExploreInputDto> = {}): AdminExploreInputDto => ({
		cityId: city.id,
		from: '2026-09',
		to: '2026-09',
		...extra,
	});

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				StatementInsightService,
				AdminExploreController,
				TopicService,
				ThemeInsightService,
				VenueTopicService,
			],
		});
		entityManagerManager.setEntityManager(harness.orm.em);
		controller = harness.moduleRef.get(AdminExploreController);
		const em = harness.orm.em;
		const topics = seedTopics(em, ['kebab', 'cafe', ...ASPECT_SEED.map(a => a.key)]);
		city = testCity(em);
		const elsewhere = testCity(em, { name: 'Hamburg' });
		doner = venueFactory.build(
			{ name: 'Döner Eck', category: 'Kebab shop', district: 'Kreuzberg' },
			{ associations: { city } },
		);
		cafe = venueFactory.build(
			{ name: 'Café Blau', category: 'Cafe', district: 'Mitte' },
			{ associations: { city } },
		);
		const far = venueFactory.build({ name: 'Far Away' }, { associations: { city: elsewhere } });
		await em.flush();
		const index = await harness.moduleRef.get(TopicService).index();

		let n = 0;
		const review = (
			venue: Venue,
			date: string,
			claims: TestClaim[],
			text: string | null = 'Written',
		) =>
			addStatements(
				em,
				em.create(Review, {
					venue,
					reviewId: `ex-${n++}`,
					publishedAt: new Date(`${date}T12:00:00Z`),
					stars: 3,
					text,
					analysedAt: new Date('2026-10-02T00:00:00Z'),
				}),
				claims,
				{ index },
			);
		const [r1] = review(doner, '2026-09-05', [
			wait('wait_for_food', 'waited 50 minutes', {
				amount: 50,
				unit: 'minutes',
				foods: ['Döner'],
			}),
		]);
		review(doner, '2026-09-06', [
			wait('queue', 'long line', { amount: 20, unit: 'minutes' }),
			{ text: 'great döner', sentiment: 'positive', aspect: 'taste', foods: ['Döner'] },
		]);
		const [r3] = review(cafe, '2026-09-07', [
			{ text: 'waits are normal', sentiment: 'neutral', aspect: 'wait' },
			wait('price_level', 'pricey'),
		]);
		const [unread] = review(cafe, '2026-09-08', [wait('wait_for_table', 'no table ready')]);
		unread.sentiment = null;
		unread.partsAt = null;
		review(cafe, '2026-09-15', [
			{ text: 'waits got shorter since spring', change: true, aspect: 'wait' },
		]);
		review(cafe, '2026-09-20', [{ text: 'nice cake', sentiment: 'positive', aspect: 'taste' }]);
		// Out: no text; another city
		review(doner, '2026-09-09', [wait('wait', 'no text')], null);
		review(far, '2026-09-10', [wait('wait', 'elsewhere')]);
		// August
		review(doner, '2026-08-10', [wait('wait_for_food', 'slow')]);
		review(doner, '2026-08-11', [{ text: 'tasty', sentiment: 'positive', aspect: 'taste' }]);

		const post = (
			date: string,
			opts: { account?: SocialAccount; platform?: SocialPlatformEnum } = {},
		) =>
			em.create(SocialPost, {
				city,
				externalId: `ex-post-${n++}`,
				platform: opts.platform ?? SocialPlatformEnum.TIKTOK,
				url: `https://tiktok.com/ex/${n}`,
				author: opts.account?.handle ?? `eater${n}`,
				...(opts.account && { account: opts.account }),
				postedAt: new Date(`${date}T12:00:00Z`),
			});
		const mention = (p: SocialPost, venue: Venue | undefined, claims: TestClaim[]) =>
			addStatements(
				em,
				em.create(Mention, {
					post: p,
					...(venue && { venue }),
					venueName: venue?.name ?? 'Somewhere',
					visited: true,
				}),
				claims,
				{ index },
			);
		const [p1] = mention(post('2026-09-12'), cafe, [
			wait('wait_for_food', 'took ages'),
			wait('price_level', 'coffee now €4', { amount: 4, unit: 'money' }),
		]);
		const own = ownAccount(em, cafe.brand, city, 'cafe_blau');
		// Out: the café's own post, its claim about the city too, and a place nothing matched
		mention(post('2026-09-13', { account: own }), cafe, [wait('wait', 'own')]);
		mention(post('2026-09-17', { account: own }), undefined, [
			wait('wait', 'own city claim', { subject: 'city' }),
		]);
		mention(post('2026-09-14'), undefined, [wait('wait', 'unmatched')]);
		// A blog's claim about the city: in, about no place
		const [p4] = mention(post('2026-09-16', { platform: SocialPlatformEnum.BLOG }), undefined, [
			wait('wait', 'Berlin restaurants make you wait', { subject: 'city' }),
		]);

		// Google's "waiting time" tag on the döner place: a wording linked to Waiting, all-time
		const term = em.create(Term, {
			key: 'waiting time',
			name: 'waiting time',
			decidedBy: 'match',
			decidedAt: new Date(),
		});
		term.topics.add(em.create(TermTopic, { term, topic: topics.get('wait')!, rank: 0 }));
		const tag = em.create(Statement, {
			sourceKind: 'google_tag',
			venue: doner,
			subject: 'place',
			city,
			month: null,
			saidAt: new Date('2026-10-01T00:00:00Z'),
			text: 'waiting time',
			count: 4098,
		});
		tag.parts.add(em.create(StatementPart, { statement: tag, role: 'food', term, rank: 0 }));
		await em.flush();
		// The places' stored food tags: a brand's kind of place is its places' main food
		await linkTopics(em);
		Object.assign(ids, { r1: r1.id, r3: r3.id, p1: p1.id, p4: p4.id, tag: tag.id });

		// Vectors for some of September's waiting claims: three close ones from three sources
		const conn = em.getConnection();
		const embed = (id: number, v: string) =>
			conn.execute(
				`update statements set embedding = ?::halfvec(1024), embedded_at = now() where id = ?`,
				[v, id],
			);
		await embed(r1.id, vec(1, 0.1));
		await embed(p1.id, vec(0.95, 0.2));
		await embed(p4.id, vec(1, 0.05));
		await embed(r3.id, vec(0, 1));
	});

	afterAll(async () => {
		await harness.stop();
	});

	it('counts who talked about Waiting: children, reviews, posts and a blog about the city, Google tags apart', async () => {
		const head = await controller.getExploreHead(view({ node: 'wait' }));
		expect(head.node).toMatchObject({
			ref: 'wait',
			label: 'Waiting',
			kind: 'aspect',
			path: [],
		});
		expect(head.node!.children.map(c => c.ref)).toEqual([
			'queue',
			'wait_for_table',
			'wait_for_food',
		]);
		expect(head).toMatchObject({
			sources: 7,
			reviews: 5,
			posts: 2,
			brands: 2,
			tagVenues: 1,
			tagMentions: 4098,
			// Of September's sources with a claim: six reviews, two posts
			base: { sources: 8, reviews: 6, posts: 2 },
			share: 87.5,
			reviewShare: 83.3,
			postShare: 100,
		});
		expect(head.sides).toEqual([
			{ side: 'praise', sources: 0 },
			{ side: 'complaints', sources: 4 },
			{ side: 'noted', sources: 1 },
			{ side: 'changes', sources: 1 },
			{ side: 'unread', sources: 1 },
		]);
		expect(head.amounts).toEqual([
			{ unit: 'minutes', sources: 2, median: 35, min: 20, max: 50 },
		]);
	});

	it('puts a side on the theme pages base and compares the last month with the one before', async () => {
		const head = await controller.getExploreHead(
			view({ node: 'wait', side: 'complaints', from: '2026-08' }),
		);
		expect(head.months).toEqual([
			{
				month: '2026-08',
				sources: 1,
				reviews: 1,
				posts: 0,
				share: 50,
				reviewShare: 50,
				postShare: null,
			},
			{
				month: '2026-09',
				sources: 4,
				reviews: 2,
				posts: 2,
				share: 66.7,
				reviewShare: 50,
				postShare: 100,
			},
		]);
		expect(head.change).toEqual({ share: 16.7, reviewShare: 0, postShare: null });
		// The window's sides stay whole whatever the side picks
		expect(head.sides.find(s => s.side === 'noted')!.sources).toBe(1);
	});

	it('narrows by brand, branch, district, months, a further node and a wording', async () => {
		const sources = async (extra: Partial<AdminExploreInputDto>) =>
			(await controller.getExploreHead(view({ node: 'wait', ...extra }))).sources;
		expect(await sources({ brandId: cafe.brand.id })).toBe(4);
		expect(await sources({ venueId: doner.id })).toBe(2);
		expect(await sources({ district: 'Kreuzberg' })).toBe(2);
		expect(await sources({ from: '2026-08', to: '2026-08' })).toBe(1);
		expect(await sources({ subject: 'city' })).toBe(1);
		expect(await sources({ source: 'review' })).toBe(5);
		expect(await sources({ source: 'blog' })).toBe(1);
		expect(await sources({ side: 'unread' })).toBe(1);
		expect(await sources({ kind: 'change' })).toBe(1);
		// Waiting about döner; then the wording "Döner" alone (two reviews, one on a taste claim)
		expect(await sources({ with: 'kebab' })).toBe(1);
		const term = await controller.getExploreHead(view({ node: 'term:doner' }));
		expect(term.node).toMatchObject({
			ref: 'term:doner',
			label: 'Döner',
			kind: 'term',
			topics: [{ ref: 'kebab', label: 'Döner & kebab' }],
		});
		expect(term.sources).toBe(2);
	});

	it('answers 404 for an unknown node and 400 for a window backwards', async () => {
		await expect(controller.getExploreHead(view({ node: 'nope' }))).rejects.toMatchObject({
			status: 404,
		});
		await expect(
			controller.getExploreHead(view({ from: '2026-10', to: '2026-09' })),
		).rejects.toMatchObject({ status: 400 });
	});

	it('counts the tree with descendants folded in, a source once per topic', async () => {
		const { nodes } = await controller.getExploreTree(view());
		const of = (key: string) => nodes.find(n => n.key === key);
		expect(of('wait')).toMatchObject({
			sources: 7,
			complaints: 4,
			tagVenues: 1,
			tagMentions: 4098,
		});
		expect(of('wait_for_food')).toMatchObject({ sources: 2, parentKey: 'wait' });
		expect(of('kebab')).toMatchObject({ sources: 2, label: 'Döner & kebab' });
		// Kebab's parent counts the same two reviews, each once
		expect(of('turkish')).toMatchObject({ sources: 2 });
		expect(of('taste')).toMatchObject({ sources: 2, praise: 2 });
		expect(of('food')).toMatchObject({ sources: 2 });
		expect(of('cafe')).toBeUndefined();
	});

	it('breaks down by brand, the city apart, and Google tags by brand', async () => {
		const brands = await controller.getExploreBreakdown({
			...view({ node: 'wait' }),
			by: 'brand',
		});
		expect(brands.rows.map(r => [r.label, r.sources, r.tagVenues])).toEqual([
			['Café Blau', 4, 0],
			['Döner Eck', 2, 1],
			['No brand: the city or nothing', 1, 0],
		]);
		expect(brands.rows[0].key).toBe(cafe.brand.id);
		expect(brands.rows[2].key).toBeUndefined();
		// "Which brands' Google review tags mention Waiting"
		const tags = await controller.getExploreBreakdown({
			...view({ node: 'wait', source: 'google_tag' }),
			by: 'brand',
		});
		expect(tags.rows).toEqual([
			{
				key: doner.brand.id,
				label: 'Döner Eck',
				sources: 0,
				praise: 0,
				complaints: 0,
				tagVenues: 1,
				tagMentions: 4098,
			},
		]);
	});

	it('breaks an aspect down into its children, and the rest by source, district, food, wording and month', async () => {
		const rows = async (
			by: Parameters<AdminExploreController['getExploreBreakdown']>[0]['by'],
			extra: Partial<AdminExploreInputDto> = {},
		) =>
			(
				await controller.getExploreBreakdown({ ...view({ node: 'wait', ...extra }), by })
			).rows.map(r => [r.key, r.sources]);
		const aspects = await controller.getExploreBreakdown({
			...view({ node: 'wait' }),
			by: 'aspect',
		});
		expect(aspects.under).toEqual({ ref: 'wait', label: 'Waiting' });
		expect(aspects.rows.map(r => [r.key, r.label, r.sources, r.tagVenues])).toEqual([
			['wait', 'Waiting, nothing finer', 3, 1],
			['wait_for_food', 'Wait for food', 2, 0],
			['queue', 'Queue', 1, 0],
			['wait_for_table', 'Wait for a table', 1, 0],
		]);
		expect(await rows('source')).toEqual([
			['google_review', 5],
			['blog', 1],
			['tiktok', 1],
			['google_tag', 0],
		]);
		expect(await rows('place')).toEqual([
			['cafe', 4],
			['kebab', 2],
			[undefined, 1],
		]);
		expect(
			(await controller.getExploreHead(view({ node: 'wait', place: 'kebab' }))).sources,
		).toBe(2);
		expect(await rows('district')).toEqual([
			['Mitte', 4],
			['Kreuzberg', 2],
			[undefined, 1],
		]);
		expect(await rows('food')).toEqual([
			['kebab', 1],
			['turkish', 1],
		]);
		// Google's tag is a wording too, on a place, with no dated source
		expect(await rows('term')).toEqual([
			['term:doner', 1],
			['term:waiting time', 0],
		]);
		expect(await rows('month', { from: '2026-08' })).toEqual([
			['2026-08', 1],
			['2026-09', 7],
		]);
		expect(await rows('side')).toEqual([
			['complaints', 4],
			['changes', 1],
			['noted', 1],
			['unread', 1],
		]);
		// A kind of food's breakdown of aspects starts at the roots
		const ofKebab = await controller.getExploreBreakdown({
			...view({ node: 'kebab' }),
			by: 'aspect',
		});
		expect(ofKebab.under).toBeUndefined();
		expect(ofKebab.rows.map(r => [r.key, r.sources])).toEqual([
			['food', 1],
			['wait', 1],
		]);
	});

	it('lists the claims newest first with their sources, Google tags with their place', async () => {
		const page = await controller.listExploreClaims({
			...view({ node: 'wait' }),
			page: 1,
			size: 3,
		});
		expect(page.totalItems).toBe(8);
		expect(page.items.map(i => i.text)).toEqual([
			'waiting time',
			'Berlin restaurants make you wait',
			'waits got shorter since spring',
		]);
		expect(page.items[0]).toMatchObject({
			sourceKind: 'google_tag',
			venue: { id: doner.id, name: 'Döner Eck' },
		});
		const searched = await controller.listExploreClaims({
			...view({ node: 'wait' }),
			page: 1,
			size: 10,
			q: 'ages',
		});
		expect(searched.items.map(i => [i.id, i.mention?.brand?.name])).toEqual([
			[ids.p1, 'Café Blau'],
		]);
	});

	it('groups the claims by meaning once they have vectors', async () => {
		const res = await controller.getExploreGroups(view({ node: 'wait' }));
		expect(res).toMatchObject({ embedded: 4, notEmbedded: 3, considered: 4, more: 0 });
		expect(res.groups).toHaveLength(1);
		expect(res.groups[0]).toMatchObject({ claims: 3, sources: 3, complaints: 3, praise: 0 });
		expect([ids.r1, ids.p1, ids.p4]).toContain(res.groups[0].samples[0].id);
	});

	it('finds wordings by a part of their name', async () => {
		const res = await controller.searchExploreTerms({ q: 'dön' });
		expect(res.terms).toEqual([
			{ ref: 'term:doner', label: 'Döner', uses: 2, topics: ['Döner & kebab'] },
		]);
	});

	it('counts what the Praise and complaints tab counts for the same aspect, side and month', async () => {
		const themes = await harness.moduleRef.get(ThemeInsightService).city(city.id, '2026-09');
		const index = await harness.moduleRef.get(TopicService).index();
		const rows = [
			...themes.complaints.map(r => ({ ...r, side: 'complaints' as const })),
			...themes.praise.map(r => ({ ...r, side: 'praise' as const })),
		].filter(r => !index.isRoot(r.key));
		expect(rows.length).toBeGreaterThan(2);
		for (const row of rows) {
			const head = await controller.getExploreHead(
				view({ node: row.key, side: row.side, subject: 'place' }),
			);
			expect([row.key, row.side, head.reviews, head.posts]).toEqual([
				row.key,
				row.side,
				row.reviews,
				row.posts,
			]);
			expect([row.key, head.reviewShare, head.postShare]).toEqual([
				row.key,
				row.reviewShare,
				row.postShare,
			]);
		}
	});
});
