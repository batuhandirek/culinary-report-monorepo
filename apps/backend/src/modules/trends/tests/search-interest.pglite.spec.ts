import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';

import { ApifyService } from 'src/modules/apify/services/apify.service.js';
import type { City } from 'src/modules/cities/entities/city.entity.js';
import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { FoodTopicKindEnum } from 'src/modules/food-topics/entities/food-topic.entity.js';
import { FoodTopicService } from 'src/modules/food-topics/services/food-topic.service.js';
import { seedFoodTopics, linkFoodTopics } from 'src/modules/food-topics/tests/factories/food-topic.factory.js';
import { Mention } from 'src/modules/social/entities/mention.entity.js';
import { SocialPlatformEnum, SocialPost } from 'src/modules/social/entities/social-post.entity.js';
import { ownAccount } from 'src/modules/social/tests/factories/social-account.factory.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { AdminSearchInterestController } from '../controllers/admin.search-interest.controller.js';
import { TrendRelatedQuery } from '../entities/trend-related-query.entity.js';
import {
	SearchTermKindEnum,
	TrendSearchInterest,
} from '../entities/trend-search-interest.entity.js';
import { GOOGLE_TRENDS_ACTOR, SearchInterestService } from '../services/search-interest.service.js';
import {
	GoogleTrendsItem,
	monthlyInterest,
	queryTermKey,
	splitTrendsBudget,
	trendsQuery,
} from '../util/search-interest.js';

const week = (date: string, value: number) => ({
	date,
	timestamp: Date.parse(`${date}T00:00:00Z`) / 1000,
	value,
	isPartial: false,
});
const query = (label: string, value: number, formattedValue = String(value)) => ({
	label,
	value,
	formattedValue,
	link: `https://trends.google.com/trends/explore?q=${encodeURIComponent(label)}`,
});

// Items as `signalbench/google-trends-scraper` returns them: one per term it got, echoing the
// topic id or the text searched, weekly points with Unix-second week starts, related queries
// under `relatedQueries`
const ITEMS: GoogleTrendsItem[] = [
	{
		searchTerm: '/m/07_19', // Vietnamese cuisine
		geo: 'DE-BE',
		interestOverTime: [
			week('2026-08-02', 40),
			week('2026-08-09', 50),
			week('2026-08-30', 60), // a week starting in August counts for August
			week('2026-09-06', 70),
			week('2026-09-13', 0), // too little data: left out, not a 0
			week('2026-09-20', 70),
		],
		relatedQueries: {
			top: [
				query('vietnamese berlin', 100),
				query('vietnamese restaurant', 58),
				query('Vietnamese  Berlin', 40), // listed twice
			],
			rising: [query('pho house', 76050, 'Breakout'), query('banh mi', 250, '+250%')],
		},
	},
	{
		searchTerm: '/m/03k_qs', // Doner kebab
		geo: 'DE-BE',
		interestOverTime: [week('2026-08-02', 0), week('2026-09-06', 0)],
		relatedQueries: { top: [], rising: [] },
	},
	{
		searchTerm: 'Pho House',
		geo: 'DE-BE',
		interestOverTime: [week('2026-09-06', 12), week('2026-09-13', 14)],
	},
	// Turkish, pho and "Döner X" came back with nothing at all (the cap stopped the run, or Google
	// failed it)
];

/* Google search interest per food topic and won brand, from the Google Trends actor (mocked on
 * items as it returned them on 2026-10-18), stored per term and month; null where Google has no
 * data. */
