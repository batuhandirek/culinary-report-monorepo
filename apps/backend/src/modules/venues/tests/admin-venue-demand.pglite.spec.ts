import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';

import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { DishNameService } from 'src/modules/feedback/services/dish-name.service.js';
import { TopicService } from 'src/modules/topics/services/topic.service.js';
import { seedTopics } from 'src/modules/topics/tests/factories/topic.factory.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { AdminVenuesController } from '../controllers/admin.venues.controller.js';
import { MenuItem } from '../entities/menu-item.entity.js';
import { Venue } from '../entities/venue.entity.js';
import { VenueBusyness } from '../entities/venue-busyness.entity.js';
import { DeliveryPlatformEnum, VenueDeliveryListing } from '../entities/venue-delivery-listing.entity.js';
import { ReservationPlatformEnum, VenueReservationSample } from '../entities/venue-reservation-sample.entity.js';
import { VenueBusynessService } from '../services/venue-busyness.service.js';
import { VenueDeliveryService } from '../services/venue-delivery.service.js';
import { VenueReservationService } from '../services/venue-reservation.service.js';

describe('GET /admin/venues/:id/demand (pglite)', () => {
	let harness: PgliteTestingModule;

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				AdminVenuesController,
				VenueBusynessService,
				VenueReservationService,
				VenueDeliveryService,
				DishNameService,
				TopicService,
			],
		});
		entityManagerManager.setEntityManager(harness.orm.em);
	});

	afterAll(async () => {
		await harness.stop();
	});

	it('lists the samples newest first and the listings with their latest menu', async () => {
		const em = harness.orm.em;
		const venue = em.create(Venue, { city: testCity(em), placeId: 'demand', name: 'Demand' });
		em.create(VenueBusyness, { venue, sampledAt: new Date('2026-10-08T17:00:00Z'), histogram: null });
		em.create(VenueBusyness, {
			venue,
			sampledAt: new Date('2026-10-10T17:00:00Z'),
			histogram: { Sa: [{ hour: 20, occupancyPercent: 100 }] },
			busynessIndex: 100,
			livePercent: 85,
		});
		em.create(VenueReservationSample, {
			venue,
			platform: ReservationPlatformEnum.OPENTABLE,
			sampledAt: new Date('2026-10-08T17:00:00Z'),
			forDate: '2026-10-09',
			slotsOpen: 3,
			slotsAsked: 16,
			partySize: 2,
		});
		const listing = em.create(VenueDeliveryListing, {
			venue,
			platform: DeliveryPlatformEnum.WOLT,
			url: 'https://wolt.com/en/deu/berlin/restaurant/demand',
			rating: 4.4,
			fetchedAt: new Date('2026-10-02'),
		});
		em.create(MenuItem, { listing, month: '2026-09', name: 'Döner', price: 7.5 });
		await em.flush();

		const res = await harness.moduleRef.get(AdminVenuesController).getVenueDemand(venue.id);

		expect(res.busyness.map(b => [b.busynessIndex, b.livePercent, !!b.histogram])).toEqual([
			[100, 85, true],
			[undefined, undefined, false],
		]);
		expect(res.reservations).toEqual([
			expect.objectContaining({ platform: 'opentable', forDate: '2026-10-09', slotsOpen: 3, partySize: 2 }),
		]);
		expect(res.delivery).toEqual([
			expect.objectContaining({ platform: 'wolt', rating: 4.4, menuMonth: '2026-09', menuItems: 1 }),
		]);
	});
	it('PATCH /admin/venues/:id sets and clears the booking link, leaving it when absent', async () => {
		const em = harness.orm.em;
		const venue = em.create(Venue, { city: testCity(em), placeId: 'booking', name: 'Booking' });
		await em.flush();
		const controller = harness.moduleRef.get(AdminVenuesController);

		const url = 'https://www.thefork.de/restaurant/booking-r42';
		expect((await controller.updateVenue(venue.id, { bookingUrl: url })).bookingUrl).toBe(url);
		expect((await controller.updateVenue(venue.id, {})).bookingUrl).toBe(url);
		await expect(controller.updateVenue(venue.id, { bookingUrl: 'https://example.com/book' })).rejects.toThrow();
		expect((await controller.updateVenue(venue.id, { bookingUrl: null })).bookingUrl).toBeUndefined();
	});

	it("links the review tags that name a kind of food to their topic", async () => {
		const em = harness.orm.em;
		seedTopics(em, ['kebab']);
		const venue = em.create(Venue, {
			city: testCity(em),
			placeId: 'tags',
			name: 'Tags',
			details: {
				reviewsTags: [
					{ title: 'Dürüm', count: 7 },
					{ title: 'waiting time', count: 3 },
				],
			},
		});
		await em.flush();

		const res = await harness.moduleRef.get(AdminVenuesController).getVenue(venue.id);
		expect(res.reviewTagTopics).toEqual([{ title: 'Dürüm', key: 'kebab', label: 'Döner & kebab' }]);
	});
});
