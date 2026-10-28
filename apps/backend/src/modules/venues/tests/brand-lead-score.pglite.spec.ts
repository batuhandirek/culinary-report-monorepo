import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';

import { CityService } from 'src/modules/cities/services/city.service.js';
import { addFeedback } from 'src/modules/feedback/tests/factories/feedback.factory.js';
import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { Mention } from 'src/modules/social/entities/mention.entity.js';
import { SocialPlatformEnum, SocialPost } from 'src/modules/social/entities/social-post.entity.js';
import { ownAccount } from 'src/modules/social/tests/factories/social-account.factory.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { Review } from '../entities/review.entity.js';
import { Venue } from '../entities/venue.entity.js';
import type { LeadInputs } from '../interfaces/lead-score.interface.js';
import { BrandLeadScoreService,scoreBrands } from '../services/brand-lead-score.service.js';

const base: LeadInputs = {
	name: 'Somewhere',
	reviewsCount: 1000,
	hasWebsite: false,
	hasPhone: false,
	posts: 0,
	views: 0,
	creators: 0,
	ownPosts: 0,
	promotionalPosts: 0,
	negativePosts: 0,
	reviews: null,
};

describe('scoreBrand', () => {
	const busy: LeadInputs = {
		...base,
		name: 'Döner Pro',
		posts: 10,
		views: 500_000,
		creators: 9,
		ownPosts: 2,
		hasPhone: true,
		// 40 % complaint share, 20 % reply rate
		reviews: {
			total: 10,
			analysed: 10,
			withComplaints: 4,
			replied: 2,
			unansweredCritical: 2,
			withChanges: 0,
		},
		// Searched, nothing found: known, so not missing
		press: { features: 0, listicles: 0, passing: 0 },
	};
	const quiet: LeadInputs = { ...base, name: 'Quiet Corner', posts: 1, views: 300, creators: 1 };

	const [a, b] = scoreBrands([busy, quiet], '2026-09');

	it('ranks a venue others talk about, with a nameable problem, above a quiet one', () => {
		expect(a.score).toBeGreaterThan(b.score);
		expect(a.signals.buzz.value).toBeGreaterThan(b.signals.buzz.value!);
		expect(a.signals.problem.inputs).toMatchObject({ complaintShare: 0.4, replyRate: 0.2 });
		expect(a.signals.spends.value).toBe(0.5);
		expect(a.signals.reachable.value).toBe(1);
		expect(a.signals.missing).toEqual([]);
	});

	it('leaves the problem unknown, not zero, without scraped reviews', () => {
		expect(b.signals.problem.value).toBeNull();
		expect(b.signals.missing).toContain('reviews not scraped');
	});

	it("halves a name on the city's deny-list, and says so", () => {
		// The city's deny-list, matched on the normalized name
		const [rewe] = scoreBrands([{ ...quiet, name: 'REWE' }], '2026-09', ['Rewe']);
		const [plain] = scoreBrands([{ ...quiet, name: 'REWE' }], '2026-09');
		expect(rewe.signals.denyListed).toBe(true);
		expect(plain.signals.denyListed).toBeUndefined();
		expect(rewe.score).toBeCloseTo(plain.score / 2, 1);
	});

	it('adds the new-place bonus for a recent opening with few reviews', () => {
		const [fresh] = scoreBrands(
			[{ ...quiet, openedAt: new Date('2026-08-01T00:00:00Z'), reviewsCount: 50 }],
			'2026-09',
		);
		expect(fresh.signals.newPlaceBonus).toBe(5);
		// An opening older than LEAD_NEW_PLACE_MONTHS is no longer new
		const [old] = scoreBrands(
			[{ ...quiet, openedAt: new Date('2025-12-01T00:00:00Z'), reviewsCount: 50 }],
			'2026-09',
		);
		expect(old.signals.newPlaceBonus).toBe(0);
		expect(b.signals.newPlaceBonus).toBe(0);
	});
});

