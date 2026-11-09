import type { FilterQuery } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import _ from 'lodash';

import {
	GOOGLE_REVIEW_USD,
	GOOGLE_REVIEWS_MIN_CAP_USD,
	type GoogleMapsReviewItem,
} from 'src/modules/apify/actors/google-maps-reviews.actor.js';
import { PgBossService } from 'src/modules/pgboss/pgboss.service.js';
import type {
	ReviewsCall,
	ReviewsFetch,
} from 'src/modules/pipeline/atoms/reviews/util/reviews-input.js';
import { type Claim, StatementService } from 'src/modules/statements/services/statement.service.js';
import { STATEMENT_POPULATE } from 'src/modules/statements/util/statement-populate.js';
import { judgingSql } from 'src/modules/statements/util/statement-sql.js';

import { RATING_SNAPSHOT_BUDGET_HEADROOM } from '../constants/rating-snapshot.constant.js';
import {
	REVIEW_BACKFILL_BUDGET_SHARE,
	REVIEW_BACKFILL_MONTHS,
} from '../constants/review-scrape.constant.js';
import { Review, ReviewPlatformEnum } from '../entities/review.entity.js';
import { Venue } from '../entities/venue.entity.js';
import { ReviewAlertEvent } from '../persisted-events/review-alert.persisted-event.js';
import { monthRange } from '../util/month.js';
import { dayOf, fetchStart, markFetched } from '../util/review-fetch.js';

import { VenueService } from './venue.service.js';

// The weekly fetch's share of its budget kept for the check of the venues with nothing new
const CHECK_BUDGET_SHARE = 0.4;
/** How far back a venue's first weekly fetch starts: its week, no backfill */
export const FIRST_FETCH_DAYS = 7;

// The one-off backfill (`planBackfill`): a venue is planned at this share of its all-time Google
// review count per month back (Berlin 2026-11: six months were 6.3 % of it over 42 venues with
// the whole stretch stored), at least `BACKFILL_MIN_REVIEWS`
const BACKFILL_MONTHLY_SHARE = 0.0105;
const BACKFILL_MIN_REVIEWS = 5;
// Venues per actor run: a run the cap or a restart cuts loses only its own
export const BACKFILL_RUN_VENUES = 100;
// Review ids a lookup query binds at most (Postgres allows 65,535 parameters)
const STORED_REVIEWS_CHUNK = 5_000;
// Place ids a venue lookup binds at most
const VENUES_CHUNK = 2_000;

/** What the portal's review list filters on. All optional; they combine with AND. */
export interface ReviewListFilters {
	/** `YYYY-MM` */
	month?: string;
	stars?: number;
	/** An aspect root key (`food`, `service`, `wait`, …): reviews with a claim under it */
	topic?: string;
	/** Answered by the owner on Google, or marked answered in the portal */
	answered?: boolean;
	/** The review's original language, e.g. `de` */
	language?: string;
	/** Written, three stars or fewer, unanswered: the owner's to-do */
	needsReply?: boolean;
	/** Google or TripAdvisor */
	platform?: ReviewPlatformEnum;
}

/** The values a venue's reviews can be filtered by, with how many reviews carry each. */
export interface ReviewFacets {
	months: { month: string; count: number }[];
	languages: { language: string; count: number }[];
	/** Aspect root keys, with how many reviews make a claim under each */
	topics: { topic: string; count: number }[];
	/** Only the platforms the venue has reviews on */
	platforms: { platform: ReviewPlatformEnum; count: number }[];
	needsReply: number;
}

/** The month scrape's Google runs (`planReportMonth`), for the `reviews` atom */
export interface ReportMonthPlan {
	/** The tracked venues from the month's first day (or their last fetch when later), one run per start day */
	month: ReviewsCall[];
	/** The venues new to the set from `backfillSince`, one run on the backfill's share */
	backfill: ReviewsCall[];
	/** Venues new to the set */
	backfilled: number;
	backfillSince?: string;
}

