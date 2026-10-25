import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { BacklogRun } from 'src/modules/backlog/entities/backlog-run.entity.js';
import { LlmBacklogService } from 'src/modules/backlog/services/llm-backlog.service.js';
import { LlmBacklogRegistry } from 'src/modules/backlog/services/llm-backlog-registry.service.js';
import { City } from 'src/modules/cities/entities/city.entity.js';
import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { FoodTopic } from 'src/modules/food-topics/entities/food-topic.entity.js';
import { FoodTopicRelinkJob } from 'src/modules/food-topics/jobs/food-topic-relink.job.js';
import { FoodTopicService } from 'src/modules/food-topics/services/food-topic.service.js';
import { FoodTopicRelinkService } from 'src/modules/food-topics/services/food-topic-relink.service.js';
import { seedFoodTopics } from 'src/modules/food-topics/tests/factories/food-topic.factory.js';
import { PgBossService } from 'src/modules/pgboss/pgboss.service.js';
import { MentionExtractionAgent } from 'src/modules/social/agents/mention-extraction.agent.js';
import { Mention } from 'src/modules/social/entities/mention.entity.js';
import { SocialPlatformEnum, SocialPost } from 'src/modules/social/entities/social-post.entity.js';
import { MentionExtractionService } from 'src/modules/social/services/mention-extraction.service.js';
import { ownAccount } from 'src/modules/social/tests/factories/social-account.factory.js';
import { ReviewAnalysisAgent } from 'src/modules/venues/agents/review-analysis.agent.js';
import { Review } from 'src/modules/venues/entities/review.entity.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { ReviewService } from 'src/modules/venues/services/review.service.js';
import { venueFactory } from 'src/modules/venues/tests/factories/venue.factory.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { mockAgent } from 'src/tests/mock-agent.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { DishTopicAgent } from '../agents/dish-topic.agent.js';
import { FeedbackAmountAgent } from '../agents/feedback-amount.agent.js';
import { FeedbackDishAgent } from '../agents/feedback-dish.agent.js';
import { FeedbackThemeAgent } from '../agents/feedback-theme.agent.js';
import { AdminFeedbackController } from '../controllers/admin.feedback.controller.js';
import { FeedbackPoint } from '../entities/feedback-point.entity.js';
import { DishNameService } from '../services/dish-name.service.js';
import { FeedbackService } from '../services/feedback.service.js';
import { FeedbackAmountService } from '../services/feedback-amount.service.js';
import { FeedbackDishService } from '../services/feedback-dish.service.js';
import { FeedbackThemeService } from '../services/feedback-theme.service.js';
import { complaintsOf } from '../util/feedback-rows.js';

import { addFeedback } from './factories/feedback.factory.js';

/** The review agent's answer for each review it is sent: one per review id */
let reviewAnswer: (reviewId: string) => object = () => ({});

/*
 * What posts and reviews say is rows: written with their source, replaced on re-analysis, gone with
 * it; dishes linked to food topics and re-linked when topics change; the jsonb moved over once; the
 * LLM passes over stored rows drained as daily backlogs, each point asked once.
 */
