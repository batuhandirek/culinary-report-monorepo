import type { EntityManager } from '@mikro-orm/postgresql';

import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';

import type { City } from 'src/modules/cities/entities/city.entity.js';
import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { PgBossService } from 'src/modules/pgboss/pgboss.service.js';
import { PostClaimsAgent } from 'src/modules/pipeline/read-posts/agents/post-claims.agent.js';
import { PostGateAgent } from 'src/modules/pipeline/read-posts/agents/post-gate.agent.js';
import { gateAgent } from 'src/modules/pipeline/read-posts/tests/factories/post-gate.mock.js';
import { readPostsPlainly } from 'src/modules/pipeline/read-posts/tests/factories/read-posts.factory.js';
import { Mention } from 'src/modules/social/entities/mention.entity.js';
import { SocialPlatformEnum, SocialPost } from 'src/modules/social/entities/social-post.entity.js';
import { MentionExtractionService } from 'src/modules/social/services/mention-extraction.service.js';
import { MentionMatchingService } from 'src/modules/social/services/mention-matching.service.js';
import { ClaimLabelsClassifier } from 'src/modules/statements/classifiers/claim-labels.classifier.js';
import { StatementService } from 'src/modules/statements/services/statement.service.js';
import { StatementPartsService } from 'src/modules/statements/services/statement-parts.service.js';
import { labelsClassifier } from 'src/modules/statements/tests/factories/claim-labels.mock.js';
import { addFoods } from 'src/modules/statements/tests/factories/statement.factory.js';
import {
	countTopicMentions,
	mentionTopicsSql,
	TOPIC_MENTIONS_SQL,
	type TopicMentionRow,
} from 'src/modules/trends/util/topic-mentions.js';
import type { Venue } from 'src/modules/venues/entities/venue.entity.js';
import {
	DeliveryPlatformEnum,
	VenueDeliveryListing,
} from 'src/modules/venues/entities/venue-delivery-listing.entity.js';
import { seedMenuItem } from 'src/modules/venues/tests/factories/menu-item.factory.js';
import { venueFactory } from 'src/modules/venues/tests/factories/venue.factory.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { mockAgent } from 'src/tests/mock-agent.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { AdminTermsController } from '../controllers/admin.terms.controller.js';
import { Term } from '../entities/term.entity.js';
import { Topic } from '../entities/topic.entity.js';
import { VenueTopic } from '../entities/venue-topic.entity.js';
import { TopicCityRefreshJob } from '../jobs/topic-city-refresh.job.js';
import { TopicRelinkJob } from '../jobs/topic-relink.job.js';
import { MenuTopicService } from '../services/menu-topic.service.js';
import { TermService } from '../services/term.service.js';
import { TopicService } from '../services/topic.service.js';
import { TopicRelinkService } from '../services/topic-relink.service.js';
import { VenueTopicService } from '../services/venue-topic.service.js';
import { venueTopics } from '../util/venue-topics.js';

import { seedTopics } from './factories/topic.factory.js';

/* The links to food topics: what a mention is about (the kinds of food its claims name, read through
 * their terms at read time, never stored), a menu item's stored topics and a venue's computed tags,
 * their writers, and the re-link job after a topic change. */