/** The weekly fetch's runs (`planSnapshot`): every venue from its last fetch, and the check's reserve */
export interface SnapshotPlan {
	/** Venues the plan covers */
	requested: number;
	/** One run per start day */
	runs: ReviewsCall[];
	/** Kept for the check of the venues with nothing new (their one newest review each) */
	reserveUsd: number;
}

/** A backfill's plan (`planBackfill`): the venues taken while the plan fits the budget, in runs of `BACKFILL_RUN_VENUES` */
export interface BackfillPlan {
	venues: number;
	taken: number;
	left: number;
	plannedUsd: number;
	runs: { placeIds: string[]; plannedUsd: number }[];
}

/** What a fetch's save reports (`saveReviews`) */
export interface SaveReviewsResult {
	/** Review rows written */
	saved: number;
	/** Venues given the day's rating snapshot */
	rated: number;
	/** The places that returned an item, in the run's order */
	returned: string[];
	/** A `newest` fetch: nothing new since their day, marked fetched */
	upToDate: number;
	/** A `newest` fetch: a review since their day, left to start there again */
	missed: number;
}

// A statement's aspect (`statements s`): the aspect row `a` and its parent `root` (none for a root)
const ASPECT_JOIN_SQL = `join statement_parts p on p.statement_id = s.id and p.role = 'aspect'
	join topics a on a.id = p.topic_id
	left join topics root on root.id = a.parent_id`;
const ROOT_KEY_SQL = 'coalesce(root.key, a.key)';
// A claim that praises or complains: text, no change, no question (a dish-only statement has no text)
const CLAIM_SQL = `s.text is not null and ${judgingSql('s')}`;

// A review the owner should answer: the alert's and the portal's "needs a reply"
export const CRITICAL_REVIEW_MAX_STARS = 3;
const NEEDS_REPLY_SQL = `(r.text is not null or r.text_translated is not null)
	and r.stars <= ${CRITICAL_REVIEW_MAX_STARS}
	and r.owner_response is null and r.marked_replied_at is null`;

/** A review the agents can read: it has text (the original or a translation) */
const WITH_TEXT = { $or: [{ text: { $ne: null } }, { textTranslated: { $ne: null } }] };

/** One review as agent A reads it (`ReviewService.reviewForReading`) */
export interface ReviewForReading {
	/** The review's row id */
	id: string;
	cityId: string;
	venueName: string;
	/** The platform's review id */
	reviewId: string;
	stars: number | null;
	text: string | null;
	textTranslated: string | null;
}

/**
 * Google reviews: what the `reviews` atom fetches is planned here (which venues from which day,
 * the caps: `planReportMonth`, `planRecent`, `planSnapshot`, `planBackfill`) and saved here
 * (`saveReviews`: one row per review, each venue's rating snapshot and stored stretch); the
 * reading's and the portal's reads of them too.
 */
@Injectable()
export class ReviewService {
	private readonly logger = new Logger(ReviewService.name);

	constructor(
		private readonly em: EntityManager,
		private readonly venueService: VenueService,
		private readonly pgBossService: PgBossService,
		private readonly statementService: StatementService,
	) {}

