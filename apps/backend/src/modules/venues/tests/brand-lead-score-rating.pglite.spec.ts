import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';

import { CityService } from 'src/modules/cities/services/city.service.js';
import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { Brand } from '../entities/brand.entity.js';
import { Review } from '../entities/review.entity.js';
import { Venue } from '../entities/venue.entity.js';
import { BrandLeadScoreService } from '../services/brand-lead-score.service.js';

describe('BrandLeadScoreService: the district rating without reviews (pglite)', () => {
	let harness: PgliteTestingModule;
	let service: BrandLeadScoreService;

	beforeAll(async () => {
		harness = await createPgliteTestingModule({ providers: [BrandLeadScoreService, CityService] });
		service = harness.moduleRef.get(BrandLeadScoreService);
		entityManagerManager.setEntityManager(harness.orm.em);
	});

	afterAll(async () => {
		await harness.stop();
	});

	it("reads a branch's rating below its district's median as the problem when no review was scraped", async () => {
		const em = harness.orm.em;
		const city = testCity(em);
		let n = 0;
		const venue = (name: string, rating: number, district = 'Mitte', reviewsCount = 40) =>
			em.create(Venue, { city, placeId: `p${n++}`, name, category: 'Restaurant', district, rating, reviewsCount });
		const low = venue('Low Place', 3.6);
		const high = venue('High Place', 4.9);
		for (const rating of [4.2, 4.3, 4.4, 4.5]) venue(`Peer ${rating}`, rating);
		// A district too thin for a standing: unknown, as before
		const lone = venue('Lone Place', 3.0, 'Pankow');
		// Reviews scraped: the reviews decide, not the rating
		const reviewed = venue('Reviewed Place', 3.5, 'Wedding');
		em.create(Review, { venue: reviewed, reviewId: 'r1', stars: 5, publishedAt: new Date('2026-09-10T00:00:00Z') });
		await em.flush();

		await service.scoreAll('2026-09', city.id);
		const signals = async (v: Venue) =>
			(await em.fork().findOneOrFail(Brand, { id: v.brand.id })).leadSignals!.problem;

		// 3.6 is behind all five other district venues: percentile 0, a clear problem
		const lowProblem = await signals(low);
		expect(lowProblem.inputs).toMatchObject({ reviews: 0, districtRatingPercentile: 0 });
		expect(lowProblem.value).toBe(0.75);
		// Ahead of all of them: no problem, but known
		expect((await signals(high)).value).toBe(0);
		expect((await signals(lone)).value ?? null).toBeNull();
		expect((await signals(reviewed)).inputs).toMatchObject({ reviews: 1 });
		expect((await signals(reviewed)).inputs.districtRatingPercentile).toBeUndefined();
	});
});
