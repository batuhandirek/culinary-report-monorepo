import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';

import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { ownAccount } from 'src/modules/social/tests/factories/social-account.factory.js';
import { Mention, MentionMatchMethodEnum } from 'src/modules/social/entities/mention.entity.js';
import { SocialPlatformEnum, SocialPost } from 'src/modules/social/entities/social-post.entity.js';
import { Review } from 'src/modules/venues/entities/review.entity.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { VenueSnapshot } from 'src/modules/venues/entities/venue-snapshot.entity.js';
import { CityService } from 'src/modules/cities/services/city.service.js';
import { Brand } from 'src/modules/venues/entities/brand.entity.js';
import { BrandService } from 'src/modules/venues/services/brand.service.js';
import { CompetitorService } from 'src/modules/venues/services/competitor.service.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { MOCK_AGENT_MODEL, mockAgent } from 'src/tests/mock-agent.js';
import { DurableLlmService } from 'src/modules/llm/services/durable-llm.service.js';
import { NoModelError } from 'src/modules/llm/services/llm-models.service.js';
import { MIN_LLM_WAIT_MS } from 'src/modules/llm/workflows/llm.workflow.js';
import { ASPECT_SEED } from 'src/modules/topics/constants/aspect-seed.constant.js';
import { TopicService } from 'src/modules/topics/services/topic.service.js';
import { seedTopics } from 'src/modules/topics/tests/factories/topic.factory.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { ReportEditorAgent } from '../agents/report-editor.agent.js';
import { Report } from '../entities/report.entity.js';
import { ReportService } from '../services/report.service.js';
import { ReportConfigService } from '../services/report-config.service.js';
import { ReportTemplateService } from '../services/report-template.service.js';

// The editor's answer, and the written part it becomes once checked
const ANSWER = {
	kind: 'story',
	title: 'A good month',
	headline: 'Things went well.',
	letter: ['Things went well.'],
	attention: [],
	tryThis: [{ title: 'Answer reviews', text: 'Reply to every review.' }],
	notes: 'Nothing to look up.',
};
const HIGHLIGHTS = {
	title: ANSWER.title,
	headline: ANSWER.headline,
	highlights: [],
	actions: ANSWER.tryThis,
};