	/**
	 * The month's Google runs of the report venues (`SCRAPE_REVIEWS`), in the order given (the
	 * report brands' branches first, so a run the cap stops covers them). The actor only takes a
	 * start date, so everything since the month began comes back, and all of it is kept: each
	 * review belongs to the month it was posted in, and a later month's were paid for too. Venues
	 * with reviews stored from the backfill window's first month (`venuesWithHistory`; the weekly
	 * fetch's last weeks are no history) start at the month's first day, or their last fetch when
	 * later (the weekly fetch has their reviews up to then, and paying for them twice buys
	 * nothing); the rest start `REVIEW_BACKFILL_MONTHS` earlier, in a run of their own capped at
	 * `REVIEW_BACKFILL_BUDGET_SHARE` of the budget (all of it when nothing is tracked yet, none
	 * when nothing is new), so the tracked venues' month always fits.
	 */
	async planReportMonth(
		month: string,
		venueIds: string[],
		budgetUsd: number,
	): Promise<ReportMonthPlan> {
		const ids = _.uniq(venueIds);
		const start = new Date(`${month}-01T00:00:00Z`);
		start.setUTCMonth(start.getUTCMonth() - REVIEW_BACKFILL_MONTHS);
		const backfillSince = dayOf(start);
		const historyBefore = new Date(start);
		historyBefore.setUTCMonth(historyBefore.getUTCMonth() + 1);
		const tracked = await this.venuesWithHistory(ids, historyBefore);
		const venues = await this.ordered(ids);
		const fresh = venues.filter(v => !tracked.has(v.id));
		const backfillBudget =
			fresh.length === 0 ? 0
			: tracked.size === 0 ? budgetUsd
			: budgetUsd * REVIEW_BACKFILL_BUDGET_SHARE;
		return {
			month: runsByStartDay(
				venues
					.filter(v => tracked.has(v.id))
					.map(venue => ({ venue, since: fetchStart(`${month}-01`, venue) })),
				budgetUsd - backfillBudget,
				month,
			),
			backfill: runsByStartDay(
				fresh.map(venue => ({ venue, since: backfillSince })),
				backfillBudget,
				`${month} backfill`,
			),
			backfilled: fresh.length,
			...(fresh.length > 0 && { backfillSince }),
		};
	}

	/**
	 * The weekly watch's runs: these venues' reviews published since `since` (the actor takes a
	 * day), whatever month they fall in, or since their last fetch when that is later.
	 */
	async planRecent(venueIds: string[], since: Date, budgetUsd: number): Promise<ReviewsCall[]> {
		const venues = await this.ordered(venueIds);
		return runsByStartDay(
			venues.map(venue => ({ venue, since: fetchStart(dayOf(since), venue) })),
			budgetUsd,
			`since ${dayOf(since)}`,
		);
	}

	/**
	 * The weekly fetch of these venues (`SNAPSHOT_RATINGS`, every open venue): every Google
	 * review published since its last fetch (`reviewsFetchedAt`; a venue never fetched starts
	 * `FIRST_FETCH_DAYS` back, no backfill), one run per start day (after the first week most
	 * share one), on the budget less a reserve for the check of the venues with nothing new
	 * (`CHECK_BUDGET_SHARE` at most; what their one newest review each costs, planned on
	 * `RATING_SNAPSHOT_BUDGET_HEADROOM`): a venue with nothing new returns nothing, so the ones the
	 * runs returned nothing for are asked for their newest review (a `newest` fetch) to tell a
	 * quiet venue, which gets its snapshot and counts as fetched, from one the cap never reached.
	 * The places go to the actor in the order given, so a cap cuts the last ones.
	 */
	async planSnapshot(venueIds: string[], budgetUsd: number, now: Date): Promise<SnapshotPlan> {
		const venues = await this.ordered(venueIds);
		if (venues.length === 0) return { requested: 0, runs: [], reserveUsd: 0 };
		const firstDay = dayOf(new Date(now.getTime() - FIRST_FETCH_DAYS * 86_400_000));
		const reserveUsd = Math.min(
			budgetUsd * CHECK_BUDGET_SHARE,
			(venues.length * GOOGLE_REVIEW_USD) / RATING_SNAPSHOT_BUDGET_HEADROOM,
		);
		return {
			requested: venues.length,
			runs: runsByStartDay(
				venues.map(venue => ({
					venue,
					since: venue.reviewsFetchedAt ? dayOf(venue.reviewsFetchedAt) : firstDay,
				})),
				budgetUsd - reserveUsd,
				'new',
			),
			reserveUsd,
		};
	}

