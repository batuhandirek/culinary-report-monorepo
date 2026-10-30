import type { EntityManager } from '@mikro-orm/postgresql';

import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';

import type { City } from 'src/modules/cities/entities/city.entity.js';
import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { FeedbackPoint } from 'src/modules/feedback/entities/feedback-point.entity.js';
import { DishNameService } from 'src/modules/feedback/services/dish-name.service.js';
import { FeedbackService } from 'src/modules/feedback/services/feedback.service.js';
import { PgBossService } from 'src/modules/pgboss/pgboss.service.js';
import { MentionExtractionAgent } from 'src/modules/social/agents/mention-extraction.agent.js';
import { Mention } from 'src/modules/social/entities/mention.entity.js';
import { SocialPlatformEnum, SocialPost } from 'src/modules/social/entities/social-post.entity.js';
import { MentionExtractionService } from 'src/modules/social/services/mention-extraction.service.js';
import { MentionMatchingService } from 'src/modules/social/services/mention-matching.service.js';
import {
	countTopicMentions,
	TOPIC_MENTIONS_SQL,
	type TopicMentionRow,
} from 'src/modules/trends/util/topic-mentions.js';
import { MenuItem } from 'src/modules/venues/entities/menu-item.entity.js';
import type { Venue } from 'src/modules/venues/entities/venue.entity.js';
import {
	DeliveryPlatformEnum,
	VenueDeliveryListing,
} from 'src/modules/venues/entities/venue-delivery-listing.entity.js';
import { venueFactory } from 'src/modules/venues/tests/factories/venue.factory.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { mockAgent } from 'src/tests/mock-agent.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { Topic } from '../entities/topic.entity.js';
import { VenueTopic } from '../entities/venue-topic.entity.js';
import { TopicCityRefreshJob } from '../jobs/topic-city-refresh.job.js';
import { TopicRelinkJob } from '../jobs/topic-relink.job.js';
import { TopicService } from '../services/topic.service.js';
import { TopicRelinkService } from '../services/topic-relink.service.js';
import { MentionTopicService } from '../services/mention-topic.service.js';
import { MenuTopicService } from '../services/menu-topic.service.js';
import { VenueTopicService } from '../services/venue-topic.service.js';
import { venueTopics } from '../util/venue-topics.js';

import { seedTopics } from './factories/topic.factory.js';

/* The stored links to food topics: a mention's (its cuisine's, else its venue's category's), a menu
 * item's and a venue's computed tags, their writers, and the re-link job after a topic change. */
