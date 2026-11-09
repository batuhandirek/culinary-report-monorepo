import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';
import _ from 'lodash';

import { runActorCallRef } from 'src/modules/apify/actors/actor.js';
import { ApifyService } from 'src/modules/apify/services/apify.service.js';
import { FakeApify } from 'src/modules/apify/tests/factories/fake-apify.js';
import type { City } from 'src/modules/cities/entities/city.entity.js';
import { CityService } from 'src/modules/cities/services/city.service.js';
import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { pressMessage } from 'src/modules/pipeline/classify-press/util/press-message.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { mockAgent } from 'src/tests/mock-agent.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { Brand } from '../entities/brand.entity.js';
import { Venue } from '../entities/venue.entity.js';
import {
	WebMention,
	WebMentionKindEnum,
	WebMentionSourceEnum,
} from '../entities/web-mention.entity.js';
import { BrandLeadScoreService } from '../services/brand-lead-score.service.js';
import { WebMentionService } from '../services/web-mention.service.js';
import { isPressCandidate, pressQuery } from '../util/web-mentions.js';

const QUERY = '"Café Frieda" Berlin';
const OTHER_QUERY = '"Zola" Berlin';

// Items in the shape `scrapewise/google-news-scraper` documents
const article = (url: string, title: string, searchQuery = QUERY, source = 'Mit Vergnügen') => ({
	type: 'article',
	title,
	source,
	sourceUrl: 'https://mitvergnuegen.com',
	publishedAt: '2026-09-18T08:00:00Z',
	url,
	googleNewsUrl: 'https://news.google.com/rss/articles/CBMi',
	originalUrlResolved: true,
	description: `${title}. Wir waren da.`,
	rank: 1,
	searchQuery,
	country: 'DE',
	language: 'de',
	input: `search:${searchQuery}`,
});

// One page in the shape `apify/google-search-scraper` documents
const searchPage = (
	term: string,
	results: { url: string; title: string; description: string }[],
) => ({
	searchQuery: { term, device: 'DESKTOP', page: 1, countryCode: 'DE' },
	organicResults: results.map((r, i) => ({
		...r,
		type: 'organic',
		position: i + 1,
		displayedUrl: r.url,
	})),
	paidResults: [],
});

