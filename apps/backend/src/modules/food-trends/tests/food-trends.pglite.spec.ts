import { ConflictException, NotFoundException } from '@nestjs/common';

import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';

import { ApifyService } from 'src/modules/apify/services/apify.service.js';
import type { City } from 'src/modules/cities/entities/city.entity.js';
import { CityService } from 'src/modules/cities/services/city.service.js';
import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import type { FoodTopic } from 'src/modules/food-topics/entities/food-topic.entity.js';
import { FoodTopicService } from 'src/modules/food-topics/services/food-topic.service.js';
import { VenueFoodTopicService } from 'src/modules/food-topics/services/venue-food-topic.service.js';
import { linkFoodTopics, seedFoodTopics } from 'src/modules/food-topics/tests/factories/food-topic.factory.js';
import { PgBossService } from 'src/modules/pgboss/pgboss.service.js';
import { SitemapService } from 'src/modules/sitemap/services/sitemap.service.js';
import { Mention } from 'src/modules/social/entities/mention.entity.js';
import { SocialPlatformEnum, SocialPost } from 'src/modules/social/entities/social-post.entity.js';
import { ownAccount } from 'src/modules/social/tests/factories/social-account.factory.js';
import { TrendRelatedQuery } from 'src/modules/trends/entities/trend-related-query.entity.js';
import {
	SearchTermKindEnum,
	TrendSearchInterest,
} from 'src/modules/trends/entities/trend-search-interest.entity.js';
import { SearchInterestService } from 'src/modules/trends/services/search-interest.service.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { VenueStatusChangeService } from 'src/modules/venues/services/venue-status-change.service.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { TRENDS_COMPARE_ACTOR } from '../constants/food-trends.constant.js';
import { FoodTrendsSearchPullJob } from '../jobs/food-trends-search-pull.job.js';
import { FoodTrendsReportService } from '../services/food-trends-report.service.js';
import {
	anchoredLevels,
	compareGroups,
	type ComparePoint,
	groupSeries,
	periodLevel,
	type TrendsCompareItem,
} from '../util/anchored-levels.js';
import { computeBreakouts, isNegativeQuery } from '../util/food-trends.js';
import {
	lastQuarter,
	quarterBefore,
	quarterEnd,
	quarterMonths,
	quarterOf,
} from '../util/quarter.js';

// Every week starting in the two years ending September 2026, Sundays as Google starts them
const WEEKS: Date[] = [];
for (
	let d = new Date('2024-10-06T00:00:00Z');
	d < new Date('2026-10-01T00:00:00Z');
	d = new Date(d.getTime() + 7 * 86400_000)
) {
	WEEKS.push(d);
}
const inQ3 = (d: Date) => d.getUTCMonth() >= 6 && d.getUTCMonth() <= 8;

// A topic's true weekly search volume in Berlin (the unit Google never shows): pizza steady at
// 1,000; döner bigger than pizza; Vietnamese up from 500 to 800 this summer; Thai a summer high
// every year (a season, not a trend); Korean too rare to show
const VOLUME: Record<string, (d: Date) => number> = {
	pizza: () => 1000,
	kebab: () => 1500,
	italian: () => 400,
	japanese: () => 250,
	korean: () => 0,
	ramen: () => 300,
	thai: d => (inQ3(d) ? 600 : 200),
	turkish: () => 350,
	vietnamese: d => (d >= new Date('2026-07-01T00:00:00Z') ? 800 : 500),
};
// The topic a run's keyword (a Google topic id) is, filled once the topics are seeded
const keyOf = new Map<string, string>();
const volume = (keyword: string, d: Date) => VOLUME[keyOf.get(keyword)!](d);

// A compare run as `steadyfetch/google-trends-scraper` answers it: one interestOverTime row per
// keyword, every value on the group's one scale (its biggest week is 100), then a summary row
const compareRun = (terms: string[]): TrendsCompareItem[] => {
	const peak = Math.max(...terms.flatMap(t => WEEKS.map(w => volume(t, w))));
	return [
		...terms.map(keyword => ({
			surface: 'interestOverTime',
			keyword,
			sharedScale: true,
			comparedWith: terms.filter(t => t !== keyword),
			data: {
				points: WEEKS.map(w => ({
					timestamp: w.getTime() / 1000,
					value: Math.round((volume(keyword, w) / peak) * 100),
					isPartial: false,
				})),
			},
		})),
		{ surface: 'summary' },
	];
};

