import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';

import { ApifyService } from 'src/modules/apify/services/apify.service.js';
import type { City } from 'src/modules/cities/entities/city.entity.js';
import { CityService } from 'src/modules/cities/services/city.service.js';
import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { mockAgent } from 'src/tests/mock-agent.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { PressClassificationAgent } from '../agents/press-classification.agent.js';
import { Venue } from '../entities/venue.entity.js';
import { WebMention, WebMentionKindEnum, WebMentionSourceEnum } from '../entities/web-mention.entity.js';
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
const searchPage = (term: string, results: { url: string; title: string; description: string }[]) => ({
	searchQuery: { term, device: 'DESKTOP', page: 1, countryCode: 'DE' },
	organicResults: results.map((r, i) => ({ ...r, type: 'organic', position: i + 1, displayedUrl: r.url })),
	paidResults: [],
});

describe('WebMentionService (pglite)', () => {
	let harness: PgliteTestingModule;
	let service: WebMentionService;
	let city: City;
	let frieda: Venue;
	let zola: Venue;
	const runActor = jest.fn(async (actor: string, _input: any, _opts: { maxCostUsd: number }): Promise<any[]> => {
		if (actor === 'scrapewise/google-news-scraper')
			return [
				article('https://mitvergnuegen.com/brunch-neukoelln', 'Die 10 besten Brunch-Spots in Neukölln: Café Frieda und Co.'),
				article('https://www.tip-berlin.de/frieda-review', 'Café Frieda: Neuer Brunch am Weserkiez', QUERY, 'tip Berlin'),
				// The same article from two queries, an error row, and a page not naming the venue
				article('https://www.tip-berlin.de/frieda-review', 'Café Frieda: Neuer Brunch am Weserkiez', OTHER_QUERY),
				{ errorCode: 'NO_RESULTS', searchQuery: OTHER_QUERY },
				article('https://example.com/zola', 'Pizza in Kreuzberg', OTHER_QUERY),
			];
		return [
			searchPage(QUERY, [
				{ url: 'https://www.tripadvisor.de/Restaurant_Review-g187323-d1-Cafe_Frieda', title: 'Café Frieda, Berlin - Tripadvisor', description: 'Café Frieda' },
				{ url: 'https://cafefrieda.de/', title: 'Café Frieda – Brunch in Neukölln', description: 'Unsere Karte' },
				{ url: 'https://www.berlinfoodstories.com/frieda', title: 'Breakfast at Cafe Frieda', description: 'We tried the shakshuka.' },
			]),
			searchPage(OTHER_QUERY, []),
		];
	});
	const agent = mockAgent((input: unknown) => ({
		results: (JSON.parse(input as string) as { id: string; title: string }[]).map(r => ({
			id: r.id,
			kind:
				r.title.startsWith('Die 10') ? WebMentionKindEnum.LISTICLE
				: r.title.startsWith('Breakfast') ? WebMentionKindEnum.UNRELATED
				: WebMentionKindEnum.FEATURE,
			summary: `About ${r.title}`,
		})),
	}));

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				WebMentionService,
				BrandLeadScoreService,
				CityService,
				{ provide: ApifyService, useValue: { runActor } },
				{ provide: PressClassificationAgent, useValue: agent },
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
		zola = em.create(Venue, { city, placeId: 'p-zola', name: 'Zola', category: 'Pizza restaurant' });
		await em.flush();
	});

	afterAll(async () => {
		await harness.stop();
	});

	it('builds one query per venue and drops platforms, the own site and pages not naming it', () => {
		expect(pressQuery('Café Frieda | Brunch & Coffee', 'Berlin')).toBe('"Café Frieda" Berlin');
		expect(pressQuery('Berlin Burger International', 'Berlin')).toBe('"Berlin Burger International"');
		const venue = { name: 'Café Frieda', website: 'https://cafefrieda.de' };
		const result = (url: string, title: string) => ({ url, title, snippet: null });
		expect(isPressCandidate(result('https://mitvergnuegen.com/x', 'Brunch bei Café Frieda'), venue)).toBe(true);
		expect(isPressCandidate(result('https://de.tripadvisor.com/x', 'Café Frieda'), venue)).toBe(false);
		expect(isPressCandidate(result('https://shop.cafefrieda.de/x', 'Café Frieda'), venue)).toBe(false);
		expect(isPressCandidate(result('https://www.instagram.com/cafefrieda', 'Café Frieda'), venue)).toBe(false);
		expect(isPressCandidate(result('https://mitvergnuegen.com/y', 'Die besten Cafés'), venue)).toBe(false);
	});

	it('stores mentions once per URL and stamps the venues searched', async () => {
		const em = harness.orm.em;
		const now = new Date('2026-10-02T06:00:00Z');
		expect(await service.searchMonth(city, [frieda, zola], '2026-09', 3, now)).toEqual({ found: 7, saved: 3 });
		const [news, web] = runActor.mock.calls;
		expect(news[0]).toBe('scrapewise/google-news-scraper');
		expect(news[1]).toMatchObject({
			searchQueries: [QUERY, OTHER_QUERY],
			language: 'de',
			countries: ['DE'],
			dateFrom: '2026-09-01',
			dateTo: '2026-09-30',
		});
		expect(news[2].maxCostUsd).toBeCloseTo(1.8);
		expect(web[1]).toMatchObject({ queries: `${QUERY}\n${OTHER_QUERY}`, maxPagesPerQuery: 1, countryCode: 'de' });
		expect(web[2].maxCostUsd).toBeCloseTo(1.2);

		// Found again next run: nothing new
		expect(await service.searchMonth(city, [frieda, zola], '2026-09', 3, now)).toMatchObject({ saved: 0 });
		em.clear();
		const mentions = await em.find(WebMention, {}, { orderBy: { url: 'asc' } });
		expect(mentions.map(m => [m.url, m.source, m.outlet])).toEqual([
			['https://mitvergnuegen.com/brunch-neukoelln', WebMentionSourceEnum.NEWS, 'Mit Vergnügen'],
			['https://www.berlinfoodstories.com/frieda', WebMentionSourceEnum.WEB, 'berlinfoodstories.com'],
			['https://www.tip-berlin.de/frieda-review', WebMentionSourceEnum.NEWS, 'tip Berlin'],
		]);
		expect(mentions.every(m => m.venue.id === frieda.id && m.month === '2026-09')).toBe(true);
		expect((await em.findOneOrFail(Venue, { id: zola.id })).pressSearchedAt).toEqual(now);
	});

	it('classifies a venue’s mentions in one call and hands the report the press, features first', async () => {
		expect(await service.classifyMonth(city, '2026-09')).toEqual({ classified: 3 });
		expect(agent.generate).toHaveBeenCalledTimes(1);
		expect(agent.generate.mock.calls[0][1]).toEqual({ venueName: 'Café Frieda', district: 'Neukölln', cityName: 'Berlin' });
		const press = await service.forReport(frieda.id, '2026-09');
		expect(press.map(m => m.kind)).toEqual([WebMentionKindEnum.FEATURE, WebMentionKindEnum.LISTICLE]);
		expect(press[0].summary).toBe('About Café Frieda: Neuer Brunch am Weserkiez');
	});

	it('gives the lead score a press signal: known for searched venues only', async () => {
		const em = harness.orm.em;
		const other = em.create(Venue, { city, placeId: 'p-other', name: 'Nie Gesucht', category: 'Bar' });
		await em.flush();
		await harness.moduleRef.get(BrandLeadScoreService).scoreAll('2026-09', city.id);
		em.clear();
		// The score is on each venue's brand
		const [f, z, o] = await Promise.all(
			[frieda, zola, other].map(async v => (await em.findOneOrFail(Venue, { id: v.id }, { populate: ['brand'] })).brand),
		);
		expect(f.leadSignals?.press).toMatchObject({ value: 1, weight: 0.05, inputs: { features: 1, listicles: 1 } });
		expect(z.leadSignals?.press?.value).toBe(0);
		expect(o.leadSignals?.press?.value ?? null).toBeNull();
		expect(o.leadSignals?.missing).toContain('press not searched');
		expect(f.leadSignals?.missing).not.toContain('press not searched');
	});
});
