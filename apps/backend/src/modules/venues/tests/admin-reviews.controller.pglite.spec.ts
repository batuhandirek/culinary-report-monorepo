import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';

import { cityFactory } from 'src/modules/cities/tests/factories/city.factory.js';
import { FeedbackPoint } from 'src/modules/feedback/entities/feedback-point.entity.js';
import { seedFoodTopics } from 'src/modules/food-topics/tests/factories/food-topic.factory.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { AdminReviewsController } from '../controllers/admin.reviews.controller.js';
import { Review } from '../entities/review.entity.js';
import { brandFactory } from './factories/brand.factory.js';
import { venueFactory } from './factories/venue.factory.js';

describe('AdminReviewsController (pglite)', () => {
	let harness: PgliteTestingModule;
	let controller: AdminReviewsController;

	beforeAll(async () => {
		harness = await createPgliteTestingModule({ providers: [AdminReviewsController] });
		controller = harness.moduleRef.get(AdminReviewsController);
		entityManagerManager.setEntityManager(harness.orm.em);
	});

	afterAll(async () => {
		await harness.stop();
	});

	it("lists every branch's reviews, and the ones that need a reply worst first", async () => {
		const em = harness.orm.em;
		const city = await cityFactory.create({ name: 'Berlin' });
		const brand = brandFactory.build({ name: 'Burgermeister' });
		const kotti = venueFactory.build({ name: 'Burgermeister Kotti', street: 'Skalitzer Str. 136' }, { associations: { city, brand } });
		const zoo = venueFactory.build({ name: 'Burgermeister Zoo' }, { associations: { city, brand } });
		const other = venueFactory.build({ name: 'Other' }, { associations: { city } });
		await em.flush();
		const review = (venue: typeof kotti, day: string, stars: number, extra: Partial<Review> = {}) =>
			em.create(Review, { venue, reviewId: `r-${day}-${stars}-${venue.name}`, publishedAt: new Date(`2026-09-${day}T10:00:00Z`), stars, text: 'Written', ...extra });
		review(kotti, '03', 2);
		review(zoo, '04', 1);
		review(zoo, '05', 3, { ownerResponse: 'Thanks' });
		review(kotti, '06', 3, { markedRepliedAt: new Date() });
		review(kotti, '07', 2, { text: null });
		review(kotti, '08', 5);
		review(other, '09', 1);
		await em.flush();

		const all = await controller.listReviews({ page: 1, size: 25, brandId: brand.id, month: '2026-09' });
		expect(all.totalItems).toBe(6);
		expect(all.items[0]).toMatchObject({ stars: 5, branch: { name: 'Burgermeister Kotti', street: 'Skalitzer Str. 136' } });

		const reply = await controller.listReviews({ page: 1, size: 25, brandId: brand.id, needsReply: true });
		expect(reply.items.map(r => [r.branch.name, r.stars])).toEqual([
			['Burgermeister Zoo', 1],
			['Burgermeister Kotti', 2],
		]);
	});

	it('serves a feedback row with the food topic of its dish, so a page can link to the topic', async () => {
		const em = harness.orm.em;
		const topics = seedFoodTopics(em, ['burgers']);
		const city = await cityFactory.create({ name: 'Hamburg' });
		const brand = brandFactory.build({ name: 'Patty Place' });
		const venue = venueFactory.build({ name: 'Patty Place' }, { associations: { city, brand } });
		await em.flush();
		const review = em.create(Review, { venue, reviewId: 'r-topic', publishedAt: new Date('2026-09-10T10:00:00Z'), stars: 5, text: 'Juicy' });
		em.create(FeedbackPoint, {
			sourceKind: 'review',
			review,
			city,
			month: '2026-09',
			sentiment: 'positive',
			topic: 'food',
			theme: 'taste',
			detail: 'juicy patty',
			dish: 'Smash burger',
			dishKey: 'smash burger',
			foodTopic: topics.get('burgers'),
		});
		await em.flush();
		em.clear();

		const { items } = await controller.listReviews({ page: 1, size: 25, brandId: brand.id });
		expect(items[0].feedback).toEqual([
			expect.objectContaining({ dish: 'Smash burger', foodTopic: expect.objectContaining({ key: 'burgers', label: 'Burgers' }) }),
		]);
	});
});