describe('SearchInterestService (pglite)', () => {
	let harness: PgliteTestingModule;
	let service: SearchInterestService;
	let controller: AdminSearchInterestController;
	let city: City;
	let pho: Venue;
	let doner: Venue;
	const apify = { runActor: jest.fn(async (..._args: unknown[]) => ITEMS) };

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				SearchInterestService,
				FoodTopicService,
				AdminSearchInterestController,
				{ provide: ApifyService, useValue: apify },
			],
		});
		service = harness.moduleRef.get(SearchInterestService);
		controller = harness.moduleRef.get(AdminSearchInterestController);
		entityManagerManager.setEntityManager(harness.orm.em);

		const em = harness.orm.em;
		city = testCity(em, { region: 'DE-BE' });
		// Searched: kebab, its parent turkish, pho, vietnamese (pho's parent); `bowls` has no Trends id
		seedFoodTopics(em, ['kebab', 'pho', 'bowls']);
		pho = em.create(Venue, {
			city,
			placeId: 'pho',
			name: 'Pho House - Vietnamese Kitchen',
			category: 'Vietnamese restaurant',
		});
		doner = em.create(Venue, {
			city,
			placeId: 'doner',
			name: 'Döner X',
			category: 'Kebab shop',
		});
		// The brands come with the flush; Pho House's own account is linked to its brand
		await em.flush();
		const own = ownAccount(em, pho.brand, city, 'phohouse');
		let n = 0;
		const mention = (venue: Venue, date: string, cuisine: string | null, author = `c${n}`) => {
			const post = em.create(SocialPost, {
				city,
				externalId: `si-${n++}`,
				platform: SocialPlatformEnum.TIKTOK,
				url: `https://tiktok.com/si/${n}`,
				author,
				account: author === own.handle ? own : undefined,
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
			});
		};
		// August: 1 Vietnamese, 3 döner; September: 2 and 2. The venue's own post never counts.
		mention(pho, '2026-08-10', 'Viet');
		mention(doner, '2026-08-11', 'Döner');
		mention(doner, '2026-08-12', null); // the venue's Google category: kebab
		mention(doner, '2026-08-13', 'Kebap');
		mention(pho, '2026-09-10', 'Vietnamese');
		mention(pho, '2026-09-11', 'Vietnamese');
		mention(pho, '2026-09-12', 'Vietnamese', 'phohouse');
		mention(doner, '2026-09-13', 'Döner');
		mention(doner, '2026-09-14', 'Döner');
		await em.flush();
		// The stored food-topic links, as the app's writers and refresh keep them
		await linkFoodTopics(em);
	});

	afterAll(async () => {
		await harness.stop();
	});

	it('pulls the topics in Food & Drink and the won brands in all categories, twelve months in the city region', async () => {
		const res = await service.pull(city.id, '2026-09', { brands: [pho.brand, doner.brand], budgetUsd: 1 });
		expect(res).toEqual({ terms: 6, fetched: 3, withData: 2, related: 4 });

		const input = {
			geo: 'DE-BE',
			customTimeRange: '2025-10-01 2026-09-30',
			includeInterestOverTime: true,
			includeRelatedQueries: true,
			includeInterestByRegion: false,
			includeRelatedTopics: false,
		};
		expect(apify.runActor.mock.calls).toEqual([
			[
				GOOGLE_TRENDS_ACTOR,
				// Topic ids by key; each run capped at the actor's $1 floor
				{
					...input,
					searchTerms: ['/m/03k_qs', '/m/02y17j', '/m/07qr6', '/m/07_19'],
					category: '71',
				},
				{ maxCostUsd: 1, purpose: `Google Trends topics ${city.slug} 2026-09` },
			],
			[
				GOOGLE_TRENDS_ACTOR,
				// The brand names without their tagline
				{ ...input, searchTerms: ['Pho House', 'Döner X'], category: '0' },
				{ maxCostUsd: 1, purpose: `Google Trends brands ${city.slug} 2026-09` },
			],
		]);

		const rows = await harness.orm.em.find(TrendSearchInterest, { city: city.id });
		// One row per fetched term and month
		expect(rows).toHaveLength(3 * 12);
		const at = (term: string, month: string) =>
			rows.find(r => r.term === term && r.month === month)?.interest;
		expect(at('vietnamese', '2026-08')).toBe(50);
		expect(at('vietnamese', '2026-09')).toBe(70);
		// No data is null, never zero
		expect(at('vietnamese', '2025-10')).toBeNull();
		expect(at('kebab', '2026-08')).toBeNull();
		// Nothing came back: not pulled, which is not "no data"
		expect(rows.some(r => r.term === 'Döner X')).toBe(false);
		expect(rows.find(r => r.term === 'Pho House')?.brand?.id).toBe(pho.brand.id);
		expect(rows.some(r => r.term === 'turkish')).toBe(false);

		// Related queries in Google's order, each once
		const related = await harness.orm.em.find(
			TrendRelatedQuery,
			{ city: city.id },
			{ orderBy: { rising: 'asc', rank: 'asc' } },
		);
		expect(
			related.map(r => [r.term, r.month, r.rising, r.rank, r.query, r.value, r.breakout]),
		).toEqual([
			['vietnamese', '2026-09', false, 1, 'vietnamese berlin', 100, false],
			['vietnamese', '2026-09', false, 2, 'vietnamese restaurant', 58, false],
			['vietnamese', '2026-09', true, 1, 'pho house', 76050, true],
			['vietnamese', '2026-09', true, 2, 'banh mi', 250, false],
		]);
	});

	it('a second pull overwrites the months it fetched and keeps the rest', async () => {
		apify.runActor.mockResolvedValueOnce([
			{
				searchTerm: '/m/03k_qs',
				interestOverTime: [week('2026-09-06', 30), week('2026-09-13', 30)],
				relatedQueries: { top: [query('kebab berlin', 100)], rising: [] },
			},
		]);
		await service.pull(city.id, '2026-09', { brands: [pho.brand, doner.brand], budgetUsd: 1 });
		harness.orm.em.clear();
		const rows = await harness.orm.em.find(TrendSearchInterest, { city: city.id });
		expect(rows).toHaveLength(36);
		expect(rows.find(r => r.term === 'kebab' && r.month === '2026-09')?.interest).toBe(30);
		// Not returned this time: the first pull's figures and queries stay
		expect(rows.find(r => r.term === 'vietnamese' && r.month === '2026-09')?.interest).toBe(70);
		const related = await harness.orm.em.find(TrendRelatedQuery, { city: city.id });
		expect(related.filter(r => r.term === 'vietnamese')).toHaveLength(4);
		expect(related.filter(r => r.term === 'kebab').map(r => r.query)).toEqual(['kebab berlin']);
	});

	it('shows the search line next to the mention share, with both changes', async () => {
		await service.pull(city.id, '2026-09', { brands: [pho.brand, doner.brand], budgetUsd: 1 });

		const table = await controller.getSearchInterest({ cityId: city.id, month: '2026-09' });
		expect(table.months).toHaveLength(12);
		expect(table.geo).toBe('DE-BE');
		// Both at 50 % in September: by label
		expect(table.topics.map(c => c.term)).toEqual(['kebab', 'vietnamese']);
		const [second, first] = table.topics;
		expect(first).toMatchObject({
			kind: SearchTermKindEnum.TOPIC,
			term: 'vietnamese',
			label: 'Vietnamese',
			topicKind: FoodTopicKindEnum.CUISINE,
			searchChange: 0.4,
			// 25 % of August's cuisine mentions, 50 % of September's
			mentionChange: 1,
		});
		expect(first.mentionShare?.slice(-2)).toEqual([25, 50]);
		expect(first.interest.slice(-2)).toEqual([50, 70]);
		expect(first.related).toEqual({
			top: [
				{ query: 'vietnamese berlin', value: 100 },
				{ query: 'vietnamese restaurant', value: 58 },
			],
			rising: [
				{ query: 'pho house', value: 76050, breakout: true },
				{ query: 'banh mi', value: 250 },
			],
		});
		expect(second).toMatchObject({
			term: 'kebab',
			label: 'Döner & kebab',
			topicKind: FoodTopicKindEnum.DISH,
			searchChange: null,
		});
		// This pull returned none for kebab: the second pull's are replaced, not added to
		expect(second.related).toBeUndefined();
		expect(second.mentionShare?.slice(-3)).toEqual([null, 75, 50]);
		// Döner X was never fetched, so it has no row
		expect(table.brands.map(v => [v.label, v.brandId])).toEqual([['Pho House', pho.brand.id]]);

		// The report's city section: topics with Google data this month, both changes given
		expect(await service.reportDeltas(city.id, '2026-09', 'kebab')).toEqual([
			{
				key: 'vietnamese',
				label: 'Vietnamese',
				interest: 70,
				prevInterest: 50,
				searchChange: 0.4,
				share: 50,
				prevShare: 25,
				mentionChange: 1,
			},
		]);
		expect(await service.reportDeltas(city.id, '2025-01')).toEqual([]);
	});
});