	/**
	 * A one-off backfill's plan (`BACKFILL_REVIEWS`): every Google review of these venues
	 * published from `since` (YYYY-MM-DD) on, in runs of `BACKFILL_RUN_VENUES` in the order given.
	 * Each venue is planned at `BACKFILL_MONTHLY_SHARE` of its all-time review count per month
	 * back, and venues are taken while the plan fits the budget (the rest are `left`). The runs'
	 * caps are the operation's (`backfillRunCap`: each over its plan, never more than the budget
	 * left), so the budget, not the plan, is what stops it.
	 */
	async planBackfill(
		venueIds: string[],
		since: string,
		budgetUsd: number,
		now: Date,
	): Promise<BackfillPlan> {
		const venues = await this.ordered(venueIds);
		const months = Math.max(
			1,
			(now.getTime() - new Date(`${since}T00:00:00Z`).getTime()) / (30.44 * 86_400_000),
		);
		const planOf = (venue: Venue) =>
			Math.max(
				BACKFILL_MIN_REVIEWS,
				(venue.reviewsCount ?? 0) * BACKFILL_MONTHLY_SHARE * months,
			) * GOOGLE_REVIEW_USD;
		let plannedUsd = 0;
		const taken: Venue[] = [];
		for (const venue of venues) {
			if (plannedUsd + planOf(venue) > budgetUsd) break;
			plannedUsd += planOf(venue);
			taken.push(venue);
		}
		return {
			venues: venues.length,
			taken: taken.length,
			left: venues.length - taken.length,
			plannedUsd: Math.round(plannedUsd * 100) / 100,
			runs: _.chunk(taken, BACKFILL_RUN_VENUES).map(chunk => ({
				placeIds: chunk.map(v => v.placeId),
				plannedUsd: _.sumBy(chunk, planOf),
			})),
		};
	}

	/**
	 * What a fetch returned, saved (the `reviews` atom's save step). A `since` fetch: one row per
	 * Google review id (unique) from the day on (a review fetched again is updated, never stored
	 * twice), and every venue with an item gets its rating snapshot (every item repeats its
	 * place's all-time figures) and its stretch to `now` (`markFetched`), except the last one of a
	 * run that spent its cap (`capped`), whose older reviews the cap may have cut. A `newest`
	 * fetch: a place whose newest review is older than its day had nothing new (its snapshot, its
	 * stretch), one with a newer review was never reached (`missed`, nothing written), and one
	 * that returned nothing has no review at all and counts as fetched, unless the cap cut the
	 * run. Flushes.
	 */
	async saveReviews(
		items: GoogleMapsReviewItem[],
		fetch: ReviewsFetch,
		opts: { capped: boolean; now: Date },
	): Promise<SaveReviewsResult> {
		const placeIds = fetch.mode === 'since' ? fetch.placeIds : fetch.places.map(p => p.placeId);
		const venues = new Map<string, Venue>();
		for (const chunk of _.chunk(_.uniq(placeIds), VENUES_CHUNK))
			for (const venue of await this.em.find(Venue, { placeId: { $in: chunk } }))
				venues.set(venue.placeId, venue);
		return fetch.mode === 'since' ?
				this.saveSince(items, fetch.since, venues, opts)
			:	this.saveNewest(items, fetch.places, venues, opts);
	}

