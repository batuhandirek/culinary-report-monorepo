import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { ApifyService } from 'src/modules/apify/services/apify.service.js';
import type { City } from 'src/modules/cities/entities/city.entity.js';
import { CityService } from 'src/modules/cities/services/city.service.js';
import { cityFactory } from 'src/modules/cities/tests/factories/city.factory.js';
import { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';
import { fakeDurable } from 'src/modules/durable-workflows/tests/factories/durable.mock.js';
import { PgBossService } from 'src/modules/pgboss/pgboss.service.js';
import { Brand } from 'src/modules/venues/entities/brand.entity.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { BrandAutoMergeJob } from 'src/modules/venues/jobs/brand-auto-merge.job.js';
import { BrandService } from 'src/modules/venues/services/brand.service.js';
import { VenueService } from 'src/modules/venues/services/venue.service.js';
import { VenueScrapeService } from 'src/modules/venues/services/venue-scrape.service.js';
import { brandFactory } from 'src/modules/venues/tests/factories/brand.factory.js';
import { venueFactory } from 'src/modules/venues/tests/factories/venue.factory.js';
import { BURGERMEISTER_SEARCH_ITEMS } from 'src/modules/venues/tests/fixtures/brand-search-items.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { FakePlacesApify } from '../../atoms/places/tests/factories/places.mock.js';
import { PlacesWorkflow } from '../../atoms/places/workflows/places.workflow.js';
import { AdminBrandBranchSearchController } from '../controllers/admin.brand-branch-search.controller.js';
import { BRAND_BRANCH_SEARCH_QUEUE } from '../queues/brand-branch-search.queue.js';
import {
	type BranchSearchResult,
	BrandBranchSearchWorkflow,
} from '../workflows/brand-branch-search.workflow.js';

/**
 * Branches found by a brand search, as the operation runs it (the facade faked to run a started
 * child inline): one `places.run` of the names on the city's grid, every place saved, the ones on
 * the brand's site joined, the brand stamped; "Find branches" starting one brand's run from the
 * route, and the quarter's run covering the city's chains.
 */
describe('BrandBranchSearchWorkflow (pglite)', () => {
	let harness: PgliteTestingModule;
	let workflow: BrandBranchSearchWorkflow;
	let controller: AdminBrandBranchSearchController;
	let places: PlacesWorkflow;
	let brandService: BrandService;
	let berlin: City;
	const apify = new FakePlacesApify();
	const durable = fakeDurable(() => [workflow, places], 'op-1');
	const sendJob = jest.fn(async (..._args: unknown[]) => undefined);

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				BrandBranchSearchWorkflow,
				AdminBrandBranchSearchController,
				PlacesWorkflow,
				BrandService,
				CityService,
				VenueScrapeService,
				VenueService,
				{ provide: ApifyService, useValue: apify },
				{ provide: DurableWorkflowsService, useValue: durable },
				{ provide: PgBossService, useValue: { sendJob } },
			],
		});
		workflow = harness.moduleRef.get(BrandBranchSearchWorkflow);
		controller = harness.moduleRef.get(AdminBrandBranchSearchController);
		places = harness.moduleRef.get(PlacesWorkflow);
		brandService = harness.moduleRef.get(BrandService);
		entityManagerManager.setEntityManager(harness.orm.em);
		berlin = await cityFactory.create({ name: 'Berlin', nameStopwords: ['berlin'] });
	});

	afterAll(async () => {
		await harness.stop();
	});

	beforeEach(async () => {
		const em = harness.orm.em;
		await em.nativeDelete(Venue, {});
		await em.nativeDelete(Brand, {});
		em.clear();
		apify.reset();
		sendJob.mockClear();
		durable.started.length = 0;
	});

	const branch = (
		name: string,
		reviewsCount: number,
		extra: Partial<Venue> = {},
		brand?: Brand,
	) =>
		venueFactory.build(
			{ name, reviewsCount, category: 'Hamburger restaurant', ...extra },
			{ associations: { city: berlin, ...(brand && { brand }) } },
		);
	const brandOf = async (venue: Venue) =>
		(
			await harness.orm.em
				.fork()
				.findOneOrFail(Venue, { id: venue.id }, { populate: ['brand'] })
		).brand;

	it('"Find branches" starts one brand\'s search, saves every place, and the ones on the brand\'s site join it', async () => {
		const brand = await brandFactory.create({ name: 'Burgermeister' });
		const first = branch(
			'Burgermeister',
			2330,
			{ placeId: BURGERMEISTER_SEARCH_ITEMS[10].placeId },
			brand,
		);
		await harness.orm.em.flush();
		apify.answer = () => BURGERMEISTER_SEARCH_ITEMS;

		// The route only starts the run, one in flight per brand and city, ahead of the pipeline's
		// runs (an admin waits); the page polls for the stamp
		await controller.searchBrandBranches(brand.id, { cityId: berlin.id });
		expect(durable.started[0].options).toEqual({
			queue: BRAND_BRANCH_SEARCH_QUEUE,
			dedupe: `${brand.id}:${berlin.id}`,
			onDuplicate: 'return-existing',
			priority: 'high',
			attributes: { cityId: berlin.id, purpose: 'brand-branch-search' },
		});
		const result = (await durable.started[0].result) as BranchSearchResult;

		expect(apify.calls).toHaveLength(1);
		expect(apify.calls[0].actor).toBe('compass/crawler-google-places');
		expect(apify.calls[0].input).toMatchObject({
			searchStringsArray: ['Burgermeister'],
			locationQuery: 'Berlin, Germany',
			maxCrawledPlacesPerSearch: 40,
		});
		expect(apify.calls[0].options).toMatchObject({ maxCostUsd: 1, ownerWorkflowId: 'op-1' });
		// Every Burgermeister on burgermeister.com joined: nothing is left to offer
		expect(result).toEqual({ brands: 1, found: 40, saved: 40, candidates: 0 });

		// One branch is no chain: the bigger branch's brand may be the one that stays
		const chain = await brandService.get((await brandOf(first)).id);
		const names = chain.branches.getItems().map(v => v.name);
		expect(names).toHaveLength(15);
		expect(names).toContain('Burgermeister Kottbusser Tor');
		expect(names).not.toContain("Golt'z Burger");
		expect(names).not.toContain('Peter Pane');
		// A grocery store with the name is no food venue
		expect(names).not.toContain('Burgermeister Produktion');
		expect(Object.keys(chain.branchesSearchedAt)).toEqual([berlin.id]);
		// A brand search saves every place it returns, as a lookup
		expect(await harness.orm.em.fork().count(Venue, { city: berlin })).toBe(40);
		// The save queued the city's merge too: it finds nothing left to do
		expect(sendJob).toHaveBeenCalledWith(
			BrandAutoMergeJob.jobName,
			new BrandAutoMergeJob({ cityId: berlin.id }),
			{ singletonKey: berlin.id },
		);
	});

	it("the quarter's run searches every chain with a branch in the city on the step's budget", async () => {
		const chain = await brandFactory.create({ name: 'Peter Pane' });
		branch('Peter Pane Mitte', 900, { placeId: 'pp-1' }, chain);
		branch('Peter Pane Neukölln', 700, { placeId: 'pp-2' }, chain);
		// A brand of one branch is no chain
		branch('Lily Burger', 50, { placeId: 'lily' });
		await harness.orm.em.flush();

		const result = await workflow.month(berlin.id, '2026-10');

		expect(apify.calls[0].input).toMatchObject({
			searchStringsArray: ['Peter Pane'],
			locationQuery: 'Berlin, Germany',
			maxCrawledPlacesPerSearch: 40,
		});
		expect(apify.calls[0].options).toMatchObject({ maxCostUsd: 2 });
		expect(result).toEqual({ brands: 1, found: 0, saved: 0, candidates: 0 });
		const stamped = await harness.orm.em.fork().findOneOrFail(Brand, chain.id);
		expect(Object.keys(stamped.branchesSearchedAt)).toEqual([berlin.id]);
	});

	it('searches nothing for a city without chains', async () => {
		branch('Lonely Burger', 50, { placeId: 'lonely' });
		await harness.orm.em.flush();
		expect(await workflow.month(berlin.id, '2026-10')).toEqual({
			brands: 0,
			found: 0,
			saved: 0,
			candidates: 0,
		});
		expect(apify.calls).toHaveLength(0);
	});
});
