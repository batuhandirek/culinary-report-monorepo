import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import _ from 'lodash';

import type { City } from 'src/modules/cities/entities/city.entity.js';
import { cityFactory } from 'src/modules/cities/tests/factories/city.factory.js';
import type { ReviewsFetch } from 'src/modules/pipeline/atoms/reviews/util/reviews-input.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import {
	VenueScrapeSourceEnum,
	VenueStatusChangeKindEnum,
} from '../constants/venue-status.constant.js';
import { Review, ReviewPlatformEnum } from '../entities/review.entity.js';
import { Venue } from '../entities/venue.entity.js';
import { VenueSnapshot } from '../entities/venue-snapshot.entity.js';
import { VenueStatusChange } from '../entities/venue-status-change.entity.js';
import { ReviewService } from '../services/review.service.js';
import { VenueService } from '../services/venue.service.js';

/**
 * What the `reviews` atom is asked for: the month scrape's split and start days, the watch's and
 * the weekly fetch's start days, a backfill's plan; and what a fetch's save keeps.
 */
describe('ReviewService plans and save (pglite)', () => {
	let harness: PgliteTestingModule;
	let service: ReviewService;
	let city: City;

	beforeAll(async () => {
		harness = await createPgliteTestingModule({ providers: [ReviewService, VenueService] });
		service = harness.moduleRef.get(ReviewService);
		entityManagerManager.setEntityManager(harness.orm.em);
		city = await cityFactory.create();
	});

	afterAll(async () => {
		await harness.stop();
	});

	const venue = (placeId: string, params: Partial<Venue> = {}) =>
		harness.orm.em.create(Venue, { city, placeId, name: placeId, ...params } as Venue);
	const stretch = (from: string, at: string) => ({
		reviewsFetchedFrom: new Date(`${from}T00:00:00Z`),
		reviewsFetchedAt: new Date(`${at}T06:00:00Z`),
	});
	const googleReview = (venue: Venue, reviewId: string, publishedAt: string) =>
		harness.orm.em.create(Review, { venue, reviewId, publishedAt: new Date(publishedAt) });

	it("plans the month: the tracked venues from the month's first day or their last fetch when later, one run a start day; the rest from six months earlier on the backfill's share; all in the order given", async () => {
		const em = harness.orm.em;
		const plain = venue('m-plain');
		googleReview(plain, 'm1', '2026-01-15T10:00:00Z');
		// Its stretch covers the month's first day: it starts at its last fetch
		const later = venue('m-later', stretch('2026-02-01', '2026-09-20'));
		// Only the weekly fetch's last week: no history
		const weekly = venue('m-weekly', stretch('2026-09-20', '2026-09-27'));
		const fresh = venue('m-fresh');
		const old = venue('m-old');
		googleReview(old, 'm2', '2026-03-31T21:00:00Z');
		await em.flush();

		const plan = await service.planReportMonth(
			'2026-09',
			[plain.id, weekly.id, old.id, fresh.id, later.id, plain.id],
			10,
		);
		expect(plan).toEqual({
			month: [
				{
					fetch: { mode: 'since', placeIds: ['m-plain', 'm-old'], since: '2026-09-01' },
					maxCostUsd: 4,
					purpose: 'google-reviews 2026-09 from 2026-09-01: 2 venues',
				},
				{
					fetch: { mode: 'since', placeIds: ['m-later'], since: '2026-09-20' },
					maxCostUsd: 2,
					purpose: 'google-reviews 2026-09 from 2026-09-20: 1 venues',
				},
			],
			backfill: [
				{
					fetch: {
						mode: 'since',
						placeIds: ['m-weekly', 'm-fresh'],
						since: '2026-03-01',
					},
					maxCostUsd: 4,
					purpose: 'google-reviews 2026-09 backfill from 2026-03-01: 2 venues',
				},
			],
			backfilled: 2,
			backfillSince: '2026-03-01',
		});
	});

	it('gives the backfill the whole budget when nothing is tracked yet, and no run when nothing is new', async () => {
		const em = harness.orm.em;
		const a = venue('n-a');
		const b = venue('n-b');
		const tracked = venue('n-t');
		googleReview(tracked, 'n1', '2026-01-01T00:00:00Z');
		await em.flush();
		expect(await service.planReportMonth('2026-09', [a.id, b.id], 5)).toEqual({
			month: [],
			backfill: [
				{
					fetch: { mode: 'since', placeIds: ['n-a', 'n-b'], since: '2026-03-01' },
					maxCostUsd: 5,
					purpose: 'google-reviews 2026-09 backfill from 2026-03-01: 2 venues',
				},
			],
			backfilled: 2,
			backfillSince: '2026-03-01',
		});
		expect(await service.planReportMonth('2026-09', [tracked.id], 5)).toEqual({
			month: [
				{
					fetch: { mode: 'since', placeIds: ['n-t'], since: '2026-09-01' },
					maxCostUsd: 5,
					purpose: 'google-reviews 2026-09 from 2026-09-01: 1 venues',
				},
			],
			backfill: [],
			backfilled: 0,
		});
	});

	it("plans the watch from the day given, or from a venue's last fetch when its stretch covers the day", async () => {
		const em = harness.orm.em;
		const covered = venue('w-c', stretch('2026-10-01', '2026-10-20'));
		const bare = venue('w-b');
		await em.flush();
		expect(
			await service.planRecent([covered.id, bare.id], new Date('2026-10-15T05:00:00Z'), 1),
		).toEqual([
			{
				fetch: { mode: 'since', placeIds: ['w-b'], since: '2026-10-15' },
				maxCostUsd: 0.5,
				purpose: 'google-reviews since 2026-10-15 from 2026-10-15: 1 venues',
			},
			{
				fetch: { mode: 'since', placeIds: ['w-c'], since: '2026-10-20' },
				maxCostUsd: 0.5,
				purpose: 'google-reviews since 2026-10-15 from 2026-10-20: 1 venues',
			},
		]);
	});

	it("plans the weekly fetch: a venue never fetched from a week back, a fetched one from its last fetch, on the budget less the check's reserve", async () => {
		const em = harness.orm.em;
		const never = venue('s-n');
		const fetched = venue('s-f', stretch('2026-10-13', '2026-10-20'));
		await em.flush();
		const now = new Date('2026-10-25T04:30:00Z');
		const plan = await service.planSnapshot([never.id, fetched.id], 3, now);
		// Two newest reviews at $0.0006, planned on 80 %
		expect(plan.reserveUsd).toBeCloseTo(0.0015, 6);
		expect(plan).toMatchObject({
			requested: 2,
			runs: [
				{ fetch: { mode: 'since', placeIds: ['s-n'], since: '2026-10-18' } },
				{ fetch: { mode: 'since', placeIds: ['s-f'], since: '2026-10-20' } },
			],
		});
		expect(plan.runs[0].maxCostUsd).toBeCloseTo((3 - 0.0015) / 2, 6);
		expect(await service.planSnapshot([], 3, now)).toEqual({
			requested: 0,
			runs: [],
			reserveUsd: 0,
		});
	});

	it('plans a backfill: each venue at a share of its review count a month back, five reviews at least, taken while the plan fits the budget', async () => {
		const em = harness.orm.em;
		const busy = venue('b-busy', { reviewsCount: 10_000 });
		const [a, b, c, d] = ['b-a', 'b-b', 'b-c', 'b-d'].map(id =>
			venue(id, { reviewsCount: null }),
		);
		await em.flush();
		// Six months back: 10,000 × 1.05 % × 6.04 months ≈ 635 reviews ≈ $0.38; the others $0.003 each
		const plan = await service.planBackfill(
			[busy.id, a.id, b.id, c.id, d.id],
			'2026-05-01',
			0.39,
			new Date('2026-11-01T00:00:00Z'),
		);
		expect(plan).toMatchObject({ venues: 5, taken: 4, left: 1, plannedUsd: 0.39 });
		expect(plan.runs).toHaveLength(1);
		expect(plan.runs[0].placeIds).toEqual(['b-busy', 'b-a', 'b-b', 'b-c']);
		expect(plan.runs[0].plannedUsd).toBeCloseTo(0.3898, 3);
	});

	it('tells the venues with a Google review from before a date: TripAdvisor and the reviews from the date on are no history', async () => {
		const em = harness.orm.em;
		const [old, recent, tourist, none] = ['h-old', 'h-recent', 'h-ta', 'h-none'].map(placeId =>
			venue(placeId),
		);
		googleReview(old, 'h1', '2026-08-31T21:00:00Z');
		googleReview(recent, 'h2', '2026-09-01T00:00:00Z');
		em.create(Review, {
			venue: tourist,
			reviewId: 'ta_h3',
			platform: ReviewPlatformEnum.TRIPADVISOR,
			publishedAt: new Date('2026-05-01T10:00:00Z'),
		});
		await em.flush();
		const ids = [old, recent, tourist, none].map(v => v.id);
		const before = new Date('2026-09-01T00:00:00Z');
		expect([...(await service.venuesWithHistory(ids, before))]).toEqual([old.id]);
		expect(await service.venuesWithHistory([], before)).toEqual(new Set());
		// A stored stretch from before the date is history too, a review or not
		none.reviewsFetchedFrom = new Date('2026-08-01T00:00:00Z');
		await em.flush();
		expect([...(await service.venuesWithHistory(ids, before))].sort()).toEqual(
			[old.id, none.id].sort(),
		);
	});

	it("updates the day's snapshot and the review when a fetch is saved twice", async () => {
		const em = harness.orm.em;
		const a = venue('t-a');
		await em.flush();
		const fetch: ReviewsFetch = { mode: 'since', placeIds: ['t-a'], since: '2026-09-01' };
		const now = new Date('2026-10-02T09:00:00Z');
		const item = (totalScore: number, reviewsCount: number, text: string) => ({
			placeId: 't-a',
			reviewId: 'r1',
			publishedAtDate: '2026-09-03T10:00:00Z',
			text,
			totalScore,
			reviewsCount,
		});
		await service.saveReviews([item(4.2, 130, 'Good')], fetch, { capped: false, now });
		const again = await service.saveReviews([item(4.3, 131, 'Good, edited')], fetch, {
			capped: false,
			now,
		});
		expect(again).toEqual({ saved: 1, rated: 1, returned: ['t-a'], upToDate: 0, missed: 0 });
		em.clear();
		expect(
			(await em.find(VenueSnapshot, { venue: a.id })).map(s => [
				s.snapshotDate,
				s.rating,
				s.reviewsCount,
			]),
		).toEqual([['2026-10-02', 4.3, 131]]);
		expect((await em.find(Review, { venue: a.id })).map(r => r.text)).toEqual(['Good, edited']);
	});

	it('stores a stars-only review without text, so the reading never takes it', async () => {
		const em = harness.orm.em;
		venue('t-blank');
		await em.flush();
		const fetch: ReviewsFetch = { mode: 'since', placeIds: ['t-blank'], since: '2026-09-01' };
		const item = (reviewId: string, text: string, textTranslated?: string) => ({
			placeId: 't-blank',
			reviewId,
			publishedAtDate: '2026-09-03T10:00:00Z',
			stars: 5,
			text,
			textTranslated,
		});
		await service.saveReviews(
			[item('blank', ''), item('spaces', '  ', ' '), item('written', ' Tasty ')],
			fetch,
			{ capped: false, now: new Date('2026-10-02T09:00:00Z') },
		);
		em.clear();
		const stored = await em.find(Review, { reviewId: { $in: ['blank', 'spaces', 'written'] } });
		expect(
			Object.fromEntries(
				stored.map(r => [r.reviewId, [r.text ?? null, r.textTranslated ?? null]]),
			),
		).toEqual({ blank: [null, null], spaces: [null, null], written: ['Tasty', null] });
		const unread = new Set(await service.unreadReviewIds(city.id, 1000));
		expect(stored.filter(r => unread.has(r.id)).map(r => r.reviewId)).toEqual(['written']);
	});

	it("records a closure, a temporary closure and a reopening from the review items' flags, in both fetches, and keeps a state the item doesn't give", async () => {
		const em = harness.orm.em;
		const shut = venue('c-shut');
		const paused = venue('c-paused');
		const back = venue('c-back', { details: { temporarilyClosed: true } });
		const silent = venue('c-silent', { details: { temporarilyClosed: true } });
		await em.flush();
		const now = new Date('2026-11-10T06:00:00Z');
		const item = (placeId: string, publishedAtDate: string, flags: object) => ({
			placeId,
			reviewId: `${placeId}-r`,
			publishedAtDate,
			totalScore: 4.5,
			reviewsCount: 200,
			...flags,
		});
		await service.saveReviews(
			[
				item('c-shut', '2026-11-05T10:00:00Z', {
					permanentlyClosed: true,
					temporarilyClosed: false,
				}),
				item('c-paused', '2026-11-06T10:00:00Z', {
					permanentlyClosed: false,
					temporarilyClosed: true,
				}),
				item('c-silent', '2026-11-06T10:00:00Z', {}),
			],
			{ mode: 'since', placeIds: ['c-shut', 'c-paused', 'c-silent'], since: '2026-11-03' },
			{ capped: false, now },
		);
		// The check of a quiet venue: its one newest review is old, its state today's
		await service.saveReviews(
			[
				item('c-back', '2026-06-01T10:00:00Z', {
					permanentlyClosed: false,
					temporarilyClosed: false,
				}),
			],
			{ mode: 'newest', places: [{ placeId: 'c-back', since: '2026-11-03' }] },
			{ capped: false, now },
		);
		em.clear();
		const changes = await em.find(
			VenueStatusChange,
			{ venue: { $in: [shut.id, paused.id, back.id, silent.id] } },
			{ populate: ['venue'] },
		);
		expect(
			_.sortBy(
				changes.map(c => [c.venue.placeId, c.kind, c.source, c.at.toISOString()]),
				0,
			),
		).toEqual([
			[
				'c-back',
				VenueStatusChangeKindEnum.REOPENED,
				VenueScrapeSourceEnum.REVIEWS,
				now.toISOString(),
			],
			[
				'c-paused',
				VenueStatusChangeKindEnum.TEMPORARILY_CLOSED,
				VenueScrapeSourceEnum.REVIEWS,
				now.toISOString(),
			],
			[
				'c-shut',
				VenueStatusChangeKindEnum.PERMANENTLY_CLOSED,
				VenueScrapeSourceEnum.REVIEWS,
				now.toISOString(),
			],
		]);
		const stored = await em.find(Venue, {
			placeId: { $in: ['c-shut', 'c-paused', 'c-back', 'c-silent'] },
		});
		expect(
			Object.fromEntries(
				stored.map(v => [v.placeId, [v.closed, !!v.details?.temporarilyClosed]]),
			),
		).toEqual({
			'c-shut': [true, false],
			'c-paused': [false, true],
			'c-back': [false, false],
			'c-silent': [false, true],
		});

		// Read again in the same state: nothing new
		await service.saveReviews(
			[
				item('c-paused', '2026-11-06T10:00:00Z', {
					permanentlyClosed: false,
					temporarilyClosed: true,
				}),
			],
			{ mode: 'since', placeIds: ['c-paused'], since: '2026-11-03' },
			{ capped: false, now: new Date('2026-11-17T06:00:00Z') },
		);
		expect(await em.count(VenueStatusChange, { venue: paused.id })).toBe(1);
	});
});