	private async saveSince(
		items: GoogleMapsReviewItem[],
		since: string,
		venues: Map<string, Venue>,
		{ capped, now }: { capped: boolean; now: Date },
	): Promise<SaveReviewsResult> {
		const seen = new Set<string>();
		const returned: string[] = [];
		let saved = 0;
		let rated = 0;
		let last: Venue | undefined;
		// The stored ones looked up first, in one query a few thousand ids at a time, never one
		// per item: before each query the entity manager checks every entity it holds for changes
		// to flush, so a lookup per review was quadratic (a batch of 12,000 reviews held the CPU
		// for hours, 2026-11-05). This run's own new rows are in `fresh` until the flush
		const stored = await this.storedReviews(items.map(i => i.reviewId));
		const fresh = new Map<string, Review>();
		for (const item of items) {
			const venue = item.placeId ? venues.get(item.placeId) : undefined;
			if (!venue) continue;
			last = venue;
			if (!seen.has(venue.id)) {
				seen.add(venue.id);
				returned.push(venue.placeId);
				if (item.totalScore != null || item.reviewsCount != null) {
					await this.venueService.recordRating(venue, item, now);
					rated++;
				}
			}
			if (
				!item.reviewId ||
				!item.publishedAtDate ||
				item.publishedAtDate.slice(0, 10) < since
			)
				continue;
			const review =
				fresh.get(item.reviewId) ??
				stored.get(item.reviewId) ??
				this.em.create(Review, {
					reviewId: item.reviewId,
					venue,
					publishedAt: new Date(item.publishedAtDate),
				});
			fresh.set(item.reviewId, review);
			review.stars = item.stars ?? null;
			// A stars-only review comes back as text '' (not null): null keeps it out of the reading
			review.text = item.text?.trim() || null;
			review.textTranslated = item.textTranslated?.trim() || null;
			review.language = item.originalLanguage ?? null;
			review.likes = item.likesCount ?? 0;
			review.ownerResponse = item.responseFromOwnerText ?? null;
			review.ownerResponseAt =
				item.responseFromOwnerDate ? new Date(item.responseFromOwnerDate) : null;
			saved++;
		}
		for (const venue of venues.values())
			if (seen.has(venue.id) && !(capped && venue === last)) markFetched(venue, since, now);
		await this.em.flush();
		this.logger.log(
			`Saved ${saved} reviews from ${since}; ${seen.size} of ${venues.size} venues returned reviews${capped ? ' (cap reached)' : ''}`,
		);
		return { saved, rated, returned, upToDate: 0, missed: 0 };
	}

	private async saveNewest(
		items: GoogleMapsReviewItem[],
		places: { placeId: string; since: string }[],
		venues: Map<string, Venue>,
		{ capped, now }: { capped: boolean; now: Date },
	): Promise<SaveReviewsResult> {
		const sinceOf = new Map(places.map(p => [p.placeId, p.since]));
		const answered = new Set<string>();
		const returned: string[] = [];
		let rated = 0;
		let upToDate = 0;
		let missed = 0;
		for (const item of items) {
			const venue = item.placeId ? venues.get(item.placeId) : undefined;
			const since = item.placeId ? sinceOf.get(item.placeId) : undefined;
			if (!venue || since === undefined || answered.has(venue.id)) continue;
			answered.add(venue.id);
			returned.push(venue.placeId);
			// A review since its day: the earlier run never got to it
			if (item.publishedAtDate && item.publishedAtDate.slice(0, 10) >= since) {
				missed++;
				continue;
			}
			if (item.totalScore != null || item.reviewsCount != null) {
				await this.venueService.recordRating(venue, item, now);
				rated++;
			}
			markFetched(venue, since, now);
			upToDate++;
		}
		// A place the check returned nothing for has no review at all, unless its cap cut it
		if (!capped)
			for (const place of places) {
				const venue = venues.get(place.placeId);
				if (venue && !answered.has(venue.id)) markFetched(venue, place.since, now);
			}
		await this.em.flush();
		return { saved: 0, rated, returned, upToDate, missed };
	}

