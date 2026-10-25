import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';

import type { City } from 'src/modules/cities/entities/city.entity.js';
import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { FoodTopicService } from 'src/modules/food-topics/services/food-topic.service.js';
import { VenueFoodTopicService } from 'src/modules/food-topics/services/venue-food-topic.service.js';
import { seedFoodTopics, linkFoodTopics } from 'src/modules/food-topics/tests/factories/food-topic.factory.js';
import { SearchInterestService } from 'src/modules/trends/services/search-interest.service.js';
import { TrendService } from 'src/modules/trends/services/trend.service.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { CityService } from 'src/modules/cities/services/city.service.js';
import { BrandService } from 'src/modules/venues/services/brand.service.js';
import { CompetitorService } from 'src/modules/venues/services/competitor.service.js';
import { VenueSearchRankService } from 'src/modules/venues/services/venue-search-rank.service.js';
import { VenueStatusChangeService } from 'src/modules/venues/services/venue-status-change.service.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { mockAgent } from 'src/tests/mock-agent.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { ReportHighlightsAgent } from '../agents/report-highlights.agent.js';
import { ReviewReplyAgent } from '../agents/review-reply.agent.js';
import { ReportCityService } from '../services/report-city.service.js';
import { ReportService } from '../services/report.service.js';
import { ReportConfigService } from '../services/report-config.service.js';
import { ReportTemplateService } from '../services/report-template.service.js';
import { ratingBenchmarkSentence } from '../util/rating-benchmark.js';

describe('ReportCityService.ratingBenchmarks (pglite)', () => {
	let harness: PgliteTestingModule;
	let service: ReportCityService;
	let reports: ReportService;
	let highlights: ReturnType<typeof mockAgent>;
	let city: City;
	let ramen: Venue;
	let pizza: Venue;
	let unrated: Venue;

	beforeAll(async () => {
		highlights = mockAgent({ title: 'T', headline: 'H', highlights: [], actions: [] });
		harness = await createPgliteTestingModule({
			providers: [
				ReportService,
				ReportConfigService,
				ReportTemplateService,
				CompetitorService,
				BrandService,
				CityService,
				VenueSearchRankService,
				{ provide: ReportHighlightsAgent, useValue: highlights },
				{ provide: ReviewReplyAgent, useValue: mockAgent({ replies: [] }) },
				ReportCityService,
				TrendService,
				VenueStatusChangeService,
				SearchInterestService,
				FoodTopicService,
				VenueFoodTopicService,
			],
		});
		service = harness.moduleRef.get(ReportCityService);
		reports = harness.moduleRef.get(ReportService);
		entityManagerManager.setEntityManager(harness.orm.em);
		const em = harness.orm.em;
		seedFoodTopics(em, ['ramen', 'pizza']);
		city = testCity(em, { name: 'Berlin' });

		let n = 0;
		const venue = (
			district: string,
			category: string,
			rating: number | null,
			reviewsCount = 30,
			extra: Partial<Venue> = {},
		) =>
			em.create(Venue, {
				city,
				placeId: `p${n}`,
				name: `Venue ${n++}`,
				category,
				district,
				rating,
				reviewsCount,
				...extra,
			});

		ramen = venue('Mitte', 'Ramen restaurant', 4.5, 100);
		// Mitte's five other food venues with 20+ reviews
		venue('Mitte', 'Japanese restaurant', 4.0);
		venue('Mitte', 'Japanese restaurant', 4.2);
		venue('Mitte', 'Ramen restaurant', 4.6);
		venue('Mitte', 'Pizza restaurant', 3.9);
		venue('Mitte', 'Pizza restaurant', 4.5);
		// Not peers: too few reviews, closed, not a food venue, another city
		venue('Mitte', 'Ramen restaurant', 1.0, 3);
		venue('Mitte', 'Ramen restaurant', 1.0, 200, { closed: true });
		venue('Mitte', 'Hotel', 1.0, 200);
		em.create(Venue, {
			city: testCity(em, { name: 'Wien' }),
			placeId: 'wien',
			name: 'Wiener Ramen',
			category: 'Ramen restaurant',
			district: 'Mitte',
			rating: 1.0,
			reviewsCount: 200,
		});
		// Elsewhere in the city: two more Japanese places (one ramen) and Pankow's pizza
		venue('Kreuzberg', 'Japanese restaurant', 4.4);
		venue('Kreuzberg', 'Ramen restaurant', 4.8);
		pizza = venue('Pankow', 'Pizza restaurant', 4.1, 50);
		for (const rating of [4.0, 4.2, 4.3, 3.8]) venue('Pankow', 'Pizza restaurant', rating);
		unrated = venue('Pankow', 'Pizza restaurant', null, 0);
		await em.flush();
		// The stored food-topic links, as the app's writers and refresh keep them
		await linkFoodTopics(em);
		await em.populate([ramen, pizza, unrated], ['city']);
	});

	afterAll(async () => {
		await harness.stop();
	});

	it("places a branch among its district's six venues and, its topic too thin, its parent's", async () => {
		const benchmarks = await service.ratingBenchmarks([ramen, pizza, unrated]);
		// 4.5 is ahead of 4.0, 4.2, 3.9 and ties 4.5: 3.5 of 5
		expect(benchmarks.get(ramen.id)).toEqual({
			rating: 4.5,
			district: { label: 'Mitte', median: 4.2, percentile: 70, venues: 5 },
			// Two other ramen places only: Japanese, its parent, has five (ramen ones included)
			topic: { key: 'japanese', label: 'Japanese', city: 'Berlin', median: 4.4, percentile: 60, venues: 5 },
		});
		expect(ratingBenchmarkSentence(benchmarks.get(ramen.id)!)).toBe(
			"4.5 all-time on Google: above 70 % of Mitte's 5 food venues (median 4.2), above 60 % of Berlin's 5 Japanese places (median 4.4) (venues with 20+ reviews)",
		);
	});

	it('gives no district standing with four peers, and the topic alone when it has five', async () => {
		const benchmarks = await service.ratingBenchmarks([pizza, unrated]);
		const pizzaBenchmark = benchmarks.get(pizza.id);
		expect(pizzaBenchmark?.district).toBeUndefined();
		// Pankow's four and Mitte's two pizza places
		expect(pizzaBenchmark?.topic).toMatchObject({ key: 'pizza', venues: 6, percentile: 50 });
		// Without a rating, nothing
		expect(benchmarks.has(unrated.id)).toBe(false);
	});

	it("stores each branch's benchmark at build and gives the prompt its sentence", async () => {
		const report = await reports.build(ramen.brand.id, city.id, '2026-09');
		expect(report.data.branches[0].ratingBenchmark).toMatchObject({
			rating: 4.5,
			district: { percentile: 70 },
			topic: { key: 'japanese' },
		});
		const input = JSON.parse(highlights.generate.mock.calls.at(-1)![0] as string);
		expect(input.places[0].googleRatingAgainstOthers).toBe(
			ratingBenchmarkSentence(report.data.branches[0].ratingBenchmark!),
		);
	});
});
