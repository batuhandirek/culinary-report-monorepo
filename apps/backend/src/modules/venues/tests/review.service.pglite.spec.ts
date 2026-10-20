import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';

import { ApifyService } from 'src/modules/apify/services/apify.service.js';
import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { ReviewAnalysisAgent } from '../agents/review-analysis.agent.js';
import { Review } from '../entities/review.entity.js';
import { Venue } from '../entities/venue.entity.js';
import { VenueSnapshot } from '../entities/venue-snapshot.entity.js';
import { ReviewService } from '../services/review.service.js';
import { VenueService } from '../services/venue.service.js';

describe('ReviewService.scrapeMonth (pglite)', () => {
	let harness: PgliteTestingModule;
	let service: ReviewService;
	const runActor = jest.fn<(...args: unknown[]) => Promise<unknown[]>>();
	const generate = jest.fn<(prompt: string) => Promise<unknown>>();

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				ReviewService,
				VenueService,
				{ provide: ApifyService, useValue: { runActor } },
				{ provide: ReviewAnalysisAgent, useValue: { generate } },
			],
		});
		service = harness.moduleRef.get(ReviewService);
		entityManagerManager.setEntityManager(harness.orm.em);
	});

	afterAll(async () => {
		await harness.stop();
	});

	it("saves the month's reviews and the later ones, and snapshots each venue's all-time rating from the items", async () => {
		const em = harness.orm.em;
		const a = em.create(Venue, { city: testCity(em), placeId: 'pa', name: 'A', rating: 4.0, reviewsCount: 100 });
		const b = em.create(Venue, { city: testCity(em), placeId: 'pb', name: 'B', rating: 4.5, reviewsCount: 50 });
		const quiet = em.create(Venue, { city: testCity(em), placeId: 'pq', name: 'Quiet', rating: 3.9 });
		await em.flush();

		const item = (placeId: string, reviewId: string, date: string, totalScore: number) => ({
			placeId,
			reviewId,
			publishedAtDate: date,
			stars: 5,
			text: 'Good',
			totalScore,
			reviewsCount: totalScore === 4.2 ? 130 : 60,
		});
		runActor.mockResolvedValueOnce([
			item('pa', 'r1', '2026-09-03T10:00:00Z', 4.2),
			item('pa', 'r2', '2026-09-20T10:00:00Z', 4.2),
			// A review from after the month: paid for too, so it is kept as October's
			item('pb', 'r3', '2026-10-01T10:00:00Z', 4.6),
			// One from before the start date (the actor rounds to days): left out
			item('pb', 'r0', '2026-08-31T23:00:00Z', 4.6),
		]);

		const now = new Date('2026-10-02T06:30:00Z');
		const saved = await service.scrapeMonth('2026-09', [a.id, b.id, quiet.id], 5, now);
		expect(saved).toBe(3);
		em.clear();

		const snapshots = await em.find(VenueSnapshot, {}, { populate: ['venue'] });
		expect(
			snapshots.map(s => [s.venue.name, s.snapshotDate, s.rating, s.reviewsCount]).sort(),
		).toEqual([
			['A', '2026-10-02', 4.2, 130],
			['B', '2026-10-02', 4.6, 60],
		]);
		expect(await em.findOneOrFail(Venue, { placeId: 'pa' })).toMatchObject({
			rating: 4.2,
			reviewsCount: 130,
		});
		// No item, no snapshot, rating left as it was
		expect((await em.findOneOrFail(Venue, { placeId: 'pq' })).rating).toBe(3.9);
		expect(await em.count(Review, {})).toBe(3);
	});

	it('starts earlier for a backfill', async () => {
		const em = harness.orm.em;
		const a = em.create(Venue, { city: testCity(em), placeId: 'pc', name: 'C' });
		await em.flush();
		runActor.mockResolvedValueOnce([
			{ placeId: 'pc', reviewId: 'r-aug', publishedAtDate: '2026-08-12T10:00:00Z', totalScore: 4.2, reviewsCount: 130 },
		]);
		await service.scrapeMonth('2026-09', [a.id], 5, new Date('2026-10-18T09:00:00Z'), '2026-08-01');
		expect((runActor.mock.calls.at(-1)?.[1] as { reviewsStartDate: string }).reviewsStartDate).toBe('2026-08-01');
		expect(await em.count(Review, { reviewId: 'r-aug' })).toBe(1);
	});

	it('updates the day’s snapshot when the step runs twice', async () => {
		const em = harness.orm.em;
		const a = await em.findOneOrFail(Venue, { placeId: 'pa' });
		runActor.mockResolvedValueOnce([
			{ placeId: 'pa', reviewId: 'r1', publishedAtDate: '2026-09-03T10:00:00Z', totalScore: 4.3, reviewsCount: 131 },
		]);
		await service.scrapeMonth('2026-09', [a.id], 5, new Date('2026-10-02T09:00:00Z'));
		em.clear();
		const snapshots = await em.find(VenueSnapshot, { venue: a.id });
		expect(snapshots.map(s => [s.snapshotDate, s.rating])).toEqual([['2026-10-02', 4.3]]);
	});

	it('keeps the batches analysed before the LLM account ran out, and fails', async () => {
		const em = harness.orm.em;
		const venue = em.create(Venue, { city: testCity(em), placeId: 'p-llm', name: 'Out of credits' });
		await em.flush();
		for (let i = 0; i < 12; i++) {
			em.create(Review, { venue, reviewId: `llm-${i}`, publishedAt: new Date('2026-07-10T10:00:00Z'), stars: 4, text: `Review ${i}` });
		}
		await em.flush();
		const noCredits = new Error('You have no credits remaining. Add credits to continue using the API');
		generate.mockImplementation(async prompt => {
			const { reviews } = JSON.parse(prompt) as { reviews: { reviewId: string }[] };
			// The first batch (10) goes through; the second hits the empty account
			if (reviews.length !== 10) throw noCredits;
			return {
				object: {
					reviews: reviews.map(r => ({ reviewId: r.reviewId, sentiment: 'positive', praise: [], complaints: [], dishes: [], changes: [] })),
				},
			};
		});

		await expect(service.analyseMonth('2026-07')).rejects.toBe(noCredits);

		em.clear();
		expect(await em.count(Review, { venue: venue.id, analysedAt: { $ne: null } })).toBe(10);
	});
});
