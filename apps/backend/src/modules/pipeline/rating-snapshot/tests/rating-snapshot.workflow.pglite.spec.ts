import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';

import type { GoogleMapsReviewItem } from 'src/modules/apify/actors/google-maps-reviews.actor.js';
import { ApifyService } from 'src/modules/apify/services/apify.service.js';
import { FakeApify } from 'src/modules/apify/tests/factories/fake-apify.js';
import type { City } from 'src/modules/cities/entities/city.entity.js';
import { CityService } from 'src/modules/cities/services/city.service.js';
import { cityFactory } from 'src/modules/cities/tests/factories/city.factory.js';
import { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';
import { fakeDurable } from 'src/modules/durable-workflows/tests/factories/durable.mock.js';
import { Mention } from 'src/modules/social/entities/mention.entity.js';
import { SocialPlatformEnum, SocialPost } from 'src/modules/social/entities/social-post.entity.js';
import { Brand } from 'src/modules/venues/entities/brand.entity.js';
import { Review } from 'src/modules/venues/entities/review.entity.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { VenueSnapshot } from 'src/modules/venues/entities/venue-snapshot.entity.js';
import { RatingSnapshotService } from 'src/modules/venues/services/rating-snapshot.service.js';
import { ReviewService } from 'src/modules/venues/services/review.service.js';
import { VenueService } from 'src/modules/venues/services/venue.service.js';
import { brandKey } from 'src/modules/venues/util/brands.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { ReviewsWorkflow } from '../../atoms/reviews/workflows/reviews.workflow.js';
import { PipelineStepEnum } from '../../constants/pipeline.constant.js';
import { RatingSnapshotWorkflow } from '../workflows/rating-snapshot.workflow.js';

const NOW = new Date('2026-10-25T04:30:00Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

/**
 * The weekly fetch as the operation runs it (the facade faked to run a started child inline, the
 * clock fixed): the city's due venues in order, one `reviews.run` per start day, the check of the
 * quiet ones by their newest review, and the week after starting every venue at its last fetch.
 */
describe('RatingSnapshotWorkflow (pglite)', () => {
	let harness: PgliteTestingModule;
	let workflow: RatingSnapshotWorkflow;
	let reviews: ReviewsWorkflow;
	let service: RatingSnapshotService;
	let city: City;
	const v: Record<string, Venue> = {};
	// What each place has on Google, newest first; the actor returns those from the start day on,
	// or with `maxReviews: 1` the newest alone. `cut` places are what a cap stopped before
	const onGoogle = new Map<string, { reviewId: string; publishedAtDate: string }[]>();
	const cut = new Set<string>();
	const apify = new FakeApify<GoogleMapsReviewItem>();
	apify.answer = input =>
		(input.placeIds as string[]).flatMap((placeId, i) => {
			const stored = onGoogle.get(placeId) ?? [];
			const picked =
				input.maxReviews === 1 ? stored.slice(0, 1)
				: cut.has(placeId) ? []
				: stored.filter(
						r => r.publishedAtDate.slice(0, 10) >= (input.reviewsStartDate as string),
					);
			return picked.map(r => ({
				placeId,
				...r,
				stars: 5,
				text: 'Lovely',
				totalScore: 4.1 + i / 10,
				reviewsCount: 1000 + i,
			}));
		});
	let clock = NOW;
	const durable = fakeDurable(() => [workflow, reviews], 'op-1');
	durable.step = async <T>(name: string, fn: () => Promise<T>): Promise<T> =>
		name === 'clock' ? (clock.toISOString() as unknown as T) : fn();
	const at = (days: number) => new Date(NOW.getTime() + days * 86_400_000).toISOString();
	let r = 0;
	const googleReviews = (placeId: string, ...days: number[]) =>
		onGoogle.set(
			placeId,
			days
				.sort((a, b) => b - a)
				.map(d => ({ reviewId: `r-${placeId}-${++r}`, publishedAtDate: at(d) })),
		);

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				RatingSnapshotWorkflow,
				ReviewsWorkflow,
				RatingSnapshotService,
				ReviewService,
				VenueService,
				CityService,
				{ provide: ApifyService, useValue: apify },
				{ provide: DurableWorkflowsService, useValue: durable },
			],
		});
		workflow = harness.moduleRef.get(RatingSnapshotWorkflow);
		reviews = harness.moduleRef.get(ReviewsWorkflow);
		service = harness.moduleRef.get(RatingSnapshotService);
		entityManagerManager.setEntityManager(harness.orm.em);
		const em = harness.orm.em;
		city = await cityFactory.create({
			stepBudgetsUsd: { [PipelineStepEnum.SNAPSHOT_RATINGS]: 3 },
		});
		const elsewhere = await cityFactory.create({ slug: 'hamburg', name: 'Hamburg' });
		const chain = em.create(Brand, { name: 'Chain Burger', key: brandKey('Chain Burger') });
		const venue = (key: string, params: Partial<Venue> = {}) =>
			(v[key] = em.create(Venue, {
				city,
				placeId: `p-${key}`,
				name: key,
				category: 'Restaurant',
				...params,
			} as Venue));
		venue('twice', { reviewsCount: null });
		venue('once', { reviewsCount: 40 });
		venue('stale', { reviewsCount: 100 });
		venue('popular', { reviewsCount: 3015 });
		venue('closedPopular', { reviewsCount: 900, closed: true });
		venue('quiet', { reviewsCount: 499 });
		venue('branchA', { reviewsCount: 200, brand: chain });
		venue('branchB', { reviewsCount: 100, brand: chain });
		venue('branchAway', { reviewsCount: 50, brand: chain, city: elsewhere });
		venue('popularAway', { reviewsCount: 2000, city: elsewhere });
		venue('silent', { reviewsCount: 800 });

		let n = 0;
		const post = (postedAt: Date, mention: Partial<Mention>) =>
			em.create(Mention, {
				post: em.create(SocialPost, {
					city,
					externalId: `rs-${++n}`,
					platform: SocialPlatformEnum.TIKTOK,
					url: `https://tiktok.com/rs/${n}`,
					author: 'foodie',
					postedAt,
				}),
				venueName: 'x',
				visited: true,
				...mention,
			});
		post(daysAgo(2), { venue: v.twice });
		post(daysAgo(9), { venue: v.twice });
		post(daysAgo(5), { venue: v.once });
		// Outside the 30 days
		post(daysAgo(40), { venue: v.stale });
		// A post naming the chain but no branch: its branches in the city
		post(daysAgo(3), { brand: chain });
		// Talked about but closed
		post(daysAgo(3), { venue: v.closedPopular });
		await em.flush();
	});

	afterAll(async () => {
		await harness.stop();
	});

	it('takes every open venue of the city: those posted about in the last 30 days most first, then the most reviewed', async () => {
		const due = await service.due(city, NOW);
		expect(due.map(d => [d.id, d.posts])).toEqual([
			[v.twice.id, 2],
			[v.branchA.id, 1],
			[v.branchB.id, 1],
			[v.once.id, 1],
			[v.popular.id, 0],
			[v.silent.id, 0],
			[v.quiet.id, 0],
			// Its posts are older than 30 days: no head start
			[v.stale.id, 0],
		]);
	});

	it("fetches every review since a week back the first time, and snapshots each venue's rating, the quiet ones by their newest review", async () => {
		const em = harness.orm.em;
		googleReviews('p-twice', -2, -20);
		googleReviews('p-branchA', -3);
		// Nothing in the week: its newest review is older
		googleReviews('p-branchB', -30);
		googleReviews('p-once', -1);
		googleReviews('p-popular', -4, -5);
		googleReviews('p-quiet', -100);
		googleReviews('p-stale', -10);
		// p-silent has no review at all

		const result = await workflow.week(city.id, '2026-W43');

		expect(result).toEqual({
			due: 8,
			talked: 4,
			requested: 8,
			saved: 5,
			snapshots: 7,
			upToDate: 3,
			missed: 0,
		});
		const [first, check] = apify.calls;
		expect(first.actor).toBe('compass/Google-Maps-Reviews-Scraper');
		expect(first.input).toEqual({
			placeIds: [
				'p-twice',
				'p-branchA',
				'p-branchB',
				'p-once',
				'p-popular',
				'p-silent',
				'p-quiet',
				'p-stale',
			],
			reviewsStartDate: '2026-10-18',
			reviewsSort: 'newest',
			language: 'en',
			personalData: false,
		});
		// The budget less the check's reserve (eight newest reviews, planned on 80 %)
		expect(first.options.maxCostUsd).toBeCloseTo(3 - (8 * 0.0006) / 0.8, 6);
		expect(first.options.ownerWorkflowId).toBe('op-1');
		// The ones with nothing new: one review each; the reserve, floored at the actor's lowest cap
		expect(check.input).toEqual({
			placeIds: ['p-branchB', 'p-silent', 'p-quiet', 'p-stale'],
			maxReviews: 1,
			reviewsSort: 'newest',
			language: 'en',
			personalData: false,
		});
		expect(check.options.maxCostUsd).toBe(0.05);

		em.clear();
		// The week's reviews are kept, read later like any review; the older ones the check saw are not
		expect(
			(await em.find(Review, {}, { populate: ['venue'] })).map(x => x.venue.name).sort(),
		).toEqual(['branchA', 'once', 'popular', 'popular', 'twice']);
		const snapshots = await em.find(VenueSnapshot, {}, { populate: ['venue'] });
		expect(snapshots.map(x => x.venue.name).sort()).toEqual([
			'branchA',
			'branchB',
			'once',
			'popular',
			'quiet',
			'stale',
			'twice',
		]);
		expect(snapshots.every(x => x.snapshotDate === '2026-10-25')).toBe(true);
		// Every venue's stored stretch now reaches the run, a week back at most
		const venues = await em.find(Venue, { city: city.id, closed: false });
		expect(venues.every(x => x.reviewsFetchedAt?.toISOString() === NOW.toISOString())).toBe(
			true,
		);
		expect((await em.findOneOrFail(Venue, v.twice.id)).reviewsFetchedFrom?.toISOString()).toBe(
			'2026-10-18T00:00:00.000Z',
		);
	});

	it('a week later starts every venue at its last fetch, and leaves a venue the cap cut to start there again', async () => {
		const em = harness.orm.em;
		apify.calls.length = 0;
		const later = new Date(NOW.getTime() + 7 * 86_400_000);
		clock = later;
		googleReviews('p-once', 3, -1);
		googleReviews('p-branchB', 2, -30);
		// The cap stops before popular, which has a new review
		googleReviews('p-popular', 5, -4, -5);
		cut.add('p-popular');

		const result = await workflow.week(city.id, '2026-W44');

		expect(apify.calls[0].input.reviewsStartDate).toBe('2026-10-25');
		expect(result).toMatchObject({ requested: 8, saved: 2, missed: 1 });
		em.clear();
		// Fetched again: once and branchB's new reviews, nothing twice
		expect(await em.count(Review, { reviewId: { $like: 'r-p-once-%' } })).toBe(2);
		expect(await em.count(Review, {})).toBe(7);
		const popular = await em.findOneOrFail(Venue, v.popular.id);
		expect(popular.reviewsFetchedAt?.toISOString()).toBe(NOW.toISOString());
		expect((await em.findOneOrFail(Venue, v.once.id)).reviewsFetchedAt?.toISOString()).toBe(
			later.toISOString(),
		);
		// The stretch joins on: it still starts at the first week
		expect((await em.findOneOrFail(Venue, v.once.id)).reviewsFetchedFrom?.toISOString()).toBe(
			'2026-10-18T00:00:00.000Z',
		);
		cut.clear();
	});
});