	/**
	 * Of these venues, the ones whose Google reviews are stored from before `before`: their
	 * stored stretch starts by then (`reviewsFetchedFrom`), or a review from before it is stored
	 * (the venues fetched before the stretch was kept). A venue with neither (never in a month
	 * scrape, or only in the weekly fetch's last weeks) is backfilled by the monthly
	 * `SCRAPE_REVIEWS`. TripAdvisor rows don't count.
	 */
	async venuesWithHistory(venueIds: string[], before: Date): Promise<Set<string>> {
		if (venueIds.length === 0) return new Set();
		const ids = venueIds.map(() => '?').join(', ');
		const rows = await this.em.getConnection().execute<{ venue_id: string }[]>(
			`select id venue_id from venues where reviews_fetched_from < ? and id in (${ids})
			union
			select distinct venue_id from reviews
			where platform = '${ReviewPlatformEnum.GOOGLE}' and published_at < ? and venue_id in (${ids})`,
			[before, ...venueIds, before, ...venueIds],
		);
		return new Set(rows.map(r => r.venue_id));
	}

	/** The stored reviews of these Google review ids, by id, in a few queries. */
	private async storedReviews(reviewIds: (string | undefined)[]): Promise<Map<string, Review>> {
		const ids = _.uniq(reviewIds.filter((id): id is string => !!id));
		const stored = new Map<string, Review>();
		for (const chunk of _.chunk(ids, STORED_REVIEWS_CHUNK))
			for (const review of await this.em.find(Review, { reviewId: { $in: chunk } }))
				stored.set(review.reviewId, review);
		return stored;
	}

	/** The venues, in the order of the ids given */
	private async ordered(venueIds: string[]): Promise<Venue[]> {
		const order = new Map(venueIds.map((id, i) => [id, i]));
		return _.sortBy(await this.em.find(Venue, { id: { $in: venueIds } }), v => order.get(v.id));
	}

	/** The city's written reviews not read yet, newest first: what the reading takes, one review a workflow */
	async unreadReviewIds(cityId: string, limit: number): Promise<string[]> {
		const reviews = await this.em.find(
			Review,
			{ analysedAt: null, venue: { city: cityId }, ...WITH_TEXT } as FilterQuery<Review>,
			{ orderBy: { publishedAt: 'desc', id: 'asc' }, limit, fields: ['id'] },
		);
		return reviews.map(r => r.id);
	}

	/**
	 * One review as agent A reads it, as plain data (a workflow stores it; the pipeline builds the
	 * message): its venue's name, stars, text and translation, and its city. Null when it has no
	 * text, or is read already (unread wanted) or was read after `analysedBefore` (a re-read).
	 */
	async reviewForReading(
		reviewId: string,
		opts: { analysedBefore?: Date } = {},
	): Promise<ReviewForReading | null> {
		const review = await this.em.findOne(
			Review,
			{
				id: reviewId,
				analysedAt: opts.analysedBefore ? { $lt: opts.analysedBefore } : null,
				...WITH_TEXT,
			} as FilterQuery<Review>,
			{ populate: ['venue'] },
		);
		if (!review) return null;
		return {
			id: review.id,
			cityId: review.venue.city.id,
			venueName: review.venue.name,
			reviewId: review.reviewId,
			stars: review.stars ?? null,
			text: review.text ?? null,
			textTranslated: review.textTranslated ?? null,
		};
	}

	/** Written reviews read before `before`, newest first: what a night's re-read takes */
	async reviewIdsToReread(before: Date, limit: number): Promise<string[]> {
		const reviews = await this.em.find(
			Review,
			{ analysedAt: { $lt: before }, ...WITH_TEXT } as FilterQuery<Review>,
			{ orderBy: { publishedAt: 'desc', id: 'asc' }, limit, fields: ['id'] },
		);
		return reviews.map(r => r.id);
	}

	/**
	 * Agent A's claims on the review stored: its statements replaced (a re-read's too),
	 * `analysedAt` stamped. Flushes; the new claims' ids, for the labels.
	 */
	async saveReviewReading(reviewId: string, claims: Claim[]): Promise<number[]> {
		const review = await this.em.findOneOrFail(Review, reviewId, {
			populate: ['venue', 'statements'],
		});
		const statements = this.statementService.replaceForReview(review, claims);
		review.analysedAt = new Date();
		await this.em.flush();
		return statements.map(c => c.id);
	}