describe('WebMentionService (pglite)', () => {
	let harness: PgliteTestingModule;
	let service: WebMentionService;
	let city: City;
	let frieda: Venue;
	let zola: Venue;
	const apify = new FakeApify<any>();
	apify.answer = (_input: any, actor: string) => {
		{
			if (actor === 'scrapewise/google-news-scraper')
				return [
					article(
						'https://mitvergnuegen.com/brunch-neukoelln',
						'Die 10 besten Brunch-Spots in Neukölln: Café Frieda und Co.',
					),
					article(
						'https://www.tip-berlin.de/frieda-review',
						'Café Frieda: Neuer Brunch am Weserkiez',
						QUERY,
						'tip Berlin',
					),
					// The same article from two queries, an error row, and a page not naming the venue
					article(
						'https://www.tip-berlin.de/frieda-review',
						'Café Frieda: Neuer Brunch am Weserkiez',
						OTHER_QUERY,
					),
					{ errorCode: 'NO_RESULTS', searchQuery: OTHER_QUERY },
					article('https://example.com/zola', 'Pizza in Kreuzberg', OTHER_QUERY),
				];
			return [
				searchPage(QUERY, [
					{
						url: 'https://www.tripadvisor.de/Restaurant_Review-g187323-d1-Cafe_Frieda',
						title: 'Café Frieda, Berlin - Tripadvisor',
						description: 'Café Frieda',
					},
					{
						url: 'https://cafefrieda.de/',
						title: 'Café Frieda – Brunch in Neukölln',
						description: 'Unsere Karte',
					},
					{
						url: 'https://www.berlinfoodstories.com/frieda',
						title: 'Breakfast at Cafe Frieda',
						description: 'We tried the shakshuka.',
					},
				]),
				searchPage(OTHER_QUERY, []),
			];
		}
	};
	/** As the `scrape-press` run does: the plan, the two searches as children, the save */
	const searchMonth = async (venues: Venue[], month: string, budgetUsd: number, now: Date) => {
		const plan = service.planMonth(city, venues, month, budgetUsd);
		const news = plan.news ? await runActorCallRef(apify, plan.news) : null;
		const web = plan.web ? await runActorCallRef(apify, plan.web) : null;
		return service.saveMonth(
			plan,
			{ news: news?.recordId ?? null, web: web?.recordId ?? null },
			now,
		);
	};
	// The classifier, one page a call (the pipeline's `classify-press` calls it; here its pieces plainly)
	const agent = mockAgent((input: unknown) => {
		const { title } = JSON.parse(input as string) as { title: string };
		return {
			kind:
				title.startsWith('Die 10') ? WebMentionKindEnum.LISTICLE
				: title.startsWith('Breakfast') ? WebMentionKindEnum.UNRELATED
				: WebMentionKindEnum.FEATURE,
			summary: ` About ${title} `,
		};
	});

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				WebMentionService,
				BrandLeadScoreService,
				CityService,
				{ provide: ApifyService, useValue: apify },
			],
		});
		service = harness.moduleRef.get(WebMentionService);
		entityManagerManager.setEntityManager(harness.orm.em);
		const em = harness.orm.em;
		city = testCity(em);
		frieda = em.create(Venue, {
			city,
			placeId: 'p-frieda',
			name: 'Café Frieda',
			district: 'Neukölln',
			category: 'Cafe',
			website: 'https://www.cafefrieda.de/',
		});
		zola = em.create(Venue, {
			city,
			placeId: 'p-zola',
			name: 'Zola',
			category: 'Pizza restaurant',
		});
		await em.flush();
	});

	afterAll(async () => {
		await harness.stop();
	});

	it('builds one query per venue and drops platforms, the own site and pages not naming it', () => {
		expect(pressQuery('Café Frieda | Brunch & Coffee', 'Berlin')).toBe('"Café Frieda" Berlin');
		expect(pressQuery('Berlin Burger International', 'Berlin')).toBe(
			'"Berlin Burger International"',
		);
		const venue = { name: 'Café Frieda', website: 'https://cafefrieda.de' };
		const result = (url: string, title: string) => ({ url, title, snippet: null });
		expect(
			isPressCandidate(
				result('https://mitvergnuegen.com/x', 'Brunch bei Café Frieda'),
				venue,
			),
		).toBe(true);
		expect(isPressCandidate(result('https://de.tripadvisor.com/x', 'Café Frieda'), venue)).toBe(
			false,
		);
		expect(isPressCandidate(result('https://shop.cafefrieda.de/x', 'Café Frieda'), venue)).toBe(
			false,
		);
		expect(
			isPressCandidate(result('https://www.instagram.com/cafefrieda', 'Café Frieda'), venue),
		).toBe(false);
		expect(
			isPressCandidate(result('https://mitvergnuegen.com/y', 'Die besten Cafés'), venue),
		).toBe(false);
	});

	it('stores mentions once per URL and stamps the venues searched', async () => {
		const em = harness.orm.em;
		const now = new Date('2026-10-02T06:00:00Z');
		expect(await searchMonth([frieda, zola], '2026-09', 3, now)).toEqual({
			found: 7,
			saved: 3,
		});
		const [news, web] = apify.calls;
		expect(news.actor).toBe('scrapewise/google-news-scraper');
		expect(news.input).toMatchObject({
			searchQueries: [QUERY, OTHER_QUERY],
			language: 'de',
			countries: ['DE'],
			dateFrom: '2026-09-01',
			dateTo: '2026-09-30',
		});
		expect(news.options.maxCostUsd).toBeCloseTo(1.8);
		expect(web.input).toMatchObject({
			queries: `${QUERY}\n${OTHER_QUERY}`,
			maxPagesPerQuery: 1,
			countryCode: 'de',
		});
		expect(web.options.maxCostUsd).toBeCloseTo(1.2);

		// Found again next run: nothing new
		expect(await searchMonth([frieda, zola], '2026-09', 3, now)).toMatchObject({
			saved: 0,
		});
		em.clear();
		const mentions = await em.find(WebMention, {}, { orderBy: { url: 'asc' } });
		expect(mentions.map(m => [m.url, m.source, m.outlet])).toEqual([
			[
				'https://mitvergnuegen.com/brunch-neukoelln',
				WebMentionSourceEnum.NEWS,
				'Mit Vergnügen',
			],
			[
				'https://www.berlinfoodstories.com/frieda',
				WebMentionSourceEnum.WEB,
				'berlinfoodstories.com',
			],
			['https://www.tip-berlin.de/frieda-review', WebMentionSourceEnum.NEWS, 'tip Berlin'],
		]);
		expect(mentions.every(m => m.venue.id === frieda.id && m.month === '2026-09')).toBe(true);
		expect((await em.findOneOrFail(Venue, { id: zola.id })).pressSearchedAt).toEqual(now);
	});

	it('hands each unclassified page over as the classifier reads it, stores its verdict, and gives the report the press, features first', async () => {
		const ids = await service.unclassifiedIds(city.id, 10);
		expect(ids).toHaveLength(3);
		for (const id of ids) {
			const page = (await service.pageForClassifying(id))!;
			const res = await agent.generate(pressMessage(page), { cityName: page.cityName });
			await service.saveClassification(
				id,
				res.object as { kind: WebMentionKindEnum; summary: string },
			);
		}
		expect(await service.unclassifiedIds(city.id, 10)).toEqual([]);
		expect(await service.pageForClassifying(ids[0])).toBeNull();
		expect(agent.generate).toHaveBeenCalledTimes(3);
		// Told the venue, its district and the page; the city in the context
		const asked = agent.generate.mock.calls.map(([input]) => JSON.parse(input as string));
		expect(asked.find(a => a.title.startsWith('Café Frieda:'))).toEqual({
			venue: 'Café Frieda',
			district: 'Neukölln',
			title: 'Café Frieda: Neuer Brunch am Weserkiez',
			outlet: 'tip Berlin',
			snippet: 'Café Frieda: Neuer Brunch am Weserkiez. Wir waren da.',
		});
		expect(
			agent.generate.mock.calls.every(([, context]) =>
				_.isEqual(context, { cityName: 'Berlin' }),
			),
		).toBe(true);
		// The brand's press: found under any of its branches
		const press = await service.forReport(frieda.brand.id, city.id, '2026-09');
		expect(press.map(m => m.kind)).toEqual([
			WebMentionKindEnum.FEATURE,
			WebMentionKindEnum.LISTICLE,
		]);
		expect(press[0].summary).toBe('About Café Frieda: Neuer Brunch am Weserkiez');
	});

	it('gives the lead score a press signal: known for searched venues only', async () => {
		const em = harness.orm.em;
		const other = em.create(Venue, {
			city,
			placeId: 'p-other',
			name: 'Nie Gesucht',
			category: 'Bar',
		});
		await em.flush();
		await harness.moduleRef.get(BrandLeadScoreService).scoreAll('2026-09', city.id);
		em.clear();
		// The score is on each venue's brand
		const [f, z, o] = await Promise.all(
			[frieda, zola, other].map(
				async v =>
					(await em.findOneOrFail(Venue, { id: v.id }, { populate: ['brand'] })).brand,
			),
		);
		expect(f.leadSignals?.press).toMatchObject({
			value: 1,
			weight: 0.05,
			inputs: { features: 1, listicles: 1 },
		});
		expect(z.leadSignals?.press?.value).toBe(0);
		expect(o.leadSignals?.press?.value ?? null).toBeNull();
		expect(o.leadSignals?.missing).toContain('press not searched');
		expect(f.leadSignals?.missing).not.toContain('press not searched');
	});

	it('searches a chain once under its name, on its first branch, and stamps every branch', async () => {
		const em = harness.orm.em;
		const brand = em.create(Brand, { name: 'Brammibal’s', key: 'brammibals' });
		const [first, second] = ['Brammibal’s Donuts Kreuzberg', 'Brammibal’s Donuts Neukölln'].map(
			(name, i) =>
				em.create(Venue, {
					city,
					placeId: `p-bramm-${i}`,
					name,
					brand,
					category: 'Donut shop',
				}),
		);
		await em.flush();
		apify.calls.length = 0;
		const now = new Date('2026-10-03T06:00:00Z');

		await searchMonth([first, second], '2026-09', 3, now);

		const [news, web] = apify.calls;
		expect(news.input.searchQueries).toEqual([pressQuery('Brammibal’s', city.name)]);
		expect(web.input.queries).toBe(pressQuery('Brammibal’s', city.name));
		em.clear();
		for (const v of [first, second])
			expect((await em.findOneOrFail(Venue, { id: v.id })).pressSearchedAt).toEqual(now);
	});
});
