import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';

import { cityFactory } from 'src/modules/cities/tests/factories/city.factory.js';
import { addStatements } from 'src/modules/statements/tests/factories/statement.factory.js';
import { TopicService } from 'src/modules/topics/services/topic.service.js';
import { seedTopics } from 'src/modules/topics/tests/factories/topic.factory.js';
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
		harness = await createPgliteTestingModule({
			providers: [AdminReviewsController, TopicService],
		});
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
		const kotti = venueFactory.build(
			{ name: 'Burgermeister Kotti', street: 'Skalitzer Str. 136' },
			{ associations: { city, brand } },
		);
		const zoo = venueFactory.build(
			{ name: 'Burgermeister Zoo' },
			{ associations: { city, brand } },
		);
		const other = venueFactory.build({ name: 'Other' }, { associations: { city } });
		await em.flush();
		const review = (
			venue: typeof kotti,
			day: string,
			stars: number,
			extra: Partial<Review> = {},
		) =>
			em.create(Review, {
				venue,
				reviewId: `r-${day}-${stars}-${venue.name}`,
				publishedAt: new Date(`2026-09-${day}T10:00:00Z`),
				stars,
				text: 'Written',
				...extra,
			});
		review(kotti, '03', 2);
		review(zoo, '04', 1);
		review(zoo, '05', 3, { ownerResponse: 'Thanks' });
		review(kotti, '06', 3, { markedRepliedAt: new Date() });
		review(kotti, '07', 2, { text: null });
		review(kotti, '08', 5);
		review(other, '09', 1);
		await em.flush();

		const all = await controller.listReviews({
			page: 1,
			size: 25,
			brandId: brand.id,
			month: '2026-09',
		});
		expect(all.totalItems).toBe(6);
		expect(all.items[0]).toMatchObject({
			stars: 5,
			branch: { name: 'Burgermeister Kotti', street: 'Skalitzer Str. 136' },
		});

		const reply = await controller.listReviews({
			page: 1,
			size: 25,
			brandId: brand.id,
			needsReply: true,
		});
		expect(reply.items.map(r => [r.branch.name, r.stars])).toEqual([
			['Burgermeister Zoo', 1],
			['Burgermeister Kotti', 2],
		]);
	});

	it("serves a review's statements with each part's aspect (and its root) or wording (and its main topic), so a page can name and link them", async () => {
		const em = harness.orm.em;
		seedTopics(em, ['burgers', 'taste']);
		const city = await cityFactory.create({ name: 'Hamburg' });
		const brand = brandFactory.build({ name: 'Patty Place' });
		const venue = venueFactory.build(
			{ name: 'Patty Place' },
			{ associations: { city, brand } },
		);
		await em.flush();
		const index = await harness.moduleRef.get(TopicService).index();
		const review = em.create(Review, {
			venue,
			reviewId: 'r-topic',
			publishedAt: new Date('2026-09-10T10:00:00Z'),
			stars: 5,
			text: 'Juicy',
		});
		addStatements(
			em,
			review,
			[
				{ text: 'juicy patty', sentiment: 'positive', aspect: 'taste', foods: ['Burger'] },
				// A claim filed at a root: an aspect without a parent
				{ text: 'not great', sentiment: 'negative', aspect: 'food' },
				// A dish the review listed that no claim names: no text
				{ foods: ['Pommes'], sentiment: 'positive' },
			],
			{ index },
		);
		await em.flush();
		em.clear();

		// Called directly, so the entity's other fields are still there: the DTO narrows them on the wire
		const { items } = await controller.listReviews({ page: 1, size: 25, brandId: brand.id });
		expect(items[0].statements).toEqual([
			expect.objectContaining({
				text: 'juicy patty',
				sentiment: 'positive',
				subject: 'place',
				parts: [
					expect.objectContaining({
						role: 'aspect',
						topic: expect.objectContaining({
							key: 'taste',
							label: 'Taste',
							kind: 'aspect',
							parent: expect.objectContaining({ key: 'food', label: 'Food' }),
						}),
					}),
					expect.objectContaining({
						role: 'food',
						term: expect.objectContaining({
							key: 'burger',
							name: 'Burger',
							exact: true,
							topic: expect.objectContaining({
								key: 'burgers',
								label: 'Burgers',
								kind: 'dish',
								parent: expect.objectContaining({ key: 'american' }),
							}),
							modifiers: [],
						}),
					}),
				],
			}),
			expect.objectContaining({
				text: 'not great',
				sentiment: 'negative',
				parts: [
					expect.objectContaining({
						role: 'aspect',
						topic: expect.objectContaining({ key: 'food', label: 'Food' }),
					}),
				],
			}),
			expect.objectContaining({
				sentiment: 'positive',
				// A wording not decided yet: the term alone, no main topic and no modifiers
				parts: [
					expect.objectContaining({
						role: 'food',
						term: expect.objectContaining({ name: 'Pommes', exact: false, modifiers: [] }),
					}),
				],
			}),
		]);
		expect(items[0].statements[1].parts[0].topic).not.toHaveProperty('parent');
		expect(items[0].statements[2].parts[0].term?.topic ?? undefined).toBeUndefined();
		expect(items[0].statements[2]).not.toHaveProperty('text');
	});

	it('serves one review on its own page: its branch, brand and city, and every claim it made', async () => {
		const em = harness.orm.em;
		// The aspects the suite's first case seeded (one harness, one schema)
		const city = await cityFactory.create({ name: 'Leipzig' });
		const brand = brandFactory.build({ name: 'Kebab Haus' });
		const venue = venueFactory.build(
			{ name: 'Kebab Haus Mitte', district: 'Mitte' },
			{ associations: { city, brand } },
		);
		await em.flush();
		const index = await harness.moduleRef.get(TopicService).index();
		const review = em.create(Review, {
			venue,
			reviewId: 'r-detail',
			publishedAt: new Date('2026-10-02T10:00:00Z'),
			stars: 2,
			text: 'Zu salzig',
			textTranslated: 'Too salty',
			ownerResponse: 'Sorry!',
		});
		addStatements(em, review, [{ text: 'too salty', sentiment: 'negative', aspect: 'taste' }], { index });
		await em.flush();
		em.clear();

		const detail = await controller.getReview(review.id);
		expect(detail).toMatchObject({
			id: review.id,
			stars: 2,
			text: 'Zu salzig',
			textTranslated: 'Too salty',
			ownerResponse: 'Sorry!',
			branch: { id: venue.id, name: 'Kebab Haus Mitte', district: 'Mitte' },
			brand: { id: brand.id, name: 'Kebab Haus' },
			city: { id: city.id, name: 'Leipzig' },
		});
		expect(detail.statements).toEqual([
			expect.objectContaining({
				text: 'too salty',
				sentiment: 'negative',
				parts: [expect.objectContaining({ role: 'aspect', topic: expect.objectContaining({ key: 'taste' }) })],
			}),
		]);
		await expect(controller.getReview('00000000-0000-4000-8000-000000000000')).rejects.toThrow();
	});
});
