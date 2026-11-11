import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';

import { ApifyService } from 'src/modules/apify/services/apify.service.js';
import { cityFactory } from 'src/modules/cities/tests/factories/city.factory.js';
import { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';
import { fakeDurable } from 'src/modules/durable-workflows/tests/factories/durable.mock.js';
import { PgBossService } from 'src/modules/pgboss/pgboss.service.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { VenueService } from 'src/modules/venues/services/venue.service.js';
import { VenueScrapeService } from 'src/modules/venues/services/venue-scrape.service.js';
import { venueFactory } from 'src/modules/venues/tests/factories/venue.factory.js';
import { DETAIL_ITEM } from 'src/modules/venues/tests/fixtures/google-place-items.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { FakePlacesApify } from '../../atoms/places/tests/factories/places.mock.js';
import { PlacesWorkflow } from '../../atoms/places/workflows/places.workflow.js';
import { AdminRefreshVenueDetailsController } from '../controllers/admin.refresh-venue-details.controller.js';
import { VENUE_DETAILS_REFRESH_QUEUE } from '../queues/refresh-venue-details.queue.js';
import { RefreshVenueDetailsWorkflow } from '../workflows/refresh-venue-details.workflow.js';

/**
 * "Refresh from Google" on a venue's page: the route starts the one venue's run on its own queue
 * and answers the run id; the run fetches that place's detail page by its id and saves it like the
 * month's run does (the facade faked to run a started child inline).
 */
describe('RefreshVenueDetailsWorkflow.venue (pglite)', () => {
	let harness: PgliteTestingModule;
	let workflow: RefreshVenueDetailsWorkflow;
	let controller: AdminRefreshVenueDetailsController;
	let places: PlacesWorkflow;
	const apify = new FakePlacesApify();
	const durable = fakeDurable(() => [workflow, places], 'op-1');

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				RefreshVenueDetailsWorkflow,
				AdminRefreshVenueDetailsController,
				PlacesWorkflow,
				VenueScrapeService,
				VenueService,
				{ provide: ApifyService, useValue: apify },
				{ provide: DurableWorkflowsService, useValue: durable },
				{ provide: PgBossService, useValue: { sendJob: jest.fn(async () => undefined) } },
			],
		});
		workflow = harness.moduleRef.get(RefreshVenueDetailsWorkflow);
		controller = harness.moduleRef.get(AdminRefreshVenueDetailsController);
		places = harness.moduleRef.get(PlacesWorkflow);
		entityManagerManager.setEntityManager(harness.orm.em);
	});

	afterAll(async () => {
		await harness.stop();
	});

	it('starts one venue\'s refresh and saves its detail page', async () => {
		const city = await cityFactory.create({ name: 'Berlin' });
		const venue = await venueFactory.create(
			{ placeId: DETAIL_ITEM.placeId, name: 'Pinoli', reviewsCount: 500 },
			{ associations: { city } },
		);
		apify.answer = () => [DETAIL_ITEM];

		const res = await controller.refreshVenue(venue.id);
		expect(res).toEqual({ workflowId: 'fake-1' });
		expect(durable.started[0].options).toEqual({
			queue: VENUE_DETAILS_REFRESH_QUEUE,
			dedupe: venue.id,
			onDuplicate: 'return-existing',
			priority: 'high',
			attributes: { cityId: city.id, purpose: 'refresh-venue-details' },
		});
		expect(await durable.started[0].result).toEqual({ saved: 1, withPopularTimes: 1 });

		// The detail page by its place id, nothing searched, nothing new added
		expect(apify.calls).toHaveLength(1);
		expect(apify.calls[0].options).toMatchObject({ maxCostUsd: 0.5 });
		const saved = await harness.orm.em.fork().findOneOrFail(Venue, venue.id);
		expect(saved.reviewsCount).toBe(590);
		expect(saved.details?.reviewsDistribution).toMatchObject({ fiveStar: 547 });
		expect(saved.details?.popularTimesLivePercent).toBe(35);
	});

	it('answers 404 for a venue that does not exist', async () => {
		const before = durable.started.length;
		await expect(controller.refreshVenue('00000000-0000-4000-8000-000000000000')).rejects.toThrow();
		// Nothing started
		expect(durable.started).toHaveLength(before);
	});
});