describe('trendsQuery', () => {
	it('drops commas, for which Google returns nothing, and maps the item back', () => {
		expect(trendsQuery('Mama, Trattoria')).toBe('Mama Trattoria');
		expect(queryTermKey('Mama, Trattoria')).toBe('mama trattoria');
	});
});

describe('monthlyInterest', () => {
	it('leaves a month with one stray week of data null', () => {
		const m = monthlyInterest([week('2026-08-02', 41), week('2026-08-09', 0)], ['2026-08']);
		expect(m.get('2026-08')).toBeNull();
	});

	it('averages the weeks with data per month', () => {
		const m = monthlyInterest(
			[week('2026-08-02', 41), week('2026-08-09', 42)],
			['2026-07', '2026-08'],
		);
		expect([...m.values()]).toEqual([null, 41.5]);
	});
});

describe('splitTrendsBudget', () => {
	it("splits by terms, each run at the actor's $1 floor", () => {
		expect(splitTrendsBudget(2, 100, 0)).toEqual({ topics: 2, brands: 0 });
		expect(splitTrendsBudget(0.5, 0, 3)).toEqual({ topics: 0, brands: 1 });
		expect(splitTrendsBudget(6, 100, 50)).toEqual({ topics: 4, brands: 2 });
		expect(splitTrendsBudget(2, 110, 3)).toEqual({ topics: 1.95, brands: 1 });
	});
});
