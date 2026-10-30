import { BadRequestException, NotFoundException } from '@nestjs/common';

import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';

import type { City } from 'src/modules/cities/entities/city.entity.js';
import { addFeedback } from 'src/modules/feedback/tests/factories/feedback.factory.js';
import type { AnsweredPoint } from 'src/modules/feedback/util/feedback-rows.js';
import { CityService } from 'src/modules/cities/services/city.service.js';
import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { TopicService } from 'src/modules/topics/services/topic.service.js';
import { VenueTopicService } from 'src/modules/topics/services/venue-topic.service.js';
import { seedTopics } from 'src/modules/topics/tests/factories/topic.factory.js';
import { OutreachService } from 'src/modules/outreach/services/outreach.service.js';
import { Report } from 'src/modules/reports/entities/report.entity.js';
import type {
	ReportData,
	ReportHighlights,
} from 'src/modules/reports/interfaces/report-data.interface.js';
import { ReportService } from 'src/modules/reports/services/report.service.js';
import { ReportConfigService } from 'src/modules/reports/services/report-config.service.js';
import { ReportTemplateService } from 'src/modules/reports/services/report-template.service.js';
import { Mention } from 'src/modules/social/entities/mention.entity.js';
import { SocialPlatformEnum, SocialPost } from 'src/modules/social/entities/social-post.entity.js';
import { BrandPostsService } from 'src/modules/social/services/brand-posts.service.js';
import { ownAccount } from 'src/modules/social/tests/factories/social-account.factory.js';
import { Brand } from 'src/modules/venues/entities/brand.entity.js';
import { CompetitorPickedByEnum } from 'src/modules/venues/entities/brand-competitor.entity.js';
import { Review } from 'src/modules/venues/entities/review.entity.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { BrandService } from 'src/modules/venues/services/brand.service.js';
import { CompetitorService } from 'src/modules/venues/services/competitor.service.js';
import { ReviewService } from 'src/modules/venues/services/review.service.js';
import { brandFactory } from 'src/modules/venues/tests/factories/brand.factory.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { PortalController } from '../controllers/portal.controller.js';
import { PortalService } from '../services/portal.service.js';