describe('feedback rows (pglite)', () => {
	let harness: PgliteTestingModule;
	let feedback: FeedbackService;
	let city: City;
	let venue: Venue;
	let topics: Map<string, FoodTopic>;
	const pgBoss = { sendJob: jest.fn(async (..._args: unknown[]) => undefined) };

	const reviewAgent = mockAgent((prompt: unknown) => {
		const { reviews } = JSON.parse(prompt as string) as { reviews: { reviewId: string }[] };
		return {
			reviews: reviews.map(r => ({
				reviewId: r.reviewId,
				sentiment: 'negative',
				praise: [],
				complaints: [],
				dishes: [],
				changes: [],
				...reviewAnswer(r.reviewId),
			})),
		};
	});
	const extractionAgent = mockAgent({
		isPromotional: false,
		mentions: [
			{
				venueName: 'Burger Bros',
				locationHint: null,
				cuisine: 'Burgers',
				city: 'Berlin',
				visited: true,
				isNewOpening: false,
				sentiment: 'mixed',
				summary: 'Pricier than before.',
				dishes: [{ name: 'Burger', sentiment: 'negative' }],
				praise: [{ theme: 'taste', detail: 'juicy patty', dish: null, amount: null }],
				complaints: [
					{
						theme: 'price_increase',
						detail: 'the burger got pricier',
						dish: 'burger',
						amount: null,
					},
				],
			},
		],
	});
	const themeAgent = mockAgent((prompt: unknown) => {
		const { points } = JSON.parse(prompt as string) as {
			points: { id: string; detail: string }[];
		};
		return {
			points: points.map(p => ({
				id: p.id,
				theme: p.detail.includes('cash') ? 'cash_only' : 'price_level',
			})),
		};
	});
	const dishAgent = mockAgent((prompt: unknown) => {
		const { points } = JSON.parse(prompt as string) as {
			points: { id: string; detail: string; dishes: string[] }[];
		};
		// The first listed dish the phrase's first word starts, else none
		return {
			points: points.map(p => ({
				id: p.id,
				dish:
					p.dishes.find(d =>
						p.detail.toLowerCase().includes(d.toLowerCase().slice(0, 4)),
					) ?? null,
			})),
		};
	});
	const amountAgent = mockAgent((prompt: unknown) => {
		const { points } = JSON.parse(prompt as string) as {
			points: { id: string; text: string }[];
		};
		return {
			points: points.map(p => ({
				id: p.id,
				amount:
					/(\d+) minutes/.exec(p.text)?.[1] ?
						Number(/(\d+) minutes/.exec(p.text)![1])
					:	null,
			})),
		};
	});
	// Dish names: none fits any
	const dishTopicAgent = mockAgent((prompt: unknown) => {
		const { names } = JSON.parse(prompt as string) as { names: { id: string }[] };
		return { names: names.map(n => ({ id: n.id, topic: null, newTopic: null })) };
	});

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				FeedbackService,
				DishNameService,
				FeedbackThemeService,
				FeedbackDishService,
				AdminFeedbackController,
				FeedbackAmountService,
				ReviewService,
				MentionExtractionService,
				FoodTopicService,
				FoodTopicRelinkService,
				LlmBacklogRegistry,
				LlmBacklogService,
				{ provide: PgBossService, useValue: pgBoss },
				{ provide: ReviewAnalysisAgent, useValue: reviewAgent },
				{ provide: MentionExtractionAgent, useValue: extractionAgent },
				{ provide: FeedbackThemeAgent, useValue: themeAgent },
				{ provide: FeedbackDishAgent, useValue: dishAgent },
				{ provide: FeedbackAmountAgent, useValue: amountAgent },
				{ provide: DishTopicAgent, useValue: dishTopicAgent },
			],
		});
		entityManagerManager.setEntityManager(harness.orm.em);
		feedback = harness.moduleRef.get(FeedbackService);
		// Registered as at module init
		harness.moduleRef.get(DishNameService).onModuleInit();
		harness.moduleRef.get(FeedbackThemeService).onModuleInit();
		harness.moduleRef.get(FeedbackDishService).onModuleInit();
		harness.moduleRef.get(FeedbackAmountService).onModuleInit();
		const em = harness.orm.em;
		topics = seedFoodTopics(em, ['burgers', 'kebab']);
		city = testCity(em);
		venue = venueFactory.build(
			{ name: 'Burger Bros', category: 'Hamburger restaurant' },
			{ associations: { city } },
		);
		await em.flush();
	});

	afterAll(async () => {
		await harness.stop();
	});

	// Fresh references each case: a case may clear the entity manager
	beforeEach(async () => {
		const em = harness.orm.em;
		const ids = { city: city.id, venue: venue.id };
		em.clear();
		city = await em.findOneOrFail(City, ids.city);
		venue = await em.findOneOrFail(Venue, ids.venue, { populate: ['brand'] });
	});

	let n = 0;
	const review = (fields: Partial<Review> = {}) =>
		harness.orm.em.create(Review, {
			venue,
			reviewId: `fb-${n++}`,
			publishedAt: new Date('2026-09-10T12:00:00Z'),
			stars: 2,
			text: 'We waited 50 minutes for a burger.',
			...fields,
		});
	const post = (fields: Partial<SocialPost> = {}) =>
		harness.orm.em.create(SocialPost, {
			city,
			externalId: `fb-post-${n++}`,
			platform: SocialPlatformEnum.TIKTOK,
			url: `https://tiktok.com/fb/${n}`,
			author: `eater${n}`,
			views: 100,
			text: 'Burger Bros in Kreuzberg: the burger got pricier, still a juicy patty #berlinfood #burger',
			postedAt: new Date('2026-09-12T12:00:00Z'),
			...fields,
		});
	const rowsOf = (where: object) =>
		harness.orm.em.find(FeedbackPoint, where, {
			orderBy: { id: 'asc' },
			populate: ['foodTopic'],
		});

	it("writes a review's rows with its analysis, replaces them on a second one, and drops them with it", async () => {
		const em = harness.orm.em;
		const r = review();
		await em.flush();
		reviewAnswer = () => ({
			praise: [{ theme: 'taste', detail: 'tasty fries', dish: 'Fries', amount: null }],
			complaints: [
				{ theme: 'wait_for_food', detail: 'waited 50 minutes', dish: null, amount: 50 },
				{
					theme: 'price_increase',
					detail: 'the burger got pricier',
					dish: 'Burger',
					amount: null,
				},
			],
			dishes: [
				{ name: 'Fries', sentiment: 'positive' },
				{ name: 'Burgers', sentiment: 'negative' },
				{ name: 'Milkshake', sentiment: 'positive' },
			],
		});
		await harness.moduleRef.get(ReviewService).analyseMonth('2026-09');
		em.clear();
		let rows = await rowsOf({ review: r.id });
		expect(
			rows.map(p => [
				p.sentiment,
				p.theme,
				p.dish,
				p.amount,
				p.unit,
				p.detail,
				p.month,
				p.city.id,
			]),
		).toEqual([
			['positive', 'taste', 'Fries', null, null, 'tasty fries', '2026-09', city.id],
			[
				'negative',
				'wait_for_food',
				null,
				50,
				'minutes',
				'waited 50 minutes',
				'2026-09',
				city.id,
			],
			[
				'negative',
				'price_increase',
				'Burger',
				null,
				null,
				'the burger got pricier',
				'2026-09',
				city.id,
			],
			// The one dish no point names
			['positive', null, 'Milkshake', null, null, null, '2026-09', city.id],
		]);
		expect(rows[2].foodTopic?.key).toBe('burgers');

		// Analysed again: the rows are replaced, not added to
		await em.nativeUpdate(Review, { id: r.id }, { analysedAt: null });
		reviewAnswer = () => ({
			complaints: [{ theme: 'friendliness', detail: 'rude staff', dish: null, amount: null }],
		});
		await harness.moduleRef.get(ReviewService).analyseMonth('2026-09');
		em.clear();
		rows = await rowsOf({ review: r.id });
		expect(rows.map(p => p.detail)).toEqual(['rude staff']);

		await em.nativeDelete(Review, { id: r.id });
		expect(await em.count(FeedbackPoint, { review: r.id })).toBe(0);
	});

	it("writes a review's noticed changes as rows the theme backlog files, never as praise or complaints", async () => {
		const em = harness.orm.em;
		const r = review({ reviewId: 'fb-changes' });
		await em.flush();
		reviewAnswer = () => ({
			complaints: [
				{
					theme: 'portion_size',
					detail: 'burgers are smaller now',
					dish: null,
					amount: null,
				},
			],
			changes: ['new owner', 'burgers are getting smaller', 'New owner'],
		});
		await harness.moduleRef.get(ReviewService).analyseMonth('2026-09');
		em.clear();
		const changes = (await rowsOf({ review: r.id })).filter(p => p.change);
		// Each spelling once, neutral, unfiled, never asked a dish or an amount
		expect(
			changes.map(p => [
				p.detail,
				p.sentiment,
				p.theme ?? null,
				!!p.dishCheckedAt,
				!!p.amountCheckedAt,
			]),
		).toEqual([
			['new owner', 'neutral', null, true, true],
			['burgers are getting smaller', 'neutral', null, true, true],
		]);
		expect(complaintsOf(await rowsOf({ review: r.id })).map(p => p.detail)).toEqual([
			'burgers are smaller now',
		]);

		// The theme backlog files them, told they are changes
		themeAgent.generate.mockClear();
		await harness.moduleRef.get(FeedbackThemeService).fileThemes({ limit: 100 });
		const asked = themeAgent.generate.mock.calls.flatMap(
			([prompt]) =>
				(JSON.parse(prompt as string) as { points: { detail: string; kind: string }[] })
					.points,
		);
		expect(
			asked.filter(p => p.detail !== 'burgers are smaller now').map(p => [p.detail, p.kind]),
		).toEqual(
			expect.arrayContaining([
				['new owner', 'change'],
				['burgers are getting smaller', 'change'],
			]),
		);
		em.clear();
		expect((await rowsOf({ review: r.id })).filter(p => p.change).every(p => p.theme)).toBe(
			true,
		);
	});

	it('writes each mention\'s rows with the extraction: "the burger got pricier" is one row', async () => {
		const em = harness.orm.em;
		const p = post();
		await em.flush();
		await harness.moduleRef
			.get(MentionExtractionService)
			.extract({ limit: 10, cityId: city.id });
		em.clear();
		const mention = await em.findOneOrFail(Mention, { post: p.id });
		const rows = await rowsOf({ mention: mention.id });
		expect(
			rows.map(r => [r.sentiment, r.topic, r.theme, r.dish, r.foodTopic?.key, r.detail]),
		).toEqual([
			['positive', 'food', 'taste', null, undefined, 'juicy patty'],
			['negative', 'price', 'price_increase', 'burger', 'burgers', 'the burger got pricier'],
		]);
		// A point names the burger, so no dish-only row for it
		expect(rows.filter(r => !r.detail)).toEqual([]);
		// The mention keeps only its overall sentiment and summary
		expect([mention.sentiment, mention.summary]).toEqual(['mixed', 'Pricier than before.']);
	});

	it('re-links dish rows when a topic gains an alias, and unlinks them when the topic goes', async () => {
		const em = harness.orm.em;
		const r = review({ reviewId: 'fb-relink' });
		addFeedback(
			em,
			r,
			{
				dishes: [
					{ name: 'Dürüm', sentiment: 'positive' },
					{ name: 'Pide', sentiment: 'positive' },
				],
			},
			{ index: (await feedback.dishTopics()).index },
		);
		await em.flush();
		const linked = async () =>
			Object.fromEntries(
				(await rowsOf({ review: r.id })).map(p => [p.dish, p.foodTopic?.key ?? null]),
			);
		// "durum" is a seeded kebab alias; "pide" names nothing
		expect(await linked()).toEqual({ Dürüm: 'kebab', Pide: null });

		pgBoss.sendJob.mockClear();
		const kebab = topics.get('kebab')!;
		await harness.moduleRef
			.get(FoodTopicService)
			.update(kebab.id, { aliases: [...kebab.aliases, 'pide'] });
		expect(pgBoss.sendJob).toHaveBeenCalledWith(FoodTopicRelinkJob.jobName, expect.anything(), {
			singletonKey: 'all',
		});
		// What the job runs
		expect(
			(await harness.moduleRef.get(FoodTopicRelinkService).relinkAll())['dish-names'],
		).toMatchObject({ rows: 1 });
		em.clear();
		expect(await linked()).toEqual({ Dürüm: 'kebab', Pide: 'kebab' });

		// The topic deleted: its rows lose the link, nothing else
		await em.nativeDelete(FoodTopic, { id: kebab.id });
		em.clear();
		expect(await linked()).toEqual({ Dürüm: null, Pide: null });
	});

	it('realigns topics to the vocabulary and sends points of a removed theme back to filing', async () => {
		const em = harness.orm.em;
		const r = review({ reviewId: 'fb-realign' });
		const [moved, removed] = addFeedback(em, r, {
			complaints: [
				{ theme: 'price_level', detail: 'too pricey' },
				{ theme: 'price_level', detail: 'odd one' },
			],
		});
		await em.flush();
		// As if the vocabulary had moved price_level elsewhere, and dropped a theme
		await em.nativeUpdate(FeedbackPoint, { id: moved.id }, { topic: 'food' });
		await em.nativeUpdate(FeedbackPoint, { id: removed.id }, { theme: 'gone_theme' as never });

		expect(await feedback.realign()).toEqual({ topicsMoved: 1, unfiled: 1 });
		em.clear();
		const [a, b] = await rowsOf({ review: r.id });
		expect([a.topic, a.theme]).toEqual(['price', 'price_level']);
		expect([b.topic, b.theme]).toEqual(['price', null]);
		expect(await feedback.realign()).toEqual({ topicsMoved: 0, unfiled: 0 });
	});

	it('drains the passes as daily backlogs: themes, dishes and amounts, each point asked once', async () => {
		const em = harness.orm.em;
		const themes = harness.moduleRef.get(FeedbackThemeService);
		const dishes = harness.moduleRef.get(FeedbackDishService);
		const amounts = harness.moduleRef.get(FeedbackAmountService);
		const r = review({
			reviewId: 'fb-passes',
			text: 'We waited 45 minutes. The burger was cold, cash only.',
		});
		addFeedback(
			em,
			r,
			{
				complaints: [
					{ topic: 'payment', detail: 'cash only' },
					{ topic: 'food', theme: 'temperature', detail: 'burger and fries cold' },
					{ topic: 'food', theme: 'portion_size', detail: 'small' },
					{ topic: 'wait', theme: 'wait_for_food', detail: 'long wait' },
					{ topic: 'wait', theme: 'queue', detail: 'a queue' },
				],
				dishes: [
					{ name: 'Burger', sentiment: 'negative' },
					{ name: 'Fries', sentiment: 'negative' },
				],
			},
			{ asked: false },
		);
		// A source naming no dish: its food point needs no call
		const plain = review({ reviewId: 'fb-plain', text: null });
		addFeedback(
			em,
			plain,
			{ complaints: [{ topic: 'food', theme: 'taste', detail: 'bland' }] },
			{ asked: false },
		);
		await em.flush();
		// The realign case left a point to file
		const before = [
			await themes.countUnfiled(),
			await dishes.countPending(),
			await amounts.countPending(),
		];
		expect(before.every(count => count >= 2)).toBe(true);
		themeAgent.generate.mockClear();
		dishAgent.generate.mockClear();
		amountAgent.generate.mockClear();

		await harness.moduleRef.get(LlmBacklogService).drain({ budget: 1_000_000 });

		expect([
			await themes.countUnfiled(),
			await dishes.countPending(),
			await amounts.countPending(),
		]).toEqual([0, 0, 0]);
		em.clear();
		const rows = Object.fromEntries(
			(await rowsOf({ review: r.id })).map(x => [x.detail ?? `dish:${x.dish}`, x]),
		);
		expect(rows['cash only'].theme).toBe('cash_only');
		// "burger and fries cold" took the burger: its dish-only row is gone
		expect([
			rows['burger and fries cold'].dish,
			rows['small'].dish,
			rows['small'].dishCheckedAt,
		]).toEqual(['Burger', null, expect.any(Date)]);
		expect(Object.keys(rows).filter(k => k.startsWith('dish:'))).toEqual(['dish:Fries']);
		expect([rows['long wait'].amount, rows['long wait'].unit, rows['a queue'].amount]).toEqual([
			45,
			'minutes',
			45,
		]);
		// One call each; the source without dishes asked nothing
		expect(dishAgent.generate).toHaveBeenCalledTimes(1);
		const asked = JSON.parse(dishAgent.generate.mock.calls[0][0] as string).points.map(
			(p: { detail: string }) => p.detail,
		);
		expect(asked).toEqual(expect.arrayContaining(['burger and fries cold', 'small']));
		expect(asked).not.toContain('bland');
		expect(themeAgent.generate).toHaveBeenCalledTimes(1);
		expect(amountAgent.generate).toHaveBeenCalledTimes(1);

		const runs = await em.find(BacklogRun, {}, { orderBy: { key: 'asc' } });
		expect(runs.map(x => [x.key, x.stopReason, x.remaining])).toEqual([
			['feedback-amounts', 'empty', 0],
			['feedback-dish-links', 'empty', 0],
			['feedback-dish-names', 'empty', 0],
			['feedback-themes', 'empty', 0],
		]);

		// Nothing is asked twice
		await harness.moduleRef.get(LlmBacklogService).drain({ budget: 1_000_000 });
		expect([
			themeAgent.generate.mock.calls.length,
			dishAgent.generate.mock.calls.length,
			amountAgent.generate.mock.calls.length,
		]).toEqual([1, 1, 1]);
	});

	it('sends the pass’s links whose phrase names no dish back to the backlog, and brings back the dish-only row', async () => {
		const em = harness.orm.em;
		const dishes = harness.moduleRef.get(FeedbackDishService);
		const point = (source: Review, detail: string, dish: string) =>
			em.create(FeedbackPoint, {
				sourceKind: 'review',
				review: source,
				city,
				month: '2026-09',
				sentiment: 'positive',
				topic: 'food',
				theme: 'taste',
				detail,
				dish,
				dishKey: dish.toLowerCase(),
				dishCheckedAt: new Date(),
			});
		const burgers = review({ reviewId: 'fb-recheck-1' });
		const byPass = point(burgers, 'juicy and tender', 'Burger');
		const named = point(burgers, 'the burger was cold', 'Burger');
		const fries = review({ reviewId: 'fb-recheck-2' });
		const lonely = point(fries, 'crispy', 'Fries');
		// Extraction linked it with the whole review in view: kept
		const steak = review({ reviewId: 'fb-recheck-3' });
		const extracted = point(steak, 'perfectly done', 'Steak');
		await em.flush();
		// The pass checks a point after it was stored
		await em
			.getConnection()
			.execute(
				`update feedback_points set dish_checked_at = created_at + interval '2 minutes' where id in (?, ?, ?)`,
				[byPass.id, named.id, lonely.id],
			);
		em.clear();
		const pendingBefore = await dishes.countPending();

		expect(await harness.moduleRef.get(AdminFeedbackController).recheckDishLinks()).toEqual({
			points: 2,
			dishOnlyRows: 1,
			remaining: pendingBefore + 2,
		});
		em.clear();
		const dishOf = async (id: number) => {
			const row = await em.findOneOrFail(FeedbackPoint, { id });
			return [row.dish ?? null, !!row.dishCheckedAt];
		};
		expect([
			await dishOf(byPass.id),
			await dishOf(named.id),
			await dishOf(lonely.id),
			await dishOf(extracted.id),
		]).toEqual([
			[null, false],
			['Burger', true],
			[null, false],
			['Steak', true],
		]);
		// The burger is still named by the other point; the fries are back as a dish-only row
		const dishOnly = await em.find(FeedbackPoint, {
			detail: null,
			review: { $in: [burgers.id, fries.id] },
		});
		expect(dishOnly.map(r => [r.review?.id, r.dish, r.sentiment])).toEqual([
			[fries.id, 'Fries', 'positive'],
		]);
	});

	it('answers how many venues had a waiting complaint, and how long', async () => {
		const em = harness.orm.em;
		// A city of its own: the cases above left waits in the first one
		city = testCity(em, { name: 'Waitville' });
		venue = venueFactory.build({ name: 'Burger Bros' }, { associations: { city } });
		const other = venueFactory.build({ name: 'Slow Döner' }, { associations: { city } });
		await em.flush();
		const own = ownAccount(em, venue.brand, city, 'burgerbros');
		addFeedback(em, review({ reviewId: 'fb-w1' }), {
			complaints: [{ theme: 'wait_for_food', detail: 'waited 30 minutes', amount: 30 }],
		});
		addFeedback(em, review({ reviewId: 'fb-w2', venue: other }), {
			complaints: [
				{ theme: 'queue', detail: 'long queue' },
				{ theme: 'wait_for_food', detail: 'an hour for food', amount: 60 },
			],
		});
		// No text: not a written review; another month
		addFeedback(em, review({ reviewId: 'fb-w3', venue: other, text: null }), {
			complaints: [{ theme: 'queue', detail: 'queue' }],
		});
		addFeedback(
			em,
			review({ reviewId: 'fb-w4', publishedAt: new Date('2026-08-10T12:00:00Z') }),
			{
				complaints: [{ theme: 'queue', detail: 'queue' }],
			},
		);
		const mentionOf = (p: SocialPost, brand = venue.brand) =>
			em.create(Mention, {
				post: p,
				brand,
				venue,
				venueName: 'Burger Bros',
				visited: true,
				sentiment: 'negative',
				summary: 'Slow.',
			});
		addFeedback(em, mentionOf(post({ externalId: 'fb-wp1' })), {
			complaints: [
				{ theme: 'wait_for_table', detail: 'waited 20 minutes for a table', amount: 20 },
			],
		});
		// The brand's own post never counts
		addFeedback(
			em,
			mentionOf(post({ externalId: 'fb-wp2', account: own, author: own.handle })),
			{
				complaints: [{ theme: 'queue', detail: 'own' }],
			},
		);
		await em.flush();

		const res = await feedback.waitComplaints(city.id, '2026-09');
		expect(res).toMatchObject({ venues: 2, brands: 2, sources: 3, reviews: 2, posts: 1 });
		expect(res.byTheme).toEqual([
			{ theme: 'queue', venues: 1, brands: 1, sources: 1 },
			{ theme: 'wait_for_food', venues: 2, brands: 2, sources: 2 },
			{ theme: 'wait_for_table', venues: 1, brands: 1, sources: 1 },
		]);
		expect(res.stated).toEqual({
			complaints: 3,
			of: 3,
			median: 30,
			upperQuartile: 45,
			max: 60,
		});
	});
});