describe('Food topic links (pglite)', () => {
	let harness: PgliteTestingModule;
	let em: EntityManager;
	let city: City;
	let topics: Map<string, Topic>;
	const pgBoss = {
		sendJob: jest.fn(async (..._args: unknown[]) => 'job'),
		publish: jest.fn(async (..._args: unknown[]) => 'job'),
	};
	// One post naming a vegan döner place (and a pide there) and a place without a cuisine
	const agent = mockAgent({
		isPromotional: false,
		mentions: [
			{
				venueName: 'Vöner',
				locationHint: null,
				cuisine: 'Vegan Döner',
				city: 'Berlin',
				visited: true,
				isNewOpening: false,
				sentiment: 'positive',
				summary: 'Great vegan döner.',
				dishes: [{ name: 'Pide', sentiment: 'positive' }],
				praise: [],
				complaints: [],
			},
			{
				venueName: 'Mystery Spot',
				locationHint: null,
				cuisine: null,
				city: 'Berlin',
				visited: true,
				isNewOpening: false,
				sentiment: 'neutral',
				summary: 'Went there.',
				dishes: [],
				praise: [],
				complaints: [],
			},
		],
	});
	const venues: Record<string, Venue> = {};

	const service = <T>(type: new (...args: never[]) => T) => harness.moduleRef.get(type);
	const linksOf = async (mentionId: number) =>
		(
			await em.getConnection().execute<{ key: string; source: string; rank: number }[]>(
				`select t.key, mt.source, mt.rank from mention_topics mt join topics t on t.id = mt.topic_id
					where mt.mention_id = ? order by mt.rank`,
				[mentionId],
			)
		).map(r => [r.key, r.source, r.rank]);
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
	const mention = (venue: Venue, cuisine: string | null) =>
		em.create(Mention, {
			post: post(),
			venue,
			venueName: venue.name,
			cuisine,
			visited: true,
			sentiment: 'positive',
			summary: 'Good.',
		});
	const menu = (venue: Venue, names: string[]) => {
		const listing = em.create(VenueDeliveryListing, {
			venue,
			platform: DeliveryPlatformEnum.WOLT,
			url: `https://wolt.com/en/deu/berlin/restaurant/${venue.placeId}`,
			fetchedAt: new Date('2026-10-02T06:00:00Z'),
		});
		return names.map(name =>
			em.create(MenuItem, { listing, month: '2026-09', name, price: 10, category: null }),
		);
	};

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				TopicService,
				TopicRelinkService,
				MentionTopicService,
				MenuTopicService,
				VenueTopicService,
				FeedbackService,
				DishNameService,
				MentionExtractionService,
				MentionMatchingService,
				{ provide: PgBossService, useValue: pgBoss },
				{ provide: MentionExtractionAgent, useValue: agent },
			],
		});
		entityManagerManager.setEntityManager(harness.orm.em);
		em = harness.orm.em as EntityManager;
		// The re-linkers register as at module init
		service(MentionTopicService).onModuleInit();
		service(MenuTopicService).onModuleInit();
		service(DishNameService).onModuleInit();
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

	it("links an extracted mention to every topic its cuisine names; readers count the topics' parents", async () => {
		expect(await service(MentionExtractionService).extract({ limit: 10 })).toEqual({
			analysed: 1,
			mentions: 2,
		});
		const vegan = await mentionNamed('Vöner');
		expect(await linksOf(vegan.id)).toEqual([
			['vegan', 'cuisine', 0],
			['kebab', 'cuisine', 1],
		]);
		// No cuisine and no venue yet: nothing to link
		expect(await linksOf((await mentionNamed('Mystery Spot')).id)).toEqual([]);
		// The city's venue tags follow by job
		expect(pgBoss.sendJob).toHaveBeenCalledWith(
			TopicCityRefreshJob.jobName,
			expect.anything(),
			{
				singletonKey: city.id,
			},
		);

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

	it("follows a mention without a cuisine to the venue it is re-matched to, and to a brand's busiest branch", async () => {
		const matching = service(MentionMatchingService);
		const id = (await mentionNamed('Mystery Spot')).id;
		await matching.correct(id, { venueId: venues['Sushi Ya'].id });
		expect(await linksOf(id)).toEqual([['japanese', 'category', 0]]);

		await matching.correct(id, { venueId: venues['Kaffee Eck'].id });
		expect(await linksOf(id)).toEqual([['cafe', 'category', 0]]);

		// The brand without a branch: its most reviewed branch in the post's city
		await matching.correct(id, { venueId: null, brandId: venues['Sushi Ya'].brand.id });
		expect(await linksOf(id)).toEqual([['japanese', 'category', 0]]);

		await matching.correct(id, { venueId: null });
		expect(await linksOf(id)).toEqual([]);
	});

	it("stores a venue's computed tags with one primary, as the old on-read computation gave them, and leaves the admin's rows alone", async () => {
		const pho = venues['Pho Sang'];
		const cuisines = ['Pho, Vietnamese', 'Pho', 'Pho', 'Burger', null];
		for (const cuisine of cuisines) mention(pho, cuisine);
		const items = menu(pho, ['Pho Bo', 'Pho Ga', 'Pho Chay', 'Bun Cha', 'Sommerrollen']);
		const index = await service(TopicService).index();
		service(MenuTopicService).linkItems(items, index);
		// The admin tagged it noodles and excluded "asian"
		em.create(VenueTopic, { venue: pho, topic: topics.get('noodles')! });
		em.create(VenueTopic, { venue: pho, topic: topics.get('asian')!, excluded: true });
		await em.flush();
		await service(MentionTopicService).relink({ cityId: city.id });

		const tagger = service(VenueTopicService);
		await tagger.refresh([pho.id]);
		const stored = async () =>
			sortRows(
				(
					await em.fork().find(VenueTopic, { venue: pho.id }, { populate: ['topic'] })
				).map(r => ({
					key: r.topic.key,
					computed: r.computed,
					excluded: r.excluded,
					primary: r.primary,
				})),
			);
		const rows = await stored();
		expect(rows.filter(r => !r.computed)).toEqual([
			{ key: 'asian', computed: false, excluded: true, primary: false },
			{ key: 'noodles', computed: false, excluded: false, primary: false },
		]);
		expect(rows.filter(r => r.computed && r.primary)).toHaveLength(1);

		// What the tags were when worked out on read: the texts resolved against the index
		const onRead = venueTopics(
			{
				category: pho.category,
				categories: pho.categories,
				mentionTopics: cuisines.map(cuisine => ({ keys: index.resolve(cuisine), n: 1 })),
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

	it('re-links mentions, menu items and feedback through the job when a topic gains an alias, then refreshes the tags', async () => {
		const salon = venues['Pide Salonu'];
		const pides = [mention(salon, 'Pide'), mention(salon, 'Pide')];
		const items = menu(salon, ['Pide mit Käse', 'Pide Sucuk', 'Pide Spinat', 'Ayran']);
		await em.flush();
		const index = await service(TopicService).index();
		service(MenuTopicService).linkItems(items, index);
		await em.flush();
		await service(MentionTopicService).relink({ mentionIds: pides.map(m => m.id) });
		await service(VenueTopicService).refresh([salon.id]);
		const itemTopics = async () =>
			(
				await em.getConnection().execute<{ name: string; key: string }[]>(
					`select mi.name, t.key from menu_item_topics it join menu_items mi on mi.id = it.menu_item_id
						join topics t on t.id = it.topic_id where mi.id in (${items.map(() => '?').join(', ')}) order by mi.name collate "C"`,
					items.map(i => i.id),
				)
			).map(r => [r.name, r.key]);
		const pideDish = async () =>
			(
				await em
					.fork()
					.findOneOrFail(FeedbackPoint, { dish: 'Pide' }, { populate: ['foodTopic'] })
			).foodTopic?.key ?? null;
		const tagKeys = async () =>
			((await service(VenueTopicService).tags([salon])).get(salon.id) ?? []).map(
				t => t.key,
			);
		// "Pide" names no topic yet
		expect(await linksOf(pides[0].id)).toEqual([]);
		expect(await itemTopics()).toEqual([]);
		expect(await pideDish()).toBeNull();
		expect(await tagKeys()).toEqual([]);

		pgBoss.sendJob.mockClear();
		const kebab = topics.get('kebab')!;
		await service(TopicService).update(kebab.id, { aliases: [...kebab.aliases, 'pide'] });
		expect(pgBoss.sendJob).toHaveBeenCalledWith(TopicRelinkJob.jobName, expect.anything(), {
			singletonKey: 'all',
		});

		// What the job runs
		const counts = await service(TopicRelinkService).relinkAll();
		expect(counts['mention-topics']).toMatchObject({ changed: 2 });
		expect(counts['menu-item-topics']).toMatchObject({ changed: 3 });
		expect(counts['dish-names']).toMatchObject({ rows: 1 });
		expect(counts['venue-tags'].venues).toBeGreaterThanOrEqual(5);

		for (const m of pides) expect(await linksOf(m.id)).toEqual([['kebab', 'cuisine', 0]]);
		expect(await itemTopics()).toEqual([
			['Pide Spinat', 'kebab'],
			['Pide Sucuk', 'kebab'],
			['Pide mit Käse', 'kebab'],
		]);
		expect(await pideDish()).toBe('kebab');
		expect(await tagKeys()).toEqual(['kebab']);
	});
});

const sortRows = <T extends { key: string; computed: boolean }>(rows: T[]) =>
	[...rows].sort((a, b) => Number(a.computed) - Number(b.computed) || a.key.localeCompare(b.key));