describe('the portal explorers and competitor picks (pglite)', () => {
	let harness: PgliteTestingModule;
	let controller: PortalController;
	let competitors: CompetitorService;
	let city: City;
	let count = 0;

	const em = () => harness.orm.em;

	/** A venue with a brand of its own (made here, so mentions can name it before a flush), or `extra.brand`'s branch. */
	const newVenue = (name: string, extra: Partial<Venue> = {}) =>
		em().create(Venue, {
			city,
			placeId: `place-${count++}`,
			name,
			category: 'Restaurant',
			brand: em().create(Brand, { name, key: name.toLowerCase() }),
			...extra,
		} as Venue);

	/** A review; `praise` / `complaints` become its feedback rows */
	const newReview = (
		venue: Venue,
		{ praise = [], complaints = [], ...extra }: Partial<Review> & { praise?: AnsweredPoint[]; complaints?: AnsweredPoint[] },
	) => {
		const review = em().create(Review, {
			reviewId: `review-${count++}`,
			venue,
			publishedAt: new Date('2026-09-10T12:00:00Z'),
			...extra,
		} as Review);
		addFeedback(em(), review, { praise, complaints });
		return review;
	};

	/** A post about the venue; `brandOnly`: it named the brand but no branch. */
	const newPost = (venue: Venue, extra: Partial<SocialPost>, summary = 'Good döner', brandOnly = false) => {
		const post = em().create(SocialPost, {
			externalId: `post-${count++}`,
			platform: SocialPlatformEnum.TIKTOK,
			city,
			url: `https://tiktok.com/@x/video/${count}`,
			postedAt: new Date('2026-09-05T12:00:00Z'),
			...extra,
		} as SocialPost);
		const mention = em().create(Mention, {
			post,
			brand: venue.brand,
			venue: brandOnly ? null : venue,
			venueName: venue.name,
			visited: true,
			sentiment: 'positive',
			summary,
		});
		addFeedback(em(), mention, { dishes: [{ name: 'döner', sentiment: 'positive' }] });
		return post;
	};

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				PortalController,
				PortalService,
				ReportService,
				ReportConfigService,
				ReportTemplateService,
				OutreachService,
				ReviewService,
				BrandPostsService,
				CompetitorService,
				TopicService,
				VenueTopicService,
				BrandService,
				CityService,
			],
		});
		controller = harness.moduleRef.get(PortalController);
		competitors = harness.moduleRef.get(CompetitorService);
		entityManagerManager.setEntityManager(harness.orm.em);
		city = testCity(em());
		seedTopics(em());
		await em().flush();
	});

	afterAll(async () => {
		await harness.stop();
	});

	describe('reviews', () => {
		let venue: Venue;
		let critical: Review;
		let answered: Review;
		let drafted: Review;

		beforeAll(async () => {
			venue = newVenue('Review House');
			const other = newVenue('Other House');
			critical = newReview(venue, {
				stars: 2,
				text: 'Kalt und langsam',
				textTranslated: 'Cold and slow',
				language: 'de',
				complaints: [{ topic: 'service', detail: 'slow' }],
				replyDraft: 'Danke, das schauen wir uns an.',
			});
			answered = newReview(venue, {
				stars: 1,
				text: 'Rude staff',
				language: 'en',
				ownerResponse: 'Sorry!',
				complaints: [{ topic: 'service', detail: 'rude' }],
			});
			drafted = newReview(venue, {
				stars: 3,
				text: 'Okay food',
				language: 'en',
				praise: [{ topic: 'food', detail: 'okay' }],
				publishedAt: new Date('2026-08-20T12:00:00Z'),
			});
			newReview(venue, { stars: 5, publishedAt: new Date('2026-09-12T12:00:00Z') });
			newReview(venue, {
				stars: 5,
				text: 'Great',
				language: 'en',
				praise: [{ topic: 'food', detail: 'great' }],
			});
			newReview(other, { stars: 1, text: 'Not this venue', language: 'en' });
			em().create(Report, {
				brand: venue.brand,
				city,
				month: '2026-08',
				data: {
					reviews: {
						replyDrafts: [
							{ reviewId: drafted.reviewId, draft: 'Thanks for coming by!' },
							{ reviewId: answered.reviewId, draft: 'Should not show: answered' },
						],
					},
				} as unknown as ReportData,
				highlights: { title: 't', headline: 'h' } as ReportHighlights,
			});
			await em().flush();
		});

		const list = (query: Record<string, unknown> = {}) =>
			controller.listPortalReviews(venue.brand.id, { page: 1, size: 20, ...query });

		it("pages through the brand's reviews only, newest first", async () => {
			const all = await list();
			expect(all.totalItems).toBe(5);
			expect(all.items.map(r => r.publishedAt.toISOString())).toEqual(
				[...all.items.map(r => r.publishedAt.toISOString())].sort().reverse(),
			);
			const page2 = await list({ page: 2, size: 2 });
			expect(page2).toMatchObject({ totalItems: 5, page: 2, pageSize: 2 });
			expect(page2.items).toHaveLength(2);
			expect((await list({ page: 9, size: 2 })).totalItems).toBe(5);
		});

		it('filters by month, stars, topic, answered and language', async () => {
			expect((await list({ month: '2026-08' })).items.map(r => r.id)).toEqual([drafted.id]);
			expect((await list({ stars: 2 })).items.map(r => r.id)).toEqual([critical.id]);
			expect((await list({ topic: 'service' })).items.map(r => r.id).sort()).toEqual(
				[critical.id, answered.id].sort(),
			);
			expect((await list({ answered: true })).items.map(r => r.id)).toEqual([answered.id]);
			expect((await list({ language: 'de' })).items.map(r => r.id)).toEqual([critical.id]);
		});

		it('lists the reviews needing a reply, lowest stars first, with their drafts', async () => {
			const { items } = await list({ needsReply: true });
			expect(items.map(r => r.id)).toEqual([critical.id, drafted.id]);
			// The alert's own draft, then a report's
			expect(items[0].replyDraft).toBe('Danke, das schauen wir uns an.');
			expect(items[1].replyDraft).toBe('Thanks for coming by!');
			const answeredOut = (await list({ answered: true })).items[0];
			expect(answeredOut).toMatchObject({ answered: true });
			expect(answeredOut.replyDraft).toBeUndefined();
		});

		it('gives the filter values and the to-do count', async () => {
			const filters = await controller.getPortalReviewFilters(venue.brand.id);
			expect(filters.months).toEqual([
				{ month: '2026-09', count: 4 },
				{ month: '2026-08', count: 1 },
			]);
			expect(filters.languages).toEqual([
				{ language: 'en', count: 3 },
				{ language: 'de', count: 1 },
			]);
			expect(filters.topics).toEqual([
				{ topic: 'food', count: 2 },
				{ topic: 'service', count: 2 },
			]);
			expect(filters.needsReply).toBe(2);
		});

		it("keeps the owner's answered mark, and refuses another brand's review", async () => {
			const marked = await controller.markPortalReviewReplied(venue.brand.id, critical.id, {
				replied: true,
			});
			expect(marked.answered).toBe(true);
			expect(marked.replyDraft).toBeUndefined();
			em().clear();
			expect(
				(await em().findOneOrFail(Review, { id: critical.id })).markedRepliedAt,
			).toBeInstanceOf(Date);
			expect((await list({ needsReply: true })).items.map(r => r.id)).toEqual([drafted.id]);

			const unmarked = await controller.markPortalReviewReplied(venue.brand.id, critical.id, {
				replied: false,
			});
			expect(unmarked.answered).toBe(false);

			const other = await em().findOneOrFail(Review, { text: 'Not this venue' });
			await expect(
				controller.markPortalReviewReplied(venue.brand.id, other.id, { replied: true }),
			).rejects.toBeInstanceOf(NotFoundException);
		});
	});

	describe('a chain', () => {
		it("shows every branch's reviews and posts, the brand-only ones too, and no branch of its own as a competitor", async () => {
			const brand = await brandFactory.create({ name: 'Nefis' });
			const hermannplatz = newVenue('Nefis Gemüse Kebap Hermannplatz', {
				brand,
				street: 'Hasenheide 1',
				district: 'Neukölln',
				reviewsCount: 900,
			});
			const kotti = newVenue('Nefis Gemüse Kebap Kotti', {
				brand,
				street: 'Skalitzer Str. 1',
				district: 'Neukölln',
				reviewsCount: 300,
			});
			newReview(hermannplatz, { stars: 2, text: 'Slow' });
			const there = newReview(kotti, { stars: 1, text: 'Cold' });
			newPost(hermannplatz, { author: 'a', views: 300 });
			newPost(kotti, { author: 'b', views: 200 });
			newPost(kotti, { author: 'c', views: 100 }, 'Nefis is great', true);
			await em().flush();

			const { items } = await controller.listPortalReviews(brand.id, { page: 1, size: 20 });
			expect(items.map(r => r.branch).sort()).toEqual([
				'Nefis Gemüse Kebap Hermannplatz · Hasenheide 1',
				'Nefis Gemüse Kebap Kotti · Skalitzer Str. 1',
			]);
			expect((await controller.getPortalReviewFilters(brand.id)).needsReply).toBe(2);
			expect(
				(await controller.markPortalReviewReplied(brand.id, there.id, { replied: true })).answered,
			).toBe(true);

			const posts = await controller.listPortalPosts(brand.id, { page: 1, size: 10 });
			expect(posts.items.map(p => p.views).sort()).toEqual([100, 200, 300]);
			expect(posts.items.find(p => p.views === 100)?.summary).toBe('Nefis is great');
			expect((await controller.listPortalCreators(brand.id, {})).items).toHaveLength(3);

			// Its own branches are never its competition
			await expect(competitors.add(brand.id, { venueId: kotti.id })).rejects.toBeInstanceOf(
				BadRequestException,
			);
			expect((await controller.searchPortalCompetitors(brand.id, { q: 'nefis' })).items).toEqual([]);
			expect((await competitors.suggest(brand.id)).map(s => s.venue.id)).not.toContain(kotti.id);
		});
	});

	describe('posts', () => {
		let venue: Venue;

		beforeAll(async () => {
			venue = newVenue('Chén Chè');
			newPost(venue, { author: 'foodie', authorFans: 1000, views: 500, isAd: true });
			newPost(venue, {
				author: 'Foodie',
				authorFans: 1200,
				views: 1500,
				postedAt: new Date('2026-09-20T12:00:00Z'),
			});
			newPost(venue, {
				author: 'chenche_berlin',
				// Its own account, linked to its brand
				account: ownAccount(em(), venue.brand, city, 'chenche_berlin', SocialPlatformEnum.INSTAGRAM),
				views: 100,
				platform: SocialPlatformEnum.INSTAGRAM,
				postedAt: new Date('2026-08-02T12:00:00Z'),
			});
			newPost(newVenue('Elsewhere'), { author: 'foodie', views: 9999 });
			await em().flush();
		});

		it('lists every post about the brand with its paid and own flags', async () => {
			const all = await controller.listPortalPosts(venue.brand.id, { page: 1, size: 10 });
			expect(all.totalItems).toBe(3);
			expect(all.items.map(p => p.views)).toEqual([1500, 500, 100]);
			expect(all.items[1]).toMatchObject({
				paid: true,
				own: false,
				summary: 'Good döner',
				visited: true,
			});
			expect(all.items[2]).toMatchObject({ own: true, platform: 'instagram' });

			expect(
				(
					await controller.listPortalPosts(venue.brand.id, {
						page: 1,
						size: 10,
						month: '2026-08',
					})
				).items,
			).toHaveLength(1);
			expect(
				(
					await controller.listPortalPosts(venue.brand.id, {
						page: 1,
						size: 10,
						platform: SocialPlatformEnum.TIKTOK,
					})
				).totalItems,
			).toBe(2);
			expect((await controller.getPortalPostFilters(venue.brand.id)).months).toEqual([
				{ month: '2026-09', count: 2 },
				{ month: '2026-08', count: 1 },
			]);
		});

		it('groups the posts by creator, most viewed first', async () => {
			const { items } = await controller.listPortalCreators(venue.brand.id, {});
			expect(items).toHaveLength(2);
			expect(items[0]).toMatchObject({
				posts: 2,
				views: 2000,
				paid: 1,
				authorFans: 1200,
				own: false,
			});
			expect(items[1]).toMatchObject({ author: 'chenche_berlin', own: true, posts: 1 });
		});
	});

	describe('competitors', () => {
		let venue: Venue;
		let rivals: Venue[];
		let closed: Venue;
		let faraway: Venue;
		let shop: Venue;

		beforeAll(async () => {
			venue = newVenue('Döner Pro', { district: 'Neukölln' });
			rivals = ['Rüyam', 'Mustafa', 'Imren', 'Bistro Legal', 'K’Ups', 'Hasir'].map(name =>
				newVenue(`${name} Kebab`, { district: 'Neukölln' }),
			);
			closed = newVenue('Closed Kebab', { closed: true });
			faraway = newVenue('Faraway Kebab', { city: testCity(em(), { slug: 'elsewhere' }) });
			shop = newVenue('Kebab Supplies', { category: 'Hardware store' });
			await em().flush();
		});

		it('adds up to five as the owner, refuses a sixth, and the admin sees the same list', async () => {
			const brandId = venue.brand.id;
			for (const rival of rivals.slice(0, 4))
				await controller.addPortalCompetitor(brandId, { venueId: rival.id });
			await competitors.add(brandId, { venueId: rivals[4].id }); // an admin's pick
			const listed = await controller.listPortalCompetitors(brandId);
			expect(listed.items).toHaveLength(5);
			expect(listed.max).toBe(5);
			expect(listed.suggestions).toEqual([]);
			expect(listed.items.find(i => i.venue?.id === rivals[4].id)?.pickedBy).toBe(
				CompetitorPickedByEnum.ADMIN,
			);
			expect(listed.items.find(i => i.venue?.id === rivals[0].id)?.pickedBy).toBe(
				CompetitorPickedByEnum.OWNER,
			);

			await expect(
				controller.addPortalCompetitor(brandId, { venueId: rivals[5].id }),
			).rejects.toBeInstanceOf(BadRequestException);
			await expect(competitors.add(brandId, { venueId: rivals[5].id })).rejects.toBeInstanceOf(
				BadRequestException,
			);
			// Neither or both: a place or a brand
			await expect(controller.addPortalCompetitor(brandId, {})).rejects.toBeInstanceOf(BadRequestException);

			const first = listed.items.find(i => i.venue?.id === rivals[0].id)!;
			const after = await controller.removePortalCompetitor(brandId, first.id);
			expect(after.items.map(i => i.venue?.id)).not.toContain(rivals[0].id);
			expect((await competitors.list(brandId)).map(l => l.venue!.id).sort()).toEqual(
				after.items.map(i => i.venue!.id).sort(),
			);
			// Another brand's entry is not this brand's to remove
			const other = await competitors.list(rivals[1].brand.id);
			expect(other).toEqual([]);
			await expect(controller.removePortalCompetitor(rivals[1].brand.id, first.id + 1000)).rejects.toBeInstanceOf(
				NotFoundException,
			);
		});

		it('lets the owner pick only open food venues of its cities', async () => {
			for (const venueOut of [closed, faraway, shop]) {
				await expect(
					controller.addPortalCompetitor(rivals[5].brand.id, { venueId: venueOut.id }),
				).rejects.toBeInstanceOf(BadRequestException);
			}
		});

		it('adds a whole rival brand with a branch in its city, but not one without', async () => {
			const chain = await brandFactory.create({ name: 'Rüyam Chain' });
			newVenue('Rüyam Gemüse Kebab Hermannstraße', { brand: chain, district: 'Neukölln' });
			newVenue('Rüyam Gemüse Kebab Schöneberg', { brand: chain });
			const away = await brandFactory.create({ name: 'Away Chain' });
			newVenue('Away Chain Altona', { brand: away, city: testCity(em(), { slug: 'altona' }) });
			await em().flush();

			const listed = await controller.addPortalCompetitor(rivals[5].brand.id, { brandId: chain.id });
			expect(listed.items).toEqual([
				expect.objectContaining({ brand: { id: chain.id, name: 'Rüyam Chain', branches: 2 } }),
			]);
			await expect(
				controller.addPortalCompetitor(rivals[5].brand.id, { brandId: away.id }),
			).rejects.toBeInstanceOf(BadRequestException);
		});

		it("searches the brand's cities' open food venues by name, each with its brand", async () => {
			const { items } = await controller.searchPortalCompetitors(venue.brand.id, { q: 'kebab' });
			const names = items.map(i => i.name);
			expect(names).toEqual(expect.arrayContaining(rivals.map(r => r.name)));
			expect(names).not.toContain('Closed Kebab');
			expect(names).not.toContain('Faraway Kebab');
			expect(names).not.toContain('Kebab Supplies');
			expect(names).not.toContain('Döner Pro');
			expect(items.find(i => i.name === rivals[0].name)?.brand).toEqual({
				id: rivals[0].brand.id,
				name: rivals[0].name,
				branches: 1,
			});
		});
	});
});