describe('ReportService.build (pglite)', () => {
	let harness: PgliteTestingModule;
	let service: ReportService;
	// The roster's answer when no account serves: back in an hour
	const highlightsAgent = Object.assign(mockAgent(ANSWER), {
		id: 'report-editor',
		availability: jest.fn(() => ({
			available: false,
			until: Date.now() + 3_600_000,
			reason: 'every account is out of its day',
		})),
	});

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				ReportService,
				// Real: the report keeps the aspect vocabulary it was built with (the auto-mock has no index)
				TopicService,
				ReportConfigService,
				ReportTemplateService,
				CompetitorService,
				BrandService,
				CityService,
				// Real: an agent call that finds no account waits for one (its facade auto-mocked: a timer)
				DurableLlmService,
				{ provide: ReportEditorAgent, useValue: highlightsAgent },
			],
		});
		service = harness.moduleRef.get(ReportService);
		entityManagerManager.setEntityManager(harness.orm.em);
	});

	afterAll(async () => {
		await harness.stop();
	});

	// A venue's own brand before the flush that would make it, for the mentions and reports
	const brandOf = (venue: Venue) =>
		(venue.brand ??= harness.orm.em.create(Brand, { name: venue.name, key: venue.name.toLowerCase() }));

	let n = 0;
	const post = (venue: Venue, author: string, postedAt: string, extra: Partial<SocialPost> = {}) => {
		const em = harness.orm.em;
		const p = em.create(SocialPost, {
			city: venue.city,
			externalId: `t${++n}`,
			platform: SocialPlatformEnum.TIKTOK,
			url: `https://tiktok.com/t${n}`,
			postedAt: new Date(postedAt),
			author,
			authorFans: 1000 * n,
			views: 100 * n,
			...extra,
		});
		em.create(Mention, {
			post: p,
			venueName: venue.name,
			venue,
			brand: brandOf(venue),
			matchMethod: MentionMatchMethodEnum.EXACT,
			visited: true,
		});
		return p;
	};
	const review = (venue: Venue, reviewId: string, publishedAt: string, extra: Partial<Review> = {}) =>
		harness.orm.em.create(Review, {
			reviewId,
			venue,
			publishedAt: new Date(publishedAt),
			stars: 4,
			text: 'Fine',
			language: 'de',
			...extra,
		});

	it('builds the trend, the previous month and nearby creators', async () => {
		const em = harness.orm.em;
		seedTopics(em, ASPECT_SEED.map(a => a.key));
		const city = testCity(em);
		const venue = em.create(Venue, {
			city,
			placeId: 'p-v',
			name: 'Chén Chè',
			category: 'Vietnamese restaurant',
			district: 'Mitte',
			rating: 4.4,
			googleUrl: 'https://maps.google.com/?cid=1',
		});
		const neighbour = em.create(Venue, {
			city,
			placeId: 'p-n',
			name: 'Zola',
			category: 'Pizza restaurant',
			district: 'Mitte',
		});

		// August: one post and two reviews, and a report with an action
		post(venue, 'augustfan', '2026-08-10T12:00:00Z');
		review(venue, 'aug-1', '2026-08-05T12:00:00Z', { ownerResponse: 'Thanks' });
		review(venue, 'aug-2', '2026-08-06T12:00:00Z');
		em.create(Report, {
			brand: brandOf(venue),
			city,
			month: '2026-08',
			data: {} as Report['data'],
			highlights: HIGHLIGHTS,
		});

		// September
		post(venue, 'loyal', '2026-09-10T12:00:00Z');
		post(neighbour, 'loyal', '2026-09-11T12:00:00Z');
		post(neighbour, 'newcomer', '2026-09-12T12:00:00Z');
		post(neighbour, 'paidguy', '2026-09-13T12:00:00Z', { isPromotional: true });
		// Same district name, another city: neither a neighbour nor its creators nearby
		const namesake = em.create(Venue, {
			city: testCity(em, { name: 'Elsewhere' }),
			placeId: 'p-far',
			name: 'Far Away',
			category: 'Pizza restaurant',
			district: 'Mitte',
		});
		post(namesake, 'farfan', '2026-09-14T12:00:00Z');
		review(venue, 'answered', '2026-09-02T12:00:00Z', { stars: 1, ownerResponse: 'Sorry' });
		review(venue, 'stars-only', '2026-09-03T12:00:00Z', { stars: 1, text: null });
		review(venue, 'one-star', '2026-09-04T12:00:00Z', { stars: 1, text: 'Cold soup' });
		for (let i = 0; i < 11; i++)
			review(venue, `five-${i}`, `2026-09-${String(10 + i)}T12:00:00Z`, { stars: 5 });

		for (const [snapshotDate, rating] of [
			['2026-08-02', 4.3],
			['2026-10-02', 4.4],
		] as const)
			em.create(VenueSnapshot, { venue, snapshotDate, rating, reviewsCount: 200 });
		await em.flush();

		const report = await service.build(venue.brand.id, venue.city.id, '2026-09');
		const data = report.data;

		expect(data.branches[0].googleUrl).toBe('https://maps.google.com/?cid=1');
		expect(data.branches[0].ratingTrend.map(p => [p.month, p.rating])).toEqual([
			['2026-07', 4.3],
			['2026-09', 4.4],
		]);

		expect(data.previous).toMatchObject({
			month: '2026-08',
			social: { postCount: 1, creators: 1 },
			reviews: { count: 2, replyRate: 0.5 },
			actions: HIGHLIGHTS.actions,
		});

		// The vocabulary the theme counts are keyed by travels with the report, roots first
		expect(data.aspects![0]).toEqual({ key: 'food', label: 'Food', root: 'food' });
		expect(data.aspects).toContainEqual({ key: 'price_level', label: 'Price level', root: 'price' });
		expect(data.aspects).toHaveLength(ASPECT_SEED.length);

		expect(data.creators.map(c => c.author)).toEqual(['loyal']);
		expect(data.creatorsNearby.map(c => c.author)).toEqual(['newcomer']);
		expect(data.creatorsNearby[0].venues).toEqual(['Zola']);
		expect(data.branches[0].neighbours.map(n => n.name)).toEqual(['Zola']);
		// The editor gets the city and the read tools (none here: the evidence service is mocked away,
		// so it writes from the material alone), and its answer is stored checked, with its trace
		const [, context] = highlightsAgent.generate.mock.calls.at(-1)! as [string, { cityName: string; tools: Record<string, unknown> }];
		expect(context).toEqual({ cityName: 'Berlin', tools: {} });
		expect(report.highlights).toMatchObject({ ...HIGHLIGHTS, kind: 'story', letter: ANSWER.letter, notes: ANSWER.notes });
		expect(report.highlights.trace).toMatchObject({ model: MOCK_AGENT_MODEL, toolCalls: 0, problems: [] });

		expect(data.reviews.list).toHaveLength(14);
		expect(data.reviews.list[0].reviewId).toBe('five-10');

		// The editor got the month before (by name, so the letter never quotes a key or a YYYY-MM), last month's actions and the creators
		const input = JSON.parse(highlightsAgent.generate.mock.calls.at(-1)![0] as string);
		expect(input.inNumbers.monthBefore).toMatchObject({ month: 'August 2026', postsByOthers: 1, reviews: 2 });
		expect(input.actionsSuggestedLastMonth).toEqual(HIGHLIGHTS.actions);
		expect(input.creatorsWhoCoveredNeighboursButNotYou[0]).toMatchObject({ creator: expect.stringMatching(/^@newcomer on TikTok, \d+ followers$/), covered: ['Zola'] });
		// The trend is the place's own
		expect(input.places[0].ratingAtEachMonthsClose).toHaveLength(2);

		// Stored as built
		harness.orm.em.clear();
		const stored = await harness.orm.em.findOneOrFail(Report, { id: report.id });
		expect(stored.data.reviews.list).toHaveLength(14);
	});

	it("counts a neighbour's posts by others, each once, as its own report does", async () => {
		const em = harness.orm.em;
		const city = testCity(em);
		const venue = em.create(Venue, { city, placeId: 'p-nb-v', name: 'Kiez Kebab', category: 'Kebab shop', district: 'Neukölln' });
		const neighbour = em.create(Venue, {
			city,
			placeId: 'p-nb-n',
			name: 'Drei Bar',
			category: 'Bar',
			district: 'Neukölln',
		});
		const own = ownAccount(em, brandOf(neighbour), city, 'drei.bar');
		post(neighbour, 'drei.bar', '2026-09-05T12:00:00Z', { account: own, views: 9000 });
		post(neighbour, 'fan', '2026-09-06T12:00:00Z', { views: 300 });
		// One post naming the neighbour twice
		const twice = post(neighbour, 'regular', '2026-09-07T12:00:00Z', { views: 200 });
		em.create(Mention, {
			post: twice,
			venueName: 'Drei',
			venue: neighbour,
			brand: brandOf(neighbour),
			matchMethod: MentionMatchMethodEnum.EXACT,
			visited: true,
		});
		await em.flush();

		const report = await service.build(brandOf(venue).id, city.id, '2026-09');
		expect(report.data.branches[0].neighbours).toEqual([
			expect.objectContaining({ name: 'Drei Bar', posts: 2, views: 500 }),
		]);
		// The same figures as the neighbour's own report
		const its = await service.build(brandOf(neighbour).id, city.id, '2026-09');
		expect(its.data.branches[0].social).toMatchObject({ postCount: 2, views: 500 });
	});

	it('leaves previous out for a first report', async () => {
		const em = harness.orm.em;
		const venue = em.create(Venue, { city: testCity(em), placeId: 'p-new', name: 'Neu', category: 'Cafe' });
		review(venue, 'n-1', '2026-09-05T12:00:00Z', { stars: 2, text: 'Slow' });
		await em.flush();

		const report = await service.build(venue.brand.id, venue.city.id, '2026-09');
		expect(report.data.previous).toBeUndefined();
		expect(report.data.creatorsNearby).toEqual([]);
		expect(report.data.branches[0].ratingTrend).toEqual([]);
	});

	it('waits for an LLM account when none can serve the editor, then writes with it', async () => {
		const em = harness.orm.em;
		const venue = em.create(Venue, { city: testCity(em), placeId: 'p-wait', name: 'Warte', category: 'Cafe' });
		review(venue, 'w-1', '2026-09-05T12:00:00Z', { stars: 4, text: 'Good' });
		await em.flush();
		// The wait is instant here; its length is what the roster named
		const sleep = jest
			.spyOn(harness.moduleRef.get(DurableLlmService) as unknown as { sleep: (ms: number) => Promise<void> }, 'sleep')
			.mockResolvedValue(undefined);
		highlightsAgent.generate.mockRejectedValueOnce(new NoModelError('No model can serve full: every account is out of its day'));

		const report = await service.build(venue.brand.id, venue.city.id, '2026-09');
		expect(sleep).toHaveBeenCalledTimes(1);
		expect(sleep.mock.calls[0][0]).toBeGreaterThanOrEqual(MIN_LLM_WAIT_MS);
		expect(highlightsAgent.availability).toHaveBeenCalled();
		// The agent's answer, not the code-written fallback, and no error in the trace
		expect(report.highlights).toMatchObject({ ...HIGHLIGHTS, kind: 'story', letter: ANSWER.letter });
		expect(report.highlights.trace?.error).toBeUndefined();
		sleep.mockRestore();
	});

	it("falls back to the code-written part when the editor's call fails for another reason", async () => {
		const em = harness.orm.em;
		const venue = em.create(Venue, { city: testCity(em), placeId: 'p-fail', name: 'Kaputt', category: 'Cafe' });
		review(venue, 'f-1', '2026-09-05T12:00:00Z', { stars: 4, text: 'Good' });
		await em.flush();
		highlightsAgent.generate.mockRejectedValueOnce(new Error('The answer did not fit the schema'));

		const report = await service.build(venue.brand.id, venue.city.id, '2026-09');
		expect(report.highlights.trace?.error).toBe('The answer did not fit the schema');
		expect(report.highlights.letter).not.toEqual(ANSWER.letter);
	});

	it("keeps a blog article's headline on its post, for the media coverage section", async () => {
		const em = harness.orm.em;
		const venue = em.create(Venue, { city: testCity(em), placeId: 'p-blog', name: 'Kiezküche', category: 'Restaurant' });
		post(venue, 'berlinfoodstories.com', '2026-09-08T12:00:00Z', {
			platform: SocialPlatformEnum.BLOG,
			url: 'https://berlinfoodstories.com/kiezkueche',
			views: 0,
			text: 'Kiezküche: lunch worth the queue\n\nWe went on a Tuesday and the place was full …',
		});
		post(venue, 'eater', '2026-09-09T12:00:00Z', { text: 'Best lunch\n\nso good' });
		await em.flush();

		const report = await service.build(venue.brand.id, venue.city.id, '2026-09');
		const byPlatform = Object.fromEntries(report.data.posts.map(p => [p.platform, p]));
		expect(byPlatform.blog).toMatchObject({
			title: 'Kiezküche: lunch worth the queue',
			author: 'berlinfoodstories.com',
			url: 'https://berlinfoodstories.com/kiezkueche',
			// What it said comes from its claims (none here)
			said: [],
			sentiment: 'neutral',
		});
		expect(byPlatform.tiktok.title).toBeUndefined();
	});
});