const near = (value: number | undefined, expected: number, tolerance = 1.5) =>
	expect(Math.abs((value ?? NaN) - expected)).toBeLessThan(tolerance);

describe('Food trends quarters (pure)', () => {
	it('names quarters and their months', () => {
		expect(quarterMonths('2026-q3')).toEqual(['2026-07', '2026-08', '2026-09']);
		expect(quarterOf('2026-10')).toBe('2026-q4');
		expect(quarterBefore('2026-q1')).toBe('2025-q4');
		expect(quarterBefore('2026-q3', 4)).toBe('2025-q3');
		expect(quarterEnd('2026-q3')).toEqual(new Date('2026-10-01T00:00:00Z'));
		expect(lastQuarter(new Date('2026-10-22T00:00:00Z'))).toBe('2026-q3');
	});

	it('groups every topic once with the anchor first, five a group', () => {
		const anchor = { key: 'pizza', query: '/m/p' };
		const topics = ['a', 'b', 'c', 'd', 'e', 'pizza', 'a'].map(key => ({ key, query: key }));
		expect(compareGroups(anchor, topics).map(g => g.map(t => t.key))).toEqual([
			['pizza', 'a', 'b', 'c', 'd'],
			['pizza', 'e'],
		]);
	});

	it('rescales groups onto the anchor: one scale whatever the group peak was', () => {
		const months = ['2026-07', '2026-08'];
		const week = (date: string, value: number): ComparePoint => ({
			timestamp: Date.parse(`${date}T00:00:00Z`) / 1000,
			value,
		});
		const line = (july: number, august: number) => [
			week('2026-07-05', july),
			week('2026-07-12', july),
			week('2026-08-02', august),
		];
		// Group A peaks at pizza; group B at a topic four times pizza's size, so pizza reads 25 there
		const levels = anchoredLevels(
			'pizza',
			[
				{
					terms: [],
					series: new Map([
						['pizza', line(100, 100)],
						['ramen', line(50, 0)],
					]),
				},
				{
					terms: [],
					series: new Map([
						['pizza', line(25, 25)],
						['coffee', line(100, 100)],
						['pho', line(12, 13)],
					]),
				},
				// The anchor never came back: these topics stay unknown, never zero
				{ terms: [], series: new Map([['korean', line(40, 40)]]) },
			],
			months,
		);
		expect(levels.usableGroups).toBe(2);
		expect(levels.levels.pizza).toEqual([100, 100]);
		expect(levels.levels.coffee).toEqual([400, 400]);
		expect(levels.levels.pho).toEqual([48, 52]);
		// A month with no week above 0 is below what the comparison shows
		expect(levels.levels.ramen).toEqual([50, null]);
		expect(levels.levels.korean).toBeUndefined();
		expect(periodLevel([10, 20, 30], ['a', 'b', 'c'], ['b', 'c'])).toBe(25);
		expect(periodLevel([10, null, 30], ['a', 'b', 'c'], ['a', 'b'])).toBeNull();
	});

	it('maps rows back by the keyword the run echoes, skipping notices', () => {
		const terms = [{ key: 'pizza', query: '/m/0663v' }];
		const series = groupSeries(terms, [
			{ surface: 'notice', keyword: '/m/0663v' },
			{
				surface: 'interestOverTime',
				keyword: '/M/0663V ',
				data: { points: [{ timestamp: 1, value: 5 }] },
			},
		]);
		expect(series.get('pizza')).toEqual([{ timestamp: 1, value: 5 }]);
	});

	it('lists a query once, whatever its plural', () => {
		const rows = [
			{ topic: 'Dumplings', query: 'squishy dumplings', value: 9000, breakout: true },
			{ topic: 'Dumplings', query: 'Squishy  dumpling', value: 8000, breakout: true },
			{ topic: 'Bagels', query: 'bagel near me', value: 400 },
		];
		expect(computeBreakouts({ month: '2026-09', rows }, [])?.queries.map(q => q.query)).toEqual(
			['squishy dumplings', 'bagel near me'],
		);
	});

	it('keeps trouble off the page', () => {
		expect(isNegativeQuery('ramen geschlossen')).toBe(true);
		expect(isNegativeQuery('Döner Rückruf Berlin')).toBe(true);
		expect(isNegativeQuery('mazesoba berlin')).toBe(false);
	});
});

