import { ConflictException } from '@nestjs/common';

import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';

import { Mention, MentionMatchMethodEnum } from 'src/modules/social/entities/mention.entity.js';
import { SocialPlatformEnum, SocialPost } from 'src/modules/social/entities/social-post.entity.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { AdminCitiesController } from '../controllers/admin.cities.controller.js';
import { CitySourceKindEnum } from '../entities/city-source.entity.js';
import { CityService } from '../services/city.service.js';
import { areNeighbourDistricts, stepBudgetUsd } from '../util/city.js';

import { cityFactory } from './factories/city.factory.js';

describe('CityService (pglite)', () => {
	let harness: PgliteTestingModule;
	let service: CityService;
	let controller: AdminCitiesController;

	beforeAll(async () => {
		harness = await createPgliteTestingModule({ providers: [CityService, AdminCitiesController] });
		service = harness.moduleRef.get(CityService);
		controller = harness.moduleRef.get(AdminCitiesController);
		entityManagerManager.setEntityManager(harness.orm.em);
	});

	afterAll(async () => {
		await harness.stop();
	});

	it('creates a city with defaults, refuses a taken slug, and updates it', async () => {
		const created = await controller.createCity({
			slug: 'wien',
			name: 'Wien',
			country: 'AT',
			timezone: 'Europe/Vienna',
			language: 'de',
			locationQuery: 'Vienna, Austria',
			tiktokRegion: 'AT',
		});
		expect(created).toMatchObject({
			slug: 'wien',
			active: true,
			cronEnabled: false,
			instagramEnabled: true,
			topBrands: 20,
			districts: [],
			stepBudgetsUsd: {},
		});
		await expect(
			controller.createCity({
				slug: 'wien',
				name: 'Wien 2',
				country: 'AT',
				timezone: 'Europe/Vienna',
				language: 'de',
				locationQuery: 'Vienna, Austria',
				tiktokRegion: 'AT',
			}),
		).rejects.toBeInstanceOf(ConflictException);
		harness.orm.em.clear();

		const updated = await controller.updateCity(created.id, {
			cronEnabled: true,
			stepBudgetsUsd: { SCRAPE_TIKTOK: 4 },
		});
		expect(updated).toMatchObject({ cronEnabled: true, stepBudgetsUsd: { SCRAPE_TIKTOK: 4 } });
		expect((await service.forMonthlyCron()).map(c => c.slug)).toContain('wien');
	});

	it('adds sources normalized, refuses a duplicate, and toggles one', async () => {
		const city = await cityFactory.create({ name: 'Hamburg' });
		const tag = await service.addSource(city.id, {
			kind: CitySourceKindEnum.TIKTOK_HASHTAG,
			value: ' #HamburgFood ',
		});
		expect(tag.value).toBe('hamburgfood');
		const search = await service.addSource(city.id, {
			kind: CitySourceKindEnum.TIKTOK_SEARCH,
			value: '  Hamburg   Fischbrötchen ',
		});
		expect(search.value).toBe('Hamburg Fischbrötchen');
		await expect(
			service.addSource(city.id, { kind: CitySourceKindEnum.TIKTOK_HASHTAG, value: 'hamburgfood' }),
		).rejects.toBeInstanceOf(ConflictException);
		harness.orm.em.clear();

		await controller.updateCitySource(city.id, tag.id, { enabled: false, note: 'dead' });
		expect(await service.enabledValues(city.id, CitySourceKindEnum.TIKTOK_HASHTAG)).toEqual([]);
		expect(await service.enabledValues(city.id, CitySourceKindEnum.TIKTOK_SEARCH)).toEqual([
			'Hamburg Fischbrötchen',
		]);
	});

	it('counts what each source brought in over the last three months', async () => {
		const em = harness.orm.em;
		const city = cityFactory.build({ name: 'Köln' });
		const other = cityFactory.build({ name: 'Bonn' });
		const venue = em.create(Venue, { city, placeId: 'p-koeln', name: 'Früh' });
		let n = 0;
		const post = (
			inCity: typeof city,
			source: string,
			postedAt: string,
			views: number,
			matched = false,
			platform = SocialPlatformEnum.TIKTOK,
		) => {
			const p = em.create(SocialPost, {
				city: inCity,
				externalId: `y${++n}`,
				platform,
				url: `https://example.com/${n}`,
				postedAt: new Date(postedAt),
				source,
				views,
			});
			em.create(Mention, {
				post: p,
				venueName: 'Früh',
				venue: matched ? venue : null,
				matchMethod: matched ? MentionMatchMethodEnum.EXACT : MentionMatchMethodEnum.NONE,
				visited: true,
				sentiment: 'positive',
				summary: 'Kölsch.',
				dishes: [],
				praise: [],
				complaints: [],
			});
		};
		post(city, '#koelnfood', '2026-09-10T00:00:00Z', 100, true);
		post(city, '#KoelnFood', '2026-08-10T00:00:00Z', 50);
		// Too old, another city, the other platform
		post(city, '#koelnfood', '2026-05-01T00:00:00Z', 1000, true);
		post(other, '#koelnfood', '2026-09-10T00:00:00Z', 1000, true);
		post(city, '#koelnfood', '2026-09-10T00:00:00Z', 7, true, SocialPlatformEnum.INSTAGRAM);
		post(city, 'search:köln essen', '2026-09-11T00:00:00Z', 30, true);
		await em.flush();
		for (const [kind, value] of [
			[CitySourceKindEnum.TIKTOK_HASHTAG, 'koelnfood'],
			[CitySourceKindEnum.TIKTOK_SEARCH, 'köln essen'],
			[CitySourceKindEnum.INSTAGRAM_HASHTAG, 'koelnfood'],
			[CitySourceKindEnum.INSTAGRAM_HASHTAG, 'koelndead'],
		] as const)
			await service.addSource(city.id, { kind, value });

		const { items } = await controller.listCitySources(city.id);
		expect(
			items.map(({ kind, value, posts, matchedPosts, views }) => ({ kind, value, posts, matchedPosts, views })),
		).toEqual([
			{ kind: CitySourceKindEnum.TIKTOK_HASHTAG, value: 'koelnfood', posts: 2, matchedPosts: 1, views: 150 },
			{ kind: CitySourceKindEnum.TIKTOK_SEARCH, value: 'köln essen', posts: 1, matchedPosts: 1, views: 30 },
			{ kind: CitySourceKindEnum.INSTAGRAM_HASHTAG, value: 'koelnfood', posts: 1, matchedPosts: 1, views: 7 },
			{ kind: CitySourceKindEnum.INSTAGRAM_HASHTAG, value: 'koelndead', posts: 0, matchedPosts: 0, views: 0 },
		]);
		const list = await controller.listCities();
		expect(list.items.find(c => c.id === city.id)).toMatchObject({ venues: 1, sources: 4, enabledSources: 4 });
	});

	it('reads neighbours both ways and falls back to the default budget', () => {
		const city = { districts: [{ name: 'A', postalCodes: [], neighbours: ['B'] }] };
		expect(areNeighbourDistricts(city, 'A', 'B')).toBe(true);
		expect(areNeighbourDistricts(city, 'B', 'A')).toBe(true);
		expect(areNeighbourDistricts(city, 'A', 'C')).toBe(false);
		expect(stepBudgetUsd({ stepBudgetsUsd: { SCRAPE_TIKTOK: 3 } }, 'SCRAPE_TIKTOK' as never)).toBe(3);
		expect(stepBudgetUsd({ stepBudgetsUsd: {} }, 'SCRAPE_TIKTOK' as never)).toBe(15);
	});
});
