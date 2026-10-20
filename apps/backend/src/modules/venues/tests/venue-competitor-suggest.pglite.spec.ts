import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';

import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { VenueFoodTopic } from 'src/modules/food-topics/entities/venue-food-topic.entity.js';
import { FoodTopicService } from 'src/modules/food-topics/services/food-topic.service.js';
import { VenueFoodTopicService } from 'src/modules/food-topics/services/venue-food-topic.service.js';
import { seedFoodTopics } from 'src/modules/food-topics/tests/factories/food-topic.factory.js';
import { Mention } from 'src/modules/social/entities/mention.entity.js';
import { SocialPlatformEnum, SocialPost } from 'src/modules/social/entities/social-post.entity.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { Venue } from '../entities/venue.entity.js';
import {
	googleAlsoSearched,
	CompetitorService,
} from '../services/competitor.service.js';

describe('CompetitorService suggestions (pglite)', () => {
	let harness: PgliteTestingModule;
	let service: CompetitorService;
	const venues: Record<string, Venue> = {};
	let cityId: string;

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [CompetitorService, FoodTopicService, VenueFoodTopicService],
		});
		service = harness.moduleRef.get(CompetitorService);
		entityManagerManager.setEntityManager(harness.orm.em);

		const em = harness.orm.em;
		seedFoodTopics(em);
		const city = testCity(em);
		cityId = city.id;
		const add = (
			key: string,
			name: string,
			category: string,
			district: string,
			extra: Partial<Venue> = {},
		) => (venues[key] = em.create(Venue, { city, placeId: key, name, category, district, ...extra }));
		add('doner', 'Döner Pro', 'Doner kebab restaurant', 'Friedrichshain-Kreuzberg', {
			categories: ['Doner kebab restaurant', 'Fast food restaurant'],
		});
		add('ruyam', 'Rüyam Gemüse Kebab', 'Kebab shop', 'Friedrichshain-Kreuzberg');
		add('mustafa', "Mustafa's Gemüse Kebap", 'Doner kebab restaurant', 'Neukölln');
		// Google calls it a snack bar, posts call it döner
		add('imbiss', 'Imbiss Hermannplatz', 'Snack bar', 'Neukölln');
		add('closed', 'Old Döner', 'Doner kebab restaurant', 'Friedrichshain-Kreuzberg', {
			closed: true,
		});
		add('spandau', 'Spandau Döner', 'Doner kebab restaurant', 'Spandau');
		// Close and much talked about, but nothing in common to eat (fast food is a kind of place)
		add('pizza', 'Pizza Kreuzberg', 'Pizza restaurant', 'Friedrichshain-Kreuzberg', {
			categories: ['Pizza restaurant', 'Fast food restaurant'],
		});
		add('shop', 'Späti', 'Convenience store', 'Friedrichshain-Kreuzberg');
		// Same district name, another city: never a competitor
		add('elsewhere', 'Döner Elsewhere', 'Doner kebab restaurant', 'Friedrichshain-Kreuzberg', {
			city: testCity(em, { name: 'Elsewhere' }),
		});

		const post = em.create(SocialPost, {
			city,
			externalId: 'p1',
			platform: SocialPlatformEnum.TIKTOK,
			url: 'https://tiktok.com/p1',
			postedAt: new Date('2026-09-10T00:00:00Z'),
		});
		const mention = (venue: Venue, cuisine: string) =>
			em.create(Mention, {
				post,
				venue,
				venueName: venue.name,
				cuisine,
				visited: true,
				sentiment: 'positive',
				summary: 'Good.',
				dishes: [],
				praise: [],
				complaints: [],
			});
		mention(venues.doner, 'Döner');
		mention(venues.imbiss, 'Turkish/Kebab');
		mention(venues.imbiss, 'Kebap');
		for (let i = 0; i < 20; i++) mention(venues.pizza, 'Pizza');
		await em.flush();
	});

	afterAll(async () => {
		await harness.stop();
	});

	it('suggests döner and kebab places in the district and next door, never itself, a closed one or another city', async () => {
		const suggestions = await service.suggest(venues.doner.brand.id);
		// The snack bar is döner by its posts, and more talked about than Mustafa's
		expect(suggestions.map(s => s.venue.placeId)).toEqual(['ruyam', 'imbiss', 'mustafa']);
		expect(suggestions[0].reasons).toEqual(['same food (Döner & kebab)', 'same district']);
		expect(suggestions[1].reasons).toEqual(['same food (Döner & kebab)', 'neighbouring district']);
	});

	it("follows an admin's tags: excluded food is no match, a shared diet adds", async () => {
		const em = harness.orm.em;
		const topics = await harness.moduleRef.get(FoodTopicService).all();
		const topic = (key: string) => topics.find(t => t.key === key)!;
		em.create(VenueFoodTopic, { venue: venues.imbiss, topic: topic('kebab'), excluded: true });
		em.create(VenueFoodTopic, { venue: venues.doner, topic: topic('vegan') });
		em.create(VenueFoodTopic, { venue: venues.ruyam, topic: topic('vegan') });
		await em.flush();
		const suggestions = await service.suggest(venues.doner.brand.id);
		expect(suggestions.map(s => s.venue.placeId)).toEqual(['ruyam', 'mustafa']);
		expect(suggestions[0].reasons).toEqual(['same food (Döner & kebab)', 'both vegan', 'same district']);
		await em.nativeDelete(VenueFoodTopic, {});
	});

	it('leaves out current competitors', async () => {
		await service.add(venues.doner.brand.id, { venueId: venues.ruyam.id });
		expect((await service.suggest(venues.doner.brand.id)).map(s => s.venue.placeId)).toEqual([
			'imbiss',
			'mustafa',
		]);
	});

	it('fills only brands without competitors', async () => {
		const res = await service.fill([venues.doner.brand.id, venues.mustafa.brand.id], cityId);
		expect(res).toEqual({ filled: 1, added: 3, skipped: 1 });
		expect((await service.list(venues.mustafa.brand.id)).map(c => c.venue!.placeId).sort()).toEqual([
			'doner',
			'imbiss',
			'ruyam',
		]);
		// The one that had some keeps exactly those
		expect((await service.list(venues.doner.brand.id)).map(c => c.venue!.placeId)).toEqual(['ruyam']);
	});

	it("adds Google's people-also-search places, even outside the district, never one with nothing in common to eat", async () => {
		const em = harness.orm.em;
		// Spandau is far from Neukölln, but Google lists Mustafa's next to it
		venues.spandau.details = { peopleAlsoSearch: [{ title: "Mustafa's Gemüse Kebap" }] };
		venues.pizza.details = { peopleAlsoSearch: [{ title: "Mustafa's Gemüse Kebap" }] };
		await em.flush();
		const suggestions = await service.suggest(venues.mustafa.brand.id);
		expect(suggestions.map(s => s.venue.placeId)).toEqual(['spandau']);
		expect(suggestions[0].reasons).toEqual(['same food (Döner & kebab)', 'Google: people also search for']);
	});

	it('matches people-also-search titles by name, either way', () => {
		const a = { name: 'Döner Pro', details: { peopleAlsoSearch: [{ title: 'Rüyam Gemüse Kebab Berlin' }] } };
		const b = { name: 'Rüyam Gemüse Kebab', details: null };
		const words = new Set(['berlin']);
		expect(googleAlsoSearched(a, b, words)).toBe(true);
		expect(googleAlsoSearched(b, a, words)).toBe(true);
		expect(googleAlsoSearched(a, { name: 'Rüyam Burger', details: null }, words)).toBe(false);
	});
});
