import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';

import type { City } from 'src/modules/cities/entities/city.entity.js';
import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { MenuItem } from 'src/modules/venues/entities/menu-item.entity.js';
import type { Venue } from 'src/modules/venues/entities/venue.entity.js';
import {
	DeliveryPlatformEnum,
	VenueDeliveryListing,
} from 'src/modules/venues/entities/venue-delivery-listing.entity.js';
import { venueFactory } from 'src/modules/venues/tests/factories/venue.factory.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { FoodTopicService } from '../services/food-topic.service.js';
import { MenuTopicService } from '../services/menu-topic.service.js';
import { VenueFoodTopicService } from '../services/venue-food-topic.service.js';

import { seedFoodTopics, linkFoodTopics } from './factories/food-topic.factory.js';

/* Delivery menus read by food topic: who sells it at what price, a venue's tags from its menu and
 * Google's review tags, and its price position by its own kind of food. */
describe('MenuTopicService (pglite)', () => {
	let harness: PgliteTestingModule;
	let service: MenuTopicService;
	let tagger: VenueFoodTopicService;
	let city: City;
	const venues: Record<string, Venue> = {};

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [FoodTopicService, VenueFoodTopicService, MenuTopicService],
		});
		service = harness.moduleRef.get(MenuTopicService);
		tagger = harness.moduleRef.get(VenueFoodTopicService);
		entityManagerManager.setEntityManager(harness.orm.em);
		const em = harness.orm.em;
		seedFoodTopics(em);
		city = testCity(em);
		const other = testCity(em, { name: 'Hamburg' });
		const venue = (key: string, params: Partial<Venue>, inCity = city) =>
			(venues[key] = venueFactory.build({ name: key, ...params }, { associations: { city: inCity } }));
		const listings = new Map<Venue, VenueDeliveryListing>();
		const menu = (v: Venue, month: string, items: [string, number, string?][]) => {
			const listing =
				listings.get(v) ??
				em.create(VenueDeliveryListing, {
					venue: v,
					platform: DeliveryPlatformEnum.WOLT,
					url: `https://wolt.com/en/deu/berlin/restaurant/${v.name}`,
					fetchedAt: new Date('2026-10-02T06:00:00Z'),
				});
			listings.set(v, listing);
			for (const [name, price, category] of items)
				em.create(MenuItem, { listing, month, name, price, category: category ?? null });
		};

		// Five ramen places in Mitte and one in Neukölln; "Ramen Ya" is a Japanese restaurant on Google
		venue('Ramen Ya', { category: 'Japanese restaurant', district: 'Mitte' });
		menu(venues['Ramen Ya'], '2026-09', [
			['Tonkotsu Ramen', 15],
			['Shoyu Ramen', 14],
			['Miso Ramen', 16],
			['Gyoza', 6],
			['Matcha Latte', 4.5, 'Getränke'],
		]);
		// August's menu was cheaper; September's is the one read
		menu(venues['Ramen Ya'], '2026-08', [['Tonkotsu Ramen', 12]]);
		for (const [i, price] of [11, 12, 13, 14].entries()) {
			venue(`Noodle ${i}`, { category: 'Ramen restaurant', district: 'Mitte' });
			menu(venues[`Noodle ${i}`], '2026-09', [
				['Ramen', price],
				['Cola', 3, 'Getränke'],
			]);
		}
		venue('Kotti Ramen', { category: 'Ramen restaurant', district: 'Neukölln' });
		menu(venues['Kotti Ramen'], '2026-09', [['Ramen', 10]]);
		// A closed place and another city's never count
		venue('Gone Ramen', { category: 'Ramen restaurant', district: 'Mitte', closed: true });
		menu(venues['Gone Ramen'], '2026-09', [['Ramen', 30]]);
		venue('Hamburg Ramen', { category: 'Ramen restaurant' }, other);
		menu(venues['Hamburg Ramen'], '2026-09', [['Ramen', 30]]);
		// A café whose review tags and menu say what it sells
		venue('Choc Spot', {
			category: 'Cafe',
			details: {
				reviewsTags: [
					{ title: 'friendly staff', count: 40 },
					{ title: 'cookie', count: 38 },
					{ title: 'strawberries', count: 10 },
				],
			},
		});
		await em.flush();
		// The stored food-topic links, as the app's writers and refresh keep them
		await linkFoodTopics(em);
	});

	afterAll(async () => {
		await harness.stop();
	});

	it("counts a topic's venues and prices on the month's menus, by district at five venues", async () => {
		const prices = await service.prices(city.id, '2026-09');
		expect(prices.menus).toBe(6);
		// Ramen Ya 15, Noodles 11–14, Kotti 10: medians 10, 11, 12, 13, 14, 15
		expect(prices.topics.get('ramen')).toEqual({
			key: 'ramen',
			venues: 6,
			items: 8,
			median: 12.5,
			p25: 11.25,
			p75: 13.75,
			districts: [{ district: 'Mitte', venues: 5, median: 13 }],
		});
		expect(prices.topics.get('matcha')).toMatchObject({ venues: 1, median: 4.5 });
		// A month without menus has none
		expect((await service.prices(city.id, '2026-07')).menus).toBe(0);
		const only = await service.prices(city.id, '2026-09', ['ramen']);
		expect([...only.topics.keys()]).toEqual(['ramen']);
	});

	it('tags a venue from its menu and from Google’s review tags', async () => {
		const tags = await tagger.tags([venues['Ramen Ya'], venues['Choc Spot']]);
		expect(tags.get(venues['Ramen Ya'].id)!.map(t => [t.key, t.source, t.score, t.primary])).toEqual([
			['japanese', 'category', 1, true],
			['ramen', 'menu', 0.6, false],
		]);
		expect(tags.get(venues['Choc Spot'].id)!.map(t => [t.key, t.source, t.primary])).toEqual([
			['cookies', 'reviews', true],
			['cafe', 'category', false],
		]);
	});

	it("places a venue's price by its primary topic first, then the median main course", async () => {
		const position = await service.pricePosition(
			venues['Ramen Ya'],
			[venues['Noodle 0'].id, venues['Noodle 1'].id, venues['Choc Spot'].id],
			'2026-09',
			[],
		);
		// Its Japanese food is its ramen (gyoza are dumplings, of no cuisine): 15 against the noodle
		// bars' 11 and 12; its median main course takes the gyoza in
		expect(position).toMatchObject({
			topic: {
				key: 'japanese',
				label: 'Japanese',
				price: 15,
				othersMedian: 11.5,
				othersWithTopic: 2,
				diff: 0.304,
			},
			median: 14.5,
			othersWithMenu: 2,
		});
		// The latest menu up to the month: August's for an August report
		const august = await service.pricePosition(venues['Ramen Ya'], [], '2026-08', []);
		expect(august).toMatchObject({ topic: { price: 12 }, median: 12 });
	});
});
