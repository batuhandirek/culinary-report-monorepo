import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';

import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { Mention, MentionMatchMethodEnum } from '../entities/mention.entity.js';
import { SocialPlatformEnum, SocialPost } from '../entities/social-post.entity.js';
import { MentionMatchingService } from '../services/mention-matching.service.js';

import { ownAccount } from './factories/social-account.factory.js';

describe('MentionMatchingService.topBrandIds (pglite)', () => {
	let harness: PgliteTestingModule;
	let service: MentionMatchingService;

	beforeAll(async () => {
		harness = await createPgliteTestingModule({ providers: [MentionMatchingService] });
		service = harness.moduleRef.get(MentionMatchingService);
		entityManagerManager.setEntityManager(harness.orm.em);
	});

	afterAll(async () => {
		await harness.stop();
	});

	it("ranks brands by posts from others, not the brand's own, within the city", async () => {
		const em = harness.orm.em;
		const city = testCity(em);
		const elsewhere = testCity(em, { name: 'Wien' });
		const a = em.create(Venue, { city, placeId: 'p-a', name: 'Venue A', category: 'Restaurant' });
		const c = em.create(Venue, { city: elsewhere, placeId: 'p-c', name: 'Café C', category: 'Cafe' });
		const b = em.create(Venue, {
			city,
			placeId: 'p-b',
			name: 'Bistro Bravo',
			category: 'Restaurant',
		});
		// Each gets a brand of its own when saved
		await em.flush();
		// Venue A's own account: its posts are not word of mouth
		const own = ownAccount(em, a.brand, city, 'venue_a_berlin');
		let n = 0;
		const post = (venue: Venue, author: string, views = 100) => {
			const p = em.create(SocialPost, {
				city: venue.city,
				externalId: `t${++n}`,
				platform: SocialPlatformEnum.TIKTOK,
				url: `https://tiktok.com/t${n}`,
				postedAt: new Date('2026-09-10T00:00:00Z'),
				author,
				account: author === own.handle ? own : undefined,
				views,
			});
			em.create(Mention, {
				post: p,
				venueName: venue.name,
				brand: venue.brand,
				venue,
				matchMethod: MentionMatchMethodEnum.EXACT,
				visited: true,
				sentiment: 'positive',
				summary: 'Nice.',
			});
		};
		for (let i = 0; i < 5; i++) post(a, 'venue_a_berlin', 10_000);
		for (const creator of ['foodie1', 'eats.berlin', 'tom']) post(b, creator);
		for (const creator of ['wien1', 'wien2', 'wien3', 'wien4']) post(c, creator);
		await em.flush();

		expect(await service.topBrandIds('2026-09', 1, city.id)).toEqual([b.brand.id]);
		expect(await service.topBrandIds('2026-09', 5, city.id)).toEqual([b.brand.id]);
		expect(await service.topBrandIds('2026-08', 5, city.id)).toEqual([]);
		expect(await service.topBrandIds('2026-09', 5, elsewhere.id)).toEqual([c.brand.id]);
	});
});