describe('Food topic links (pglite)', () => {
	let harness: PgliteTestingModule;
	let em: EntityManager;
	let city: City;
	let topics: Map<string, Topic>;
	const pgBoss = {
		sendJob: jest.fn(async (..._args: unknown[]) => 'job'),
		publish: jest.fn(async (..._args: unknown[]) => 'job'),
	};
	// Agent A: one post naming a vegan döner place (its claims about the vegan döner and the pide
	// there) and a place it says nothing about
	const agent = mockAgent({
		isPromotional: false,
		places: [
			{
				venueName: 'Vöner',
				locationHint: null,
				city: 'Berlin',
				visited: true,
				isNewOpening: false,
			},
			{
				venueName: 'Mystery Spot',
				locationHint: null,
				city: 'Berlin',
				visited: true,
				isNewOpening: false,
			},
		],
		// "Vegan Döner" and "Pide": wordings no topic knows as a whole yet
		claims: [
			{
				text: 'the vegan döner is the best in Kreuzberg',
				quote: null,
				foods: ['Vegan Döner'],
				amount: null,
				unit: null,
				subject: 'place',
				place: 'Vöner',
			},
			{
				text: 'the pide there is great too',
				quote: null,
				foods: ['Pide'],
				amount: null,
				unit: null,
				subject: 'place',
				place: 'Vöner',
			},
		],
	});
	// The claim-labels classifier: praise about no aspect
	const labels = labelsClassifier(() => ({ sentiment: 'positive' }));
	const venues: Record<string, Venue> = {};

	const service = <T>(type: new (...args: never[]) => T) => harness.moduleRef.get(type);
	// What a mention is about, as every reader selects it
	const aboutOf = async (mentionId: number) =>
		(
			await em
				.getConnection()
				.execute<{ keys: string[] }[]>(`select ${mentionTopicsSql('m')} as keys from mentions m where m.id = ?`, [
					mentionId,
				])
		)[0].keys;
	const mentionNamed = (venueName: string) => em.fork().findOneOrFail(Mention, { venueName });

	let n = 0;
	const post = (author = `eater${n}`) =>
		em.create(SocialPost, {
			city,
			externalId: `ftl-${n++}`,
			platform: SocialPlatformEnum.TIKTOK,
			url: `https://tiktok.com/ftl/${n}`,
			author,
			views: 100 - n,
			text: 'The best vegan döner in Kreuzberg, and the pide there is great too #berlinfood',
			postedAt: new Date('2026-09-10T12:00:00Z'),
		});
	const mention = (venue: Venue, foods: string[]) => {
		const m = em.create(Mention, { post: post(), venue, venueName: venue.name, visited: true });
		addFoods(em, m, foods);
		return m;
	};
	const menu = (venue: Venue, names: string[]) => {
		const listing = em.create(VenueDeliveryListing, {
			venue,
			platform: DeliveryPlatformEnum.WOLT,
			url: `https://wolt.com/en/deu/berlin/restaurant/${venue.placeId}`,
			fetchedAt: new Date('2026-10-02T06:00:00Z'),
		});
		return names.map(name =>
			seedMenuItem(em, listing, { month: '2026-09', name, price: 10 }),
		);
	};

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				TopicService,
				TopicRelinkService,
				MenuTopicService,
				VenueTopicService,
				StatementService,
				StatementPartsService,
				TermService,
				AdminTermsController,
				MentionExtractionService,
				MentionMatchingService,
				{ provide: PgBossService, useValue: pgBoss },
				{ provide: PostClaimsAgent, useValue: agent },
				{ provide: PostGateAgent, useValue: gateAgent() },
				{ provide: ClaimLabelsClassifier, useValue: labels },
			],
		});
		entityManagerManager.setEntityManager(harness.orm.em);
		em = harness.orm.em as EntityManager;
		// The re-linkers register as at module init
		service(MenuTopicService).onModuleInit();
		service(TermService).onModuleInit();
		topics = seedTopics(em);
		city = testCity(em);
		const venue = (key: string, params: Partial<Venue>) =>
			(venues[key] = venueFactory.build(
				{ name: key, placeId: `ftl-${key}`, ...params },
				{ associations: { city } },
			));
		venue('Vöner', { category: 'Vegan restaurant' });
		venue('Sushi Ya', { category: 'Japanese restaurant', reviewsCount: 400 });
		venue('Kaffee Eck', { category: 'Cafe' });
		venue('Pho Sang', {
			category: 'Asian restaurant',
			categories: ['Asian restaurant', 'Vietnamese restaurant', 'Noodle shop'],
			details: {
				reviewsTags: [
					{ title: 'pho', count: 30 },
					{ title: 'friendly staff', count: 25 },
					{ title: 'spring rolls', count: 4 },
				],
			},
		});
		venue('Pide Salonu', { category: 'Restaurant' });
		post();
		await em.flush();
	});

	afterAll(async () => {
		await harness.stop();
	});

	it('reads what a mention is about from its claims, and a term decision moves it at once', async () => {
		expect(await readPostsPlainly(harness.moduleRef, { limit: 10 })).toEqual({
			analysed: 1,
			mentions: 2,
			skipped: 0,
		});
		const vegan = await mentionNamed('Vöner');
		// Its wordings wait for agent C: about nothing yet
		expect(await aboutOf(vegan.id)).toEqual([]);
		// No claim about it: about nothing, wherever it is matched
		const mystery = await mentionNamed('Mystery Spot');
		await service(MentionMatchingService).correct(mystery.id, { venueId: venues['Sushi Ya'].id });
		expect(await aboutOf(mystery.id)).toEqual([]);
		// The city's venue tags follow by job
		expect(pgBoss.sendJob).toHaveBeenCalledWith(
			TopicCityRefreshJob.jobName,
			expect.anything(),
			{
				singletonKey: city.id,
			},
		);

		// "Vegan Döner" decided (as agent C would): a döner that has vegan. Nothing is re-linked: the reader follows the term
		const term = await em.fork().findOneOrFail(Term, { key: 'vegan doner' });
		await service(AdminTermsController).changeTerm(term.id, {
			topicKey: 'kebab',
			modifiers: [{ topicKey: 'vegan' }],
		});
		expect(await aboutOf(vegan.id)).toEqual(['kebab', 'vegan']);

		// Matched to its branch, the topic readers count it as Turkish through kebab's parent
		await service(MentionMatchingService).correct(vegan.id, { venueId: venues['Vöner'].id });
		const rows = await em
			.getConnection()
			.execute<TopicMentionRow[]>(TOPIC_MENTIONS_SQL, [
				city.id,
				new Date('2026-09-01'),
				new Date('2026-10-01'),
			]);
		const counts = countTopicMentions(rows, await service(TopicService).index());
		expect(
			['vegan', 'kebab', 'turkish', 'japanese'].map(
				key => counts.byTopic.get(key)?.get('2026-09') ?? 0,
			),
		).toEqual([1, 1, 1, 0]);
	});

	it("stores a venue's computed tags with one primary, as the old on-read computation gave them, and leaves the admin's rows alone", async () => {
		const pho = venues['Pho Sang'];
		// What its posts' claims name, one post each (the last names no food)
		const named = [['Pho', 'Vietnamese'], ['Pho'], ['Pho'], ['Burger'], []];
		for (const foods of named) mention(pho, foods);
		const items = menu(pho, ['Pho Bo', 'Pho Ga', 'Pho Chay', 'Bun Cha', 'Sommerrollen']);
		const index = await service(TopicService).index();
		service(MenuTopicService).linkItems(items, index);
		// The admin tagged it noodles and excluded "asian"
		em.create(VenueTopic, { venue: pho, topic: topics.get('noodles')! });
		em.create(VenueTopic, { venue: pho, topic: topics.get('asian')!, excluded: true });
		await em.flush();

		const tagger = service(VenueTopicService);
		await tagger.refresh([pho.id]);
		const stored = async () =>
			sortRows(
				(await em.fork().find(VenueTopic, { venue: pho.id }, { populate: ['topic'] })).map(
					r => ({
						key: r.topic.key,
						computed: r.computed,
						excluded: r.excluded,
						primary: r.primary,
					}),
				),
			);
		const rows = await stored();
		expect(rows.filter(r => !r.computed)).toEqual([
			{ key: 'asian', computed: false, excluded: true, primary: false },
			{ key: 'noodles', computed: false, excluded: false, primary: false },
		]);
		expect(rows.filter(r => r.computed && r.primary)).toHaveLength(1);

		// What the tags were when worked out on read: the wordings resolved against the index
		const onRead = venueTopics(
			{
				category: pho.category,
				categories: pho.categories,
				mentionTopics: named.map(foods => ({ keys: foods.flatMap(f => index.resolve(f)), n: 1 })),
				menuItems: items.map(item => ({ keys: index.resolveMenuItem(item) })),
				reviewTags: pho.details?.reviewsTags ?? [],
				manual: [
					{ key: 'noodles', excluded: false },
					{ key: 'asian', excluded: true },
				],
			},
			index,
		);
		expect(onRead.map(t => t.key)).toEqual(
			expect.arrayContaining(['noodles', 'vietnamese', 'pho']),
		);
		expect(onRead.map(t => t.key)).not.toContain('asian');
		expect((await tagger.tags([pho])).get(pho.id)).toEqual(onRead);

		// A second refresh changes nothing
		await tagger.refresh([pho.id]);
		expect(await stored()).toEqual(rows);
	});

	it('re-links menu items through the job when a wording is decided, then refreshes the tags; the claims naming it follow through its term', async () => {
		const salon = venues['Pide Salonu'];
		// The wording agent A stored with the first post: the same row
		await em.findOneOrFail(Term, { key: 'pide' });
		const pides = [mention(salon, ['Pide']), mention(salon, ['Pide'])];
		const items = menu(salon, ['Pide mit Käse', 'Pide Sucuk', 'Pide Spinat', 'Ayran']);
		await em.flush();
		const index = await service(TopicService).index();
		service(MenuTopicService).linkItems(items, index);
		await em.flush();
		await service(VenueTopicService).refresh([salon.id]);
		const itemTopics = async () =>
			(
				await em.getConnection().execute<{ name: string; key: string }[]>(
					`select mi.name, t.key from menu_item_topics it join menu_items mi on mi.id = it.menu_item_id
						join topics t on t.id = it.topic_id where mi.id in (${items.map(() => '?').join(', ')}) order by mi.name collate "C"`,
					items.map(i => i.id),
				)
			).map(r => [r.name, r.key]);
		// The claims about the pide (the wording stored once as a term): their food parts' topic, read through the term
		const pideParts = async () =>
			(
				await em.getConnection().execute<{ id: number; topics: string[] | null }[]>(
					`select p.id, (select array_agg(x.key) from topics x where x.id = t.topic_id) as topics
						from statement_parts p join terms t on t.id = p.term_id where p.role = 'food' and t.key = 'pide'`,
				)
			).map(r => [r.id, r.topics ?? []]);
		const tagKeys = async () =>
			((await service(VenueTopicService).tags([salon])).get(salon.id) ?? []).map(t => t.key);
		// "Pide" names no topic yet
		expect(await aboutOf(pides[0].id)).toEqual([]);
		expect(await itemTopics()).toEqual([]);
		const before = await pideParts();
		expect(before).toHaveLength(3);
		expect(before.every(([, keys]) => (keys as string[]).length === 0)).toBe(true);
		expect(await tagKeys()).toEqual([]);

		// The admin links the wording "pide" to kebab (the topic page's or the Terms tab's decision)
		pgBoss.sendJob.mockClear();
		const pide = await em.fork().findOneOrFail(Term, { key: 'pide' });
		await service(AdminTermsController).changeTerm(pide.id, { topicKey: 'kebab' });
		expect(pgBoss.sendJob).toHaveBeenCalledWith(TopicRelinkJob.jobName, expect.anything(), {
			singletonKey: 'all',
		});

		// The claims follow at once
		for (const m of pides) expect(await aboutOf(m.id)).toEqual(['kebab']);

		// What the job runs: the terms first, so the others resolve with the new decision
		const counts = await service(TopicRelinkService).relinkAll();
		expect(counts['mention-topics']).toBeUndefined();
		expect(counts['menu-item-topics']).toMatchObject({ changed: 3 });
		// The admin's term stands as it is; nothing to re-decide for it
		expect(counts['terms']).toMatchObject({ matched: 0, reopened: 0 });
		expect(counts['venue-tags'].venues).toBeGreaterThanOrEqual(5);

		expect(await itemTopics()).toEqual([
			['Pide Spinat', 'kebab'],
			['Pide Sucuk', 'kebab'],
			['Pide mit Käse', 'kebab'],
		]);
		// The same part rows, now about kebab: the decision reached them through the term, no statement rewritten
		expect(await pideParts()).toEqual(before.map(([id]) => [id, ['kebab']]));
		expect(await tagKeys()).toEqual(['kebab']);
	});
});

const sortRows = <T extends { key: string; computed: boolean }>(rows: T[]) =>
	[...rows].sort((a, b) => Number(a.computed) - Number(b.computed) || a.key.localeCompare(b.key));