describe('BrandLeadScoreService (pglite)', () => {
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

	it("scores every brand with an open venue in the city from the two months, own posts apart, and ranks them", async () => {
		const em = harness.orm.em;
		const city = testCity(em);
		const hot = em.create(Venue, { city, placeId: 'p-hot', name: 'Choc-Spot', phone: '+49 30 1' });
		const cold = em.create(Venue, { city, placeId: 'p-cold', name: 'Cold Place' });
		const closed = em.create(Venue, { city, placeId: 'p-closed', name: 'Gone', closed: true });
		// Another city's venue: not scored with this city's run
		const elsewhere = em.create(Venue, { city: testCity(em, { name: 'Wien' }), placeId: 'p-wien', name: 'Wiener' });
		// The venues' brands come with the flush; Choc-Spot's own account is linked to its brand
		await em.flush();
		const own = ownAccount(em, hot.brand, city, 'chocspot.berlin');
		let n = 0;
		const post = (venue: Venue, author: string, postedAt: string, isPromotional = false) => {
			const p = em.create(SocialPost, {
				city: venue.city,
				externalId: `x${++n}`,
				platform: SocialPlatformEnum.TIKTOK,
				url: `https://tiktok.com/x${n}`,
				postedAt: new Date(postedAt),
				author,
				account: author === own.handle ? own : undefined,
				views: 1000,
				isPromotional,
			});
			em.create(Mention, {
				post: p,
				venueName: venue.name,
				venue,
				visited: true,
				sentiment: 'mixed',
				summary: 'Hm.',
			});
		};
		post(hot, 'chocspot.berlin', '2026-09-03T00:00:00Z');
		post(hot, 'foodie', '2026-08-20T00:00:00Z', true);
		post(hot, 'eater', '2026-09-05T00:00:00Z');
		// Outside the two months
		post(cold, 'foodie', '2026-06-01T00:00:00Z');
		post(closed, 'foodie', '2026-09-01T00:00:00Z');
		post(elsewhere, 'foodie', '2026-09-01T00:00:00Z');
		addFeedback(
			em,
			em.create(Review, {
				reviewId: 'r1',
				venue: hot,
				publishedAt: new Date('2026-09-10T00:00:00Z'),
				stars: 2,
				text: 'Sold out again.',
				analysedAt: new Date(),
			}),
			{ complaints: [{ topic: 'wait', detail: 'sold out' }] },
		);
		await em.flush();

		expect(await service.scoreAll('2026-09', city.id)).toMatchObject({ scored: 2 });
		em.clear();

		const brandOf = async (placeId: string) =>
			(await em.findOneOrFail(Venue, { placeId }, { populate: ['brand'] })).brand;
		expect((await brandOf('p-wien')).leadScore).toBeNull();
		const [first, second, ...rest] = await service.ranked({ limit: 10, cityId: city.id });
		expect(rest).toEqual([]);
		expect([first.name, second.name]).toEqual(['Choc-Spot', 'Cold Place']);
		expect(first.leadSignals?.buzz.inputs).toMatchObject({ posts: 2, creators: 2 });
		expect(first.leadSignals?.spends.inputs).toMatchObject({
			ownPosts: 1,
			promotionalPosts: 1,
		});
		expect(first.leadSignals?.problem.inputs).toMatchObject({
			reviews: 1,
			complaintShare: 1,
			unansweredCritical: 1,
			replyRate: 0,
			negativePostShare: 1,
		});
		expect(second.leadSignals?.buzz.value).toBe(0);
		expect((await brandOf('p-closed')).leadScore).toBeNull();
		// The score is the brand's
		expect((await brandOf('p-hot')).id).toBe(first.id);
		expect(await service.ranked({ limit: 10, minScore: first.leadScore! })).toHaveLength(1);
	});

	it('gives the new-place bonus to a venue recent posts said had just opened, under the review cap', async () => {
		const em = harness.orm.em;
		const city = testCity(em, { name: 'Leipzig' });
		const venue = (placeId: string, reviewsCount: number) =>
			em.create(Venue, { city, placeId, name: `New ${placeId}`, reviewsCount });
		const fresh = venue('n-fresh', 40);
		const old = venue('n-old', 40);
		const big = venue('n-big', 300);
		const lone = venue('n-lone', 40);
		await em.flush();
		let n = 0;
		// Two people's posts say so: one post alone is no opening (`postOpeningsSql`)
		const flagged = (v: Venue, postedAt: string, authors = ['foodie', 'eater']) => {
			for (const author of authors) {
				const p = em.create(SocialPost, {
					city,
					externalId: `n${++n}`,
					platform: SocialPlatformEnum.TIKTOK,
					url: `https://tiktok.com/n${n}`,
					postedAt: new Date(postedAt),
					author,
					views: 1000,
				});
				em.create(Mention, {
					post: p,
					venueName: v.name,
					venue: v,
					visited: true,
					isNewOpening: true,
					sentiment: 'positive',
					summary: 'Just opened.',
				});
			}
		};
		// Last month of the report month: new
		flagged(fresh, '2026-08-15T00:00:00Z');
		// Older than LEAD_NEW_PLACE_MONTHS before the report month's end: no longer new
		flagged(old, '2026-02-15T00:00:00Z');
		// LEAD_NEW_PLACE_MAX_REVIEWS reviews: not new, whatever the post says
		flagged(big, '2026-08-15T00:00:00Z');
		// One person's post and nothing agreeing: not new
		flagged(lone, '2026-08-15T00:00:00Z', ['foodie']);
		await em.flush();

		await service.scoreAll('2026-09', city.id);
		em.clear();
		const bonus = async (placeId: string) =>
			(await em.findOneOrFail(Venue, { placeId }, { populate: ['brand'] })).brand.leadSignals
				?.newPlaceBonus;
		expect(await bonus('n-fresh')).toBe(5);
		expect(await bonus('n-old')).toBe(0);
		expect(await bonus('n-big')).toBe(0);
		expect(await bonus('n-lone')).toBe(0);
	});
});
