import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';

import { CityService } from 'src/modules/cities/services/city.service.js';
import { cityFactory } from 'src/modules/cities/tests/factories/city.factory.js';
import { Mention } from 'src/modules/social/entities/mention.entity.js';
import { SocialPlatformEnum, SocialPost } from 'src/modules/social/entities/social-post.entity.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { Brand } from '../entities/brand.entity.js';
import { Review } from '../entities/review.entity.js';
import { Venue } from '../entities/venue.entity.js';
import type { LeadInputs } from '../interfaces/lead-score.interface.js';
import { BrandLeadScoreService, scoreBrands } from '../services/brand-lead-score.service.js';

import { brandFactory } from './factories/brand.factory.js';
import { venueFactory } from './factories/venue.factory.js';

const base: LeadInputs = {
	name: 'Somewhere',
	reviewsCount: 1000,
	hasWebsite: false,
	hasPhone: false,
	posts: 1,
	views: 100,
	creators: 1,
	ownPosts: 0,
	promotionalPosts: 0,
	negativePosts: 0,
	reviews: null,
};

describe('scoreBrand with brands', () => {
	it('never weighs how many branches a brand has', () => {
		const [chain, single] = scoreBrands(
			[
				{ ...base, name: 'Burgermeister' },
				{ ...base, name: 'Lily Burger' },
			],
			'2026-09',
		);
		expect(chain.score).toBe(single.score);
		expect(Object.keys(chain.signals)).not.toContain('independent');
	});
});

describe('BrandLeadScoreService with brands (pglite)', () => {
	let harness: PgliteTestingModule;
	let service: BrandLeadScoreService;

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [BrandLeadScoreService, CityService],
		});
		service = harness.moduleRef.get(BrandLeadScoreService);
		entityManagerManager.setEntityManager(harness.orm.em);
	});

	afterAll(async () => {
		await harness.stop();
	});

	it('scores a chain once from all its open branches, on the brand, and suggests it once', async () => {
		const em = harness.orm.em;
		const city = await cityFactory.create({ name: 'Berlin' });
		const brand = await brandFactory.create({ name: 'Nhas City Chicken' });
		const branch = (name: string, reviewsCount: number, extra: Partial<Venue> = {}) =>
			venueFactory.build({ name, reviewsCount, ...extra }, { associations: { city, brand } });
		const mitte = branch('Nhas City Chicken', 2451);
		const neukolln = branch('Nhas City Chicken', 1100, { phone: '+49 30 1' });
		// A closed branch's website doesn't count
		branch('Nhas City Chicken', 50, { closed: true, website: 'https://nhas.de' });
		const solo = venueFactory.build(
			{ name: 'Hisar', reviewsCount: 800 },
			{ associations: { city } },
		);

		let n = 0;
		const post = (venues: Venue[], author: string) => {
			const p = em.create(SocialPost, {
				city,
				externalId: `x${++n}`,
				platform: SocialPlatformEnum.TIKTOK,
				url: `https://tiktok.com/x${n}`,
				postedAt: new Date('2026-09-05T00:00:00Z'),
				author,
				views: 1000,
			});
			for (const venue of venues)
				em.create(Mention, {
					post: p,
					venueName: venue.name,
					venue,
					visited: true,
					sentiment: 'positive',
					summary: 'Good.',
				});
		};
		// One post names both branches, one only the brand
		post([mitte], 'a');
		post([mitte, neukolln], 'b');
		post([neukolln], 'c');
		post([solo], 'd');
		const brandOnly = em.create(SocialPost, {
			city,
			externalId: 'x-brand',
			platform: SocialPlatformEnum.TIKTOK,
			url: 'https://tiktok.com/x-brand',
			postedAt: new Date('2026-09-06T00:00:00Z'),
			author: 'e',
			views: 1000,
		});
		em.create(Mention, {
			post: brandOnly,
			venueName: 'Nhas City Chicken',
			brand,
			visited: true,
			sentiment: 'positive',
			summary: 'Good.',
		});
		for (const [i, venue] of [mitte, neukolln].entries())
			em.create(Review, {
				reviewId: `r${i}`,
				venue,
				publishedAt: new Date('2026-09-10T00:00:00Z'),
				stars: 2,
				text: 'Waited an hour.',
				analysedAt: new Date(),
			});
		await em.flush();

		await service.scoreAll('2026-09', city.id);
		em.clear();

		const a = await em.findOneOrFail(Brand, { id: brand.id });
		// The brand-only post counts too: four posts by others
		expect(a.leadSignals?.buzz.inputs).toMatchObject({ posts: 4, creators: 4 });
		expect(a.leadSignals?.problem.inputs).toMatchObject({ reviews: 2, unansweredCritical: 2 });
		// One branch's phone reaches the brand
		expect(a.leadSignals?.reachable.inputs).toMatchObject({ phone: true, website: false });

		// Suggested once, as the brand
		const ranked = await service.ranked({ limit: 10, cityId: city.id });
		expect(ranked.map(b => b.id)).toEqual([brand.id, solo.brand.id]);
		// A prospect on the brand keeps it off the suggestions
		expect(
			(await service.ranked({ limit: 10, cityId: city.id, excludeIds: [brand.id] })).map(
				b => b.id,
			),
		).toEqual([solo.brand.id]);
	});
});
