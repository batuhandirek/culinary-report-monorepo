import { BadRequestException, ConflictException } from '@nestjs/common';

import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';

import { Mention, MentionMatchMethodEnum } from 'src/modules/social/entities/mention.entity.js';
import { PostSource, PostSourceKindEnum } from 'src/modules/social/entities/post-source.entity.js';
import { SocialPlatformEnum, SocialPost } from 'src/modules/social/entities/social-post.entity.js';
import { linkPostSources } from 'src/modules/social/util/post-sources.js';
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
		// A blog is its URL: https assumed, the host lowercased, a bare / and the fragment dropped
		const blog = await service.addSource(city.id, { kind: CitySourceKindEnum.BLOG, value: ' www.HamburgIsst.de/#top ' });
		expect(blog.value).toBe('https://www.hamburgisst.de');
		const section = await service.addSource(city.id, {
			kind: CitySourceKindEnum.BLOG,
			value: 'https://www.qiez.de/feed/?category_name=essen-trinken',
		});
		expect(section.value).toBe('https://www.qiez.de/feed/?category_name=essen-trinken');
		for (const value of ['not a url', 'http://localhost:3000/feed', 'ftp://blog.de/feed'])
			await expect(service.addSource(city.id, { kind: CitySourceKindEnum.BLOG, value })).rejects.toBeInstanceOf(
				BadRequestException,
			);
		// A creator is their handle: @ and a profile URL dropped, lowercased
		const tiktoker = await service.addSource(city.id, { kind: CitySourceKindEnum.TIKTOK_ACCOUNT, value: ' @HamburgEats ' });
		expect(tiktoker.value).toBe('hamburgeats');
		const instagrammer = await service.addSource(city.id, {
			kind: CitySourceKindEnum.INSTAGRAM_ACCOUNT,
			value: 'https://www.instagram.com/Hamburg.Isst/?hl=de',
		});
		expect(instagrammer.value).toBe('hamburg.isst');
		await expect(
			service.addSource(city.id, { kind: CitySourceKindEnum.TIKTOK_ACCOUNT, value: 'not a handle' }),
		).rejects.toBeInstanceOf(BadRequestException);
		expect(
			(await service.accountSources({ handles: [{ kind: CitySourceKindEnum.INSTAGRAM_ACCOUNT, handle: 'hamburg.isst' }] })).map(
				s => [s.city.name, s.value],
			),
		).toEqual([['Hamburg', 'hamburg.isst']]);
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
			[kind, value]: [PostSourceKindEnum, string],
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
				views,
			});
			em.create(PostSource, { post: p, kind, value, foundAt: new Date(postedAt) });
			em.create(Mention, {
				post: p,
				venueName: 'Früh',
				venue: matched ? venue : null,
				matchMethod: matched ? MentionMatchMethodEnum.EXACT : MentionMatchMethodEnum.NONE,
				visited: true,
				sentiment: 'positive',
				summary: 'Kölsch.',
			});
		};
		const tag: [PostSourceKindEnum, string] = [PostSourceKindEnum.TIKTOK_HASHTAG, 'koelnfood'];
		post(city, tag, '2026-09-10T00:00:00Z', 100, true);
		post(city, tag, '2026-08-10T00:00:00Z', 50);
		// Too old, another city, the other platform
		post(city, tag, '2026-05-01T00:00:00Z', 1000, true);
		post(other, tag, '2026-09-10T00:00:00Z', 1000, true);
		post(city, [PostSourceKindEnum.INSTAGRAM_HASHTAG, 'koelnfood'], '2026-09-10T00:00:00Z', 7, true, SocialPlatformEnum.INSTAGRAM);
		// Searches are compared case-insensitively, as sources are
		post(city, [PostSourceKindEnum.TIKTOK_SEARCH, 'Köln essen'], '2026-09-11T00:00:00Z', 30, true);
		// A blog article: no views, its source the blog's URL
		post(city, [PostSourceKindEnum.BLOG, 'https://www.koelnisst.de'], '2026-09-12T00:00:00Z', 0, true, SocialPlatformEnum.BLOG);
		await em.flush();
		// The posts came before their sources: adding a source gives it what it found
		for (const [kind, value] of [
			[CitySourceKindEnum.TIKTOK_HASHTAG, 'koelnfood'],
			[CitySourceKindEnum.TIKTOK_SEARCH, 'köln essen'],
			[CitySourceKindEnum.INSTAGRAM_HASHTAG, 'koelnfood'],
			[CitySourceKindEnum.INSTAGRAM_HASHTAG, 'koelndead'],
			[CitySourceKindEnum.BLOG, 'https://www.koelnisst.de/'],
		] as const)
			await service.addSource(city.id, { kind, value });

		const { items, allFindsSince } = await controller.listCitySources(city.id);
		expect(
			items.map(({ kind, value, posts, matchedPosts, uniqueMatchedPosts, views }) => ({
				kind,
				value,
				posts,
				matchedPosts,
				uniqueMatchedPosts,
				views,
			})),
		).toEqual([
			{ kind: CitySourceKindEnum.TIKTOK_HASHTAG, value: 'koelnfood', posts: 2, matchedPosts: 1, uniqueMatchedPosts: 1, views: 150 },
			{ kind: CitySourceKindEnum.TIKTOK_SEARCH, value: 'köln essen', posts: 1, matchedPosts: 1, uniqueMatchedPosts: 1, views: 30 },
			{ kind: CitySourceKindEnum.INSTAGRAM_HASHTAG, value: 'koelnfood', posts: 1, matchedPosts: 1, uniqueMatchedPosts: 1, views: 7 },
			{ kind: CitySourceKindEnum.INSTAGRAM_HASHTAG, value: 'koelndead', posts: 0, matchedPosts: 0, uniqueMatchedPosts: 0, views: 0 },
			{ kind: CitySourceKindEnum.BLOG, value: 'https://www.koelnisst.de', posts: 1, matchedPosts: 1, uniqueMatchedPosts: 1, views: 0 },
		]);
		expect(allFindsSince).toMatch(/^\d{4}-\d{2}-\d{2}$/);
		const list = await controller.listCities();
		expect(list.items.find(c => c.id === city.id)).toMatchObject({ venues: 1, sources: 5, enabledSources: 5 });
	});

	it('counts the matched posts only one source that keeps running found', async () => {
		const em = harness.orm.em;
		const city = cityFactory.build({ name: 'Leipzig' });
		const venue = em.create(Venue, { city, placeId: 'p-leipzig', name: 'Auerbachs Keller' });
		await em.flush();
		const [a, b] = [PostSourceKindEnum.TIKTOK_HASHTAG, PostSourceKindEnum.TIKTOK_SEARCH];
		await service.addSource(city.id, { kind: CitySourceKindEnum.TIKTOK_HASHTAG, value: 'leipzigfood' });
		await service.addSource(city.id, { kind: CitySourceKindEnum.TIKTOK_SEARCH, value: 'leipzig essen' });
		await service.addSource(city.id, { kind: CitySourceKindEnum.TIKTOK_HASHTAG, value: 'leipzigeats', enabled: false });
		let n = 0;
		const post = (finds: [PostSourceKindEnum, string][], matched = true) => {
			const p = em.create(SocialPost, {
				city,
				externalId: `u${++n}`,
				platform: SocialPlatformEnum.TIKTOK,
				url: `https://example.com/u/${n}`,
				postedAt: new Date('2026-09-15T00:00:00Z'),
			});
			for (const [kind, value] of finds) em.create(PostSource, { post: p, kind, value, foundAt: new Date() });
			em.create(Mention, {
				post: p,
				venueName: venue.name,
				venue: matched ? venue : null,
				matchMethod: matched ? MentionMatchMethodEnum.EXACT : MentionMatchMethodEnum.NONE,
				visited: true,
				sentiment: 'positive',
				summary: 'Good.',
			});
		};
		const unique = async () =>
			Object.fromEntries(
				(await controller.listCitySources(city.id)).items.map(s => [
					s.value,
					[s.matchedPosts, s.uniqueMatchedPosts],
				]),
			);
		// Three by A only, two by A and B, one by B only
		for (let i = 0; i < 3; i++) post([[a, 'leipzigfood']]);
		for (let i = 0; i < 2; i++)
			post([
				[a, 'leipzigfood'],
				[b, 'leipzig essen'],
			]);
		post([[b, 'leipzig essen']]);
		await em.flush();
		await linkPostSources(em, city.id);
		expect(await unique()).toEqual({ leipzigfood: [5, 3], 'leipzig essen': [3, 1], leipzigeats: [0, 0] });

		// A disabled source finding it too leaves it A's; a venue search finding it doesn't; unmatched never counts
		post([
			[a, 'leipzigfood'],
			[a, 'leipzigeats'],
		]);
		post([
			[a, 'leipzigfood'],
			[PostSourceKindEnum.VENUE_SEARCH, 'Auerbachs Keller Leipzig'],
		]);
		post([[a, 'leipzigfood']], false);
		await em.flush();
		await linkPostSources(em, city.id);
		expect(await unique()).toEqual({ leipzigfood: [7, 4], 'leipzig essen': [3, 1], leipzigeats: [1, 0] });

		// A watched brand's own profile (no city source) keeps running too; a creator the city
		// follows is a source of its own, counted like the others
		await service.addSource(city.id, { kind: CitySourceKindEnum.INSTAGRAM_ACCOUNT, value: 'leipzigisst' });
		post([
			[a, 'leipzigfood'],
			[PostSourceKindEnum.INSTAGRAM_ACCOUNT, 'auerbachs_keller'],
		]);
		post([[PostSourceKindEnum.INSTAGRAM_ACCOUNT, 'leipzigisst']]);
		await em.flush();
		await linkPostSources(em, city.id);
		expect(await unique()).toEqual({
			leipzigfood: [8, 4],
			'leipzig essen': [3, 1],
			leipzigeats: [1, 0],
			leipzigisst: [1, 1],
		});
	});

	it('reads neighbours both ways and falls back to the default budget', () => {
		const city = { districts: [{ name: 'A', postalCodes: [], neighbours: ['B'] }] };
		expect(areNeighbourDistricts(city, 'A', 'B')).toBe(true);
		expect(areNeighbourDistricts(city, 'B', 'A')).toBe(true);
		expect(areNeighbourDistricts(city, 'A', 'C')).toBe(false);
		expect(stepBudgetUsd({ stepBudgetsUsd: { SCRAPE_TIKTOK: 3 } }, 'SCRAPE_TIKTOK' as never)).toBe(3);
		expect(stepBudgetUsd({ stepBudgetsUsd: {} }, 'SCRAPE_TIKTOK' as never)).toBe(7);
	});
});