	/** The city's written reviews not read yet */
	countPending(cityId: string): Promise<number> {
		return this.em.count(Review, {
			analysedAt: null,
			venue: { city: cityId },
			...WITH_TEXT,
		} as FilterQuery<Review>);
	}

	/** Written reviews read before `before`: what the `reread-reviews` backlog still has to read */
	countToReread(before: Date): Promise<number> {
		return this.em.count(Review, {
			analysedAt: { $lt: before },
			...WITH_TEXT,
		} as FilterQuery<Review>);
	}

	/**
	 * The weekly watch's alerts: every written review of these venues published since `since`
	 * with three stars or fewer, unanswered and not alerted yet, is stamped `alertedAt` and
	 * published as a `review-alert` in one transaction, so a review alerts once. Returns how many.
	 */
	async claimAlerts(venueIds: string[], since: Date, now = new Date()): Promise<number> {
		if (venueIds.length === 0) return 0;
		return this.em.transactional(async em => {
			const reviews = await em.find(Review, {
				venue: { $in: venueIds },
				publishedAt: { $gte: since },
				stars: { $lte: CRITICAL_REVIEW_MAX_STARS },
				alertedAt: null,
				ownerResponse: null,
				markedRepliedAt: null,
				$or: [{ text: { $ne: null } }, { textTranslated: { $ne: null } }],
			});
			for (const review of reviews) {
				review.alertedAt = now;
				await this.pgBossService.publishWithEm(
					em,
					ReviewAlertEvent.eventName,
					new ReviewAlertEvent({ reviewId: review.id }),
				);
			}
			return reviews.length;
		});
	}

	/**
	 * One page of a venue's reviews (or of several: a brand's branches), newest first
	 * (unanswered critical ones first with `needsReply`). Filters combine with AND.
	 */
	async listForVenue(
		venueIds: string | string[],
		filters: ReviewListFilters,
		page: number,
		size: number,
	): Promise<{ items: Review[]; total: number }> {
		const ids = [venueIds].flat();
		const where = [`r.venue_id in (${ids.map(() => '?').join(', ')})`];
		const params: unknown[] = [...ids];
		if (filters.month) {
			const { start, end } = monthRange(filters.month);
			where.push('r.published_at >= ? and r.published_at < ?');
			params.push(start, end);
		}
		if (filters.stars != null) {
			where.push('r.stars = ?');
			params.push(filters.stars);
		}
		if (filters.topic) {
			// Praised, criticised or noted: any claim under the root
			where.push(
				`exists (select 1 from statements s ${ASPECT_JOIN_SQL}
					where s.review_id = r.id and ${CLAIM_SQL} and ${ROOT_KEY_SQL} = ?)`,
			);
			params.push(filters.topic);
		}
		if (filters.answered != null) {
			where.push(
				filters.answered ?
					'(r.owner_response is not null or r.marked_replied_at is not null)'
				:	'(r.owner_response is null and r.marked_replied_at is null)',
			);
		}
		if (filters.language) {
			where.push('r.language = ?');
			params.push(filters.language);
		}
		if (filters.needsReply) where.push(`(${NEEDS_REPLY_SQL})`);
		if (filters.platform) {
			where.push('r.platform = ?');
			params.push(filters.platform);
		}

		const rows: { id: string; total: number }[] = await this.em.getConnection().execute(
			`select r.id, count(*) over ()::int as total from reviews r
			where ${where.join(' and ')}
			order by ${filters.needsReply ? 'r.stars asc, ' : ''}r.published_at desc, r.id
			limit ? offset ?`,
			[...params, size, (page - 1) * size],
		);
		if (rows.length === 0) {
			// Past the last page the window has no row to carry the total
			const [{ n }]: { n: number }[] = await this.em
				.getConnection()
				.execute(
					`select count(*)::int as n from reviews r where ${where.join(' and ')}`,
					params,
				);
			return { items: [], total: n };
		}
		const reviews = await this.em.find(
			Review,
			{ id: { $in: rows.map(r => r.id) } },
			{ populate: [...STATEMENT_POPULATE] },
		);
		const byId = new Map(reviews.map(r => [r.id, r]));
		return { items: rows.map(r => byId.get(r.id)!), total: rows[0].total };
	}