describe('FoodTrendsReportService (pglite)', () => {
	let harness: PgliteTestingModule;
	let service: FoodTrendsReportService;
	let sitemap: SitemapService;
	let city: City;
	let topics: Map<string, FoodTopic>;
	const apify = {
		runActor: jest.fn(async (_actor: string, input: { searchTerms: string[] }) =>
			compareRun(input.searchTerms),
		),
	};
	const pgBoss = { sendJob: jest.fn(async (..._args: unknown[]) => undefined) };
	const AFTER_Q3 = new Date('2026-10-05T08:00:00Z');

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				FoodTrendsReportService,
				CityService,
				FoodTopicService,
				VenueFoodTopicService,
				SearchInterestService,
				VenueStatusChangeService,
				SitemapService,
				{ provide: ApifyService, useValue: apify },
				{ provide: PgBossService, useValue: pgBoss },
			],
		});
		service = harness.moduleRef.get(FoodTrendsReportService);
		sitemap = harness.moduleRef.get(SitemapService);
		service.onModuleInit();
		entityManagerManager.setEntityManager(harness.orm.em);

		const em = harness.orm.em;
		city = testCity(em, { slug: 'berlin', region: 'DE-BE', doNotListVenues: ['Quiet Corner'] });
		// Searched: pizza and italian, kebab and turkish, ramen and japanese, korean, thai,
		// vietnamese; café is a kind of place, never compared
		topics = seedFoodTopics(em, [
			'pizza',
			'kebab',
			'ramen',
			'korean',
			'thai',
			'vietnamese',
			'cafe',
		]);
		for (const t of topics.values()) if (t.trendsTopicId) keyOf.set(t.trendsTopicId, t.key);
		const ramenBar = em.create(Venue, {
			city,
			placeId: 'r1',
			name: 'Ramen Bar',
			category: 'Ramen restaurant',
			reviewsCount: 800,
		});
		const doner = em.create(Venue, {
			city,
			placeId: 'd1',
			name: 'Döner Ecke',
			category: 'Kebab shop',
			reviewsCount: 900,
		});
		const newSpot = em.create(Venue, {
			city,
			placeId: 'n1',
			name: 'Brand New Noodles',
			category: 'Ramen restaurant',
			reviewsCount: 12,
		});
		await em.flush();
		const own = ownAccount(em, ramenBar.brand, city, 'ramenbar');

		let n = 0;
		const mention = (
			venue: Venue,
			date: string,
			cuisine: string,
			opts: { own?: boolean; isNewOpening?: boolean } = {},
		) => {
			const post = em.create(SocialPost, {
				city,
				externalId: `ft-${n++}`,
				platform: SocialPlatformEnum.TIKTOK,
				url: `https://tiktok.com/ft/${n}`,
				author: opts.own ? own.handle : `c${n}`,
				account: opts.own ? own : undefined,
				views: 10,
				postedAt: new Date(`${date}T12:00:00Z`),
			});
			em.create(Mention, {
				post,
				venue,
				venueName: venue.name,
				cuisine,
				visited: true,
				sentiment: 'positive',
				summary: 'Good.',
				isNewOpening: opts.isNewOpening ?? false,
			});
		};
		// Q3 2026: 60 ramen posts by others, 40 döner; the ramen bar's own posts never count
		for (let i = 0; i < 60; i++) mention(ramenBar, `2026-0${7 + (i % 3)}-1${i % 9}`, 'Ramen');
		for (let i = 0; i < 40; i++) mention(doner, `2026-0${7 + (i % 3)}-2${i % 9}`, 'Döner');
		for (let i = 0; i < 30; i++) mention(ramenBar, '2026-08-05', 'Ramen', { own: true });
		// Two people's posts say a place just opened: counted under its kind of food, never named
		mention(newSpot, '2026-08-14', 'Ramen', { isNewOpening: true });
		mention(newSpot, '2026-08-16', 'Ramen', { isNewOpening: true });
		// Q2 2026: 100 posts, ramen a fifth of them, so ramen gained on the quarter before
		for (let i = 0; i < 20; i++) mention(ramenBar, '2026-05-10', 'Ramen');
		for (let i = 0; i < 80; i++) mention(doner, '2026-05-11', 'Döner');

		// Google's rising queries of the September pull (the monthly `SEARCH_INTEREST` step)
		const ramen = topics.get('ramen')!;
		em.create(TrendSearchInterest, {
			city,
			kind: SearchTermKindEnum.TOPIC,
			term: 'ramen',
			topic: ramen,
			month: '2026-09',
			interest: 60,
		});
		const related = (
			rank: number,
			query: string,
			value: number,
			rising = true,
			breakout = false,
		) =>
			em.create(TrendRelatedQuery, {
				city,
				kind: SearchTermKindEnum.TOPIC,
				term: 'ramen',
				topic: ramen,
				month: '2026-09',
				rising,
				rank,
				query,
				value,
				breakout,
			});
		related(1, 'mazesoba berlin', 76_050, true, true);
		related(2, 'tantanmen', 350);
		related(3, 'ramen geschlossen', 900);
		related(4, 'quiet corner ramen', 300);
		related(1, 'ramen near me', 100, false);
		await em.flush();
		await linkFoodTopics(em);
	});

	afterAll(async () => {
		await harness.stop();
	});

	it('pulls the topics in groups of five with pizza in each, two years in the city region', async () => {
		const report = await service.pullSearches(city.id, '2026-q3');
		expect(apify.runActor).toHaveBeenCalledTimes(2);
		const inputs = apify.runActor.mock.calls.map(
			c => c[1] as Record<string, unknown> & { searchTerms: string[] },
		);
		for (const [actor, input, opts] of apify.runActor.mock.calls as unknown as [
			string,
			Record<string, unknown> & { searchTerms: string[] },
			{ maxCostUsd: number },
		][]) {
			expect(actor).toBe(TRENDS_COMPARE_ACTOR);
			expect(input).toMatchObject({
				compare: true,
				geo: 'DE-BE',
				timeRange: '2024-10-01 2026-09-30',
				category: 71,
				surfaces: ['interestOverTime'],
			});
			expect(input.searchTerms[0]).toBe('/m/0663v');
			expect(input.searchTerms.length).toBeLessThanOrEqual(5);
			expect(opts.maxCostUsd).toBeGreaterThanOrEqual(0.05);
		}
		// Every searched kind of food once, café (a kind of place) never
		const asked = inputs.flatMap(i => i.searchTerms.slice(1));
		expect(new Set(asked).size).toBe(8);
		expect(asked).not.toContain(topics.get('cafe')!.trendsTopicId);
		expect(report.searchPull).toMatchObject({
			state: 'done',
			note: '2 of 2 groups, 8 of 9 topics with data',
		});
		expect(report.searchLevels?.months).toHaveLength(24);
	});

	it("puts every topic on pizza's scale, across groups, and compares a quarter with the year before", async () => {
		const { data } = await service.build(city.id, '2026-q3');
		const searches = data!.searches!;
		expect(searches.anchor).toEqual({ key: 'pizza', label: 'Pizza' });
		const level = (key: string) => searches.top.find(t => t.key === key);
		// Döner is in pizza's first group with a peak of its own; ramen in the second, under pizza's
		near(level('pizza')?.level, 100);
		near(level('kebab')?.level, 150);
		near(level('italian')?.level, 40);
		near(level('ramen')?.level, 30);
		expect(level('pizza')?.anchor).toBe(true);
		expect(searches.top.map(t => t.key).slice(0, 3)).toEqual(['kebab', 'pizza', 'vietnamese']);
		// Too rare to show: Korean is on no list
		expect(searches.top.find(t => t.key === 'korean')).toBeUndefined();
		// Vietnamese rose 60 % on summer 2025; Thai's summer high comes every year, so it is no rise
		expect(searches.rising.map(t => t.key)).toEqual(['vietnamese']);
		near(searches.rising[0].prevYearLevel, 50);
		expect(searches.rising[0].change).toBeCloseTo(0.6, 1);
	});

	it('lists the kinds of food posts by others named, rises only, and openings as counts', async () => {
		const { data } = await service.build(city.id, '2026-q3');
		// 102 mentions with a kind of food (the opening's two included), the ramen bar's own 30 out
		expect(data!.talked!.mentions).toBe(102);
		const talked = new Map(data!.talked!.topics.map(t => [t.key, t]));
		expect(talked.get('ramen')).toMatchObject({ mentions: 62, share: 60.8 });
		// Its parent counts the child
		expect(talked.get('japanese')).toMatchObject({ mentions: 62 });
		expect(talked.get('ramen')!.gain).toBeCloseTo(40.8, 1);
		// Döner fell on the quarter before: no "gain" on it
		expect(talked.get('kebab')?.gain).toBeUndefined();
		expect(data!.openings).toEqual({
			opened: 1,
			closed: 0,
			byTopic: [{ label: 'Ramen', opened: 1, closed: 0 }],
		});
		expect(JSON.stringify(data)).not.toContain('Brand New Noodles');
		expect(JSON.stringify(data)).not.toContain('Ramen Bar');
	});

	it("takes the breakouts from Google's rising queries, without trouble or the do-not-list", async () => {
		const { data } = await service.build(city.id, '2026-q3');
		expect(data!.breakouts).toEqual({
			from: '2025-10',
			to: '2026-09',
			queries: [
				{ query: 'mazesoba berlin', topic: 'Ramen', breakout: true },
				{ query: 'tantanmen', topic: 'Ramen', growth: 350 },
			],
		});
	});

	it('answers 404 until published, then shows the quarter and lists it in the sitemap', async () => {
		const report = await service.build(city.id, '2026-q3');
		await expect(service.published('berlin', '2026-q3')).rejects.toBeInstanceOf(
			NotFoundException,
		);
		await expect(service.publish(report.id, new Date('2026-09-30T12:00:00Z'))).rejects.toThrow(
			'A quarter is published once it is over',
		);

		await service.publish(report.id, AFTER_Q3);
		expect((await service.published('berlin', '2026-q3')).publishedAt).toEqual(AFTER_Q3);
		expect((await sitemap.getEntries('foodtrends', 1, 100)).items.map(i => i.path)).toEqual([
			'/berlin/trends/2026-q3',
		]);
		await expect(service.published('berlin', '2026-q2')).rejects.toBeInstanceOf(
			NotFoundException,
		);

		// A rebuild keeps it published
		await service.build(city.id, '2026-q3');
		expect((await service.published('berlin', '2026-q3')).publishedAt).toEqual(AFTER_Q3);

		await service.unpublish(report.id);
		await expect(service.published('berlin', '2026-q3')).rejects.toBeInstanceOf(
			NotFoundException,
		);
		expect((await sitemap.getEntries('foodtrends', 1, 100)).totalItems).toBe(0);
	});

	it('queues a pull only for a quarter that is over, one at a time', async () => {
		await expect(service.queuePull(city.id, '2026-q4', AFTER_Q3)).rejects.toThrow(
			'A quarter is pulled once it is over',
		);
		pgBoss.sendJob.mockClear();
		const report = await service.queuePull(city.id, '2026-q2', AFTER_Q3);
		expect(report.searchPull).toMatchObject({ state: 'queued' });
		expect(pgBoss.sendJob).toHaveBeenCalledWith(
			FoodTrendsSearchPullJob.jobName,
			new FoodTrendsSearchPullJob({ cityId: city.id, quarter: '2026-q2' }),
		);
		await expect(service.queuePull(city.id, '2026-q2', AFTER_Q3)).rejects.toBeInstanceOf(
			ConflictException,
		);
		// An hour later it is taken as lost and can go again
		await expect(
			service.queuePull(city.id, '2026-q2', new Date(AFTER_Q3.getTime() + 61 * 60_000)),
		).resolves.toBeTruthy();
	});

	it('keeps the stored levels when no group comes back', async () => {
		const before = (await service.find(city.id, '2026-q3'))!.searchLevels;
		apify.runActor
			.mockImplementationOnce(async () => [])
			.mockImplementationOnce(async () => {
				throw new Error('Google failed');
			});
		const report = await service.pullSearches(city.id, '2026-q3');
		expect(report.searchPull).toMatchObject({
			state: 'failed',
			note: "No group came back with pizza's searches, 1 runs failed",
		});
		expect(report.searchLevels).toEqual(before);
	});
});
