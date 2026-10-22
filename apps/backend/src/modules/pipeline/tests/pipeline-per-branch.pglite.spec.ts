import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';

import type { City } from 'src/modules/cities/entities/city.entity.js';
import { CityService } from 'src/modules/cities/services/city.service.js';
import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { ProspectQueryService } from 'src/modules/outreach/services/prospect-query.service.js';
import { MentionMatchingService } from 'src/modules/social/services/mention-matching.service.js';
import { PostCommentService } from 'src/modules/social/services/post-comment.service.js';
import { SocialScrapeService } from 'src/modules/social/services/social-scrape.service.js';
import type { Brand } from 'src/modules/venues/entities/brand.entity.js';
import { BrandCompetitor } from 'src/modules/venues/entities/brand-competitor.entity.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { BrandService } from 'src/modules/venues/services/brand.service.js';
import { CompetitorService } from 'src/modules/venues/services/competitor.service.js';
import { VenueBusynessService } from 'src/modules/venues/services/venue-busyness.service.js';
import { VenueDeliveryService } from 'src/modules/venues/services/venue-delivery.service.js';
import { VenueSearchRankService } from 'src/modules/venues/services/venue-search-rank.service.js';
import { WebMentionService } from 'src/modules/venues/services/web-mention.service.js';
import { brandFactory } from 'src/modules/venues/tests/factories/brand.factory.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { PipelineStepEnum } from '../constants/pipeline.constant.js';
import { PipelineRun, PipelineRunStatusEnum } from '../entities/pipeline-run.entity.js';
import { PipelineService } from '../services/pipeline.service.js';

/* A chain with three open branches in a city: every branch's place figures in one monthly run,
 * the searches by name once for the brand. Actors mocked at the services that run them. */

type Names = { name: string }[];

describe('PipelineService: every branch of a report brand (pglite)', () => {
	let harness: PgliteTestingModule;
	let city: City;
	let chain: Brand;
	const topBrandIds = jest.fn<(month: string, top: number, cityId: string) => Promise<string[]>>();
	const track = jest.fn<(city: unknown, month: string, venues: Names, budgetUsd: number) => Promise<unknown>>();
	const sample = jest.fn<(venues: Names, budgetUsd: number) => Promise<Record<string, number>>>();
	const scrape = jest.fn<(venues: Names, city: unknown, month: string, budgetUsd: number) => Promise<unknown>>();
	const searchMonth = jest.fn<(city: unknown, venues: Names, month: string, budgetUsd: number) => Promise<unknown>>();
	const classifyMonth = jest.fn(async () => ({ classified: 0 }));
	const scrapeVenueSocial = jest.fn<(opts: { venues: Names }) => Promise<unknown>>();
	const topPosts = jest.fn<(brands: Brand[]) => Promise<unknown[]>>();
	const scrapeComments = jest.fn(async () => ({ posts: 0 }));

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				BrandService,
				CityService,
				PipelineService,
				ProspectQueryService,
				CompetitorService,
				{ provide: MentionMatchingService, useValue: { topBrandIds } },
				{ provide: VenueSearchRankService, useValue: { track } },
				{ provide: VenueBusynessService, useValue: { sample } },
				{ provide: VenueDeliveryService, useValue: { scrape } },
				{ provide: WebMentionService, useValue: { searchMonth, classifyMonth } },
				{ provide: SocialScrapeService, useValue: { scrapeVenueSocial, scrapeComments } },
				{ provide: PostCommentService, useValue: { topPosts } },
			],
		});
		entityManagerManager.setEntityManager(harness.orm.em);
		const em = harness.orm.em;
		city = testCity(em);
		chain = await brandFactory.create({ name: 'Burgermeister' });
		const branch = (name: string, reviewsCount: number, extra: Partial<Venue> = {}) =>
			em.create(Venue, { city, placeId: `pb-${name}`, name, brand: chain, reviewsCount, ...extra });
		branch('Burgermeister Schlesisches Tor', 17000);
		branch('Burgermeister Kotti', 8000);
		branch('Burgermeister Zoo', 4000);
		branch('Burgermeister Wedding', 900, { closed: true });
		const rival = em.create(Venue, { city, placeId: 'pb-rival', name: 'Rival' });
		await em.flush();
		em.create(BrandCompetitor, { brand: chain, venue: rival });
		await em.flush();
		topBrandIds.mockResolvedValue([chain.id]);
		for (const fn of [track, scrape, searchMonth, scrapeVenueSocial]) fn.mockResolvedValue({});
		sample.mockResolvedValue({ requested: 4 });
		topPosts.mockResolvedValue([]);
	});

	afterAll(async () => {
		await harness.stop();
	});

	const run = async (step: PipelineStepEnum) => {
		const em = harness.orm.em;
		const row = em.create(PipelineRun, { city, step, month: '2026-09', params: {}, status: PipelineRunStatusEnum.QUEUED });
		await em.flush();
		await harness.moduleRef.get(PipelineService).execute(row.id);
		em.clear();
		expect((await em.findOneOrFail(PipelineRun, { id: row.id })).status).toBe(PipelineRunStatusEnum.SUCCEEDED);
	};
	const names = (venues: Names) => venues.map(v => v.name).sort();
	const OPEN = ['Burgermeister Kotti', 'Burgermeister Schlesisches Tor', 'Burgermeister Zoo'];

	it('tracks search ranks, samples busyness and scrapes delivery for all three open branches', async () => {
		await run(PipelineStepEnum.TRACK_SEARCH_RANKS);
		expect(names(track.mock.calls[0][2])).toEqual(OPEN);
		// The default budget makes room for every branch
		expect(track.mock.calls[0][3]).toBe(4);

		await run(PipelineStepEnum.SAMPLE_BUSYNESS);
		expect(names(sample.mock.calls[0][0])).toEqual([...OPEN, 'Rival'].sort());

		await run(PipelineStepEnum.SCRAPE_DELIVERY);
		expect(names(scrape.mock.calls[0][0])).toEqual([...OPEN, 'Rival'].sort());
	});

	it('searches the brand by its name once: social search and comments one venue or brand, press grouped by brand', async () => {
		await run(PipelineStepEnum.SCRAPE_VENUE_SOCIAL);
		expect(scrapeVenueSocial.mock.calls[0][0].venues).toHaveLength(1);

		await run(PipelineStepEnum.SCRAPE_COMMENTS);
		expect(topPosts.mock.calls[0][0].map(b => b.id)).toEqual([chain.id]);

		// Every branch goes in, so each is stamped searched; `searchMonth` runs one query a brand
		await run(PipelineStepEnum.SCRAPE_PRESS);
		expect(names(searchMonth.mock.calls[0][1])).toEqual(OPEN);
	});
});