	/** The months, languages and topics a venue's reviews (or its brand's branches') can be filtered by. */
	async facets(venueIds: string | string[]): Promise<ReviewFacets> {
		const conn = this.em.getConnection();
		const ids = [venueIds].flat();
		const venueIn = `venue_id in (${ids.map(() => '?').join(', ')})`;
		const [months, languages, topics, [needs], platforms] = await Promise.all([
			conn.execute(
				`select to_char(published_at at time zone 'UTC', 'YYYY-MM') as month, count(*)::int as count
				from reviews where ${venueIn} group by 1 order by 1 desc`,
				ids,
			),
			conn.execute(
				`select language, count(*)::int as count from reviews
				where ${venueIn} and language is not null group by 1 order by 2 desc, 1`,
				ids,
			),
			// Reviews, not claims: a review with two claims under one root counts once
			conn.execute(
				`select ${ROOT_KEY_SQL} as topic, count(distinct r.id)::int as count from reviews r
					join statements s on s.review_id = r.id and ${CLAIM_SQL}
					${ASPECT_JOIN_SQL}
				where r.${venueIn}
				group by 1 order by 2 desc, 1`,
				ids,
			),
			conn.execute(
				`select count(*)::int as n from reviews r where r.${venueIn} and ${NEEDS_REPLY_SQL}`,
				ids,
			),
			conn.execute(
				`select platform, count(*)::int as count from reviews where ${venueIn} group by 1 order by 1`,
				ids,
			),
		]);
		return {
			months: months as ReviewFacets['months'],
			languages: languages as ReviewFacets['languages'],
			topics: topics as ReviewFacets['topics'],
			platforms: platforms as ReviewFacets['platforms'],
			needsReply: (needs as { n: number }).n,
		};
	}

	/**
	 * The owner says they answered a review (or takes it back). A later scrape's
	 * `ownerResponse` confirms it; the mark is kept either way. Flushes.
	 */
	async markReplied(venueIds: string | string[], id: string, replied: boolean): Promise<Review> {
		const review = await this.em.findOne(
			Review,
			{ id, venue: { $in: [venueIds].flat() } },
			{ populate: [...STATEMENT_POPULATE] },
		);
		if (!review) throw new NotFoundException();
		review.markedRepliedAt = replied ? (review.markedRepliedAt ?? new Date()) : null;
		await this.em.flush();
		return review;
	}
}

/**
 * One run per start day of these fetches, in day order (after the first weekly fetch most venues
 * share one), the budget split by venues, each cap floored at the actor's lowest. The places go
 * to the actor in the order given, so a cap cuts the last ones.
 */
const runsByStartDay = (
	fetches: { venue: Pick<Venue, 'placeId'>; since: string }[],
	budgetUsd: number,
	label: string,
): ReviewsCall[] => {
	const byDay = _.groupBy(fetches, f => f.since);
	return Object.keys(byDay)
		.sort()
		.map(day => ({
			fetch: { mode: 'since', placeIds: byDay[day].map(f => f.venue.placeId), since: day },
			maxCostUsd: Math.max(
				(budgetUsd * byDay[day].length) / fetches.length,
				GOOGLE_REVIEWS_MIN_CAP_USD,
			),
			purpose: `google-reviews ${label} from ${day}: ${byDay[day].length} venues`,
		}));
};
