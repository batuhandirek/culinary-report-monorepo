import type { FilterQuery, ObjectQuery } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';

import _ from 'lodash';

import { ApifyService } from 'src/modules/apify/services/apify.service.js';
import { LlmBacklogRegistry } from 'src/modules/backlog/services/llm-backlog-registry.service.js';
import { PgBossService } from 'src/modules/pgboss/pgboss.service.js';
import { REVIEWS_QUOTED_AT } from 'src/modules/statements/constants/statements-shipped.constant.js';
import type { Statement } from 'src/modules/statements/entities/statement.entity.js';
import { StatementService } from 'src/modules/statements/services/statement.service.js';
import { StatementPartsService } from 'src/modules/statements/services/statement-parts.service.js';
import { STATEMENT_POPULATE } from 'src/modules/statements/util/statement-populate.js';
import { judgingSql } from 'src/modules/statements/util/statement-sql.js';
import { runPool } from 'src/shared/util/pool.js';

import { ReviewClaimsAgent } from '../agents/review-claims.agent.js';
import { Review, ReviewPlatformEnum } from '../entities/review.entity.js';
import { Venue } from '../entities/venue.entity.js';
import { ReviewAlertEvent } from '../persisted-events/review-alert.persisted-event.js';
import { monthRange } from '../util/month.js';
import { reviewClaimsInput } from '../util/review-claims-input.js';

/** Reviews read side by side, one a call */
const REVIEW_CONCURRENCY = 10;

import { VenueService } from './venue.service.js';

const GOOGLE_REVIEWS_ACTOR = 'compass/Google-Maps-Reviews-Scraper';
// What one review costs on the reviews actor (Free plan), the unit its cap counts in
const REVIEW_USD = 0.0006;
// A run that spent this share of its cap may have been cut by it: its last venue's older reviews
const CAP_REACHED_SHARE = 0.9;
// The smallest cap a review run gets, so a small group's run isn't refused
const MIN_RUN_CAP_USD = 0.05;
// The weekly fetch's share of its budget kept for the check of the venues with nothing new
const CHECK_BUDGET_SHARE = 0.4;
/** How far back a venue's first weekly fetch starts: its week, no backfill */
export const FIRST_FETCH_DAYS = 7;

// The one-off backfill (`backfill`): a venue is planned at this share of its all-time Google
// review count per month back (Berlin 2026-11: six months were 6.3 % of it over 42 venues with
// the whole stretch stored), at least `BACKFILL_MIN_REVIEWS`
const BACKFILL_MONTHLY_SHARE = 0.0105;
const BACKFILL_MIN_REVIEWS = 5;
// Venues per actor run: a run the cap or a restart cuts loses only its own
const BACKFILL_RUN_VENUES = 100;
// Review ids a lookup query binds at most (Postgres allows 65,535 parameters)
const STORED_REVIEWS_CHUNK = 5_000;
// A run's cap over its plan, since busy places run above the average
const BACKFILL_CAP_HEADROOM = 1.5;

const dayOf = (at: Date) => at.toISOString().slice(0, 10);

/**
 * Where a fetch from `day` can start for this venue: at its last fetch's day when its stored
 * stretch (`reviewsFetchedFrom`..`reviewsFetchedAt`) covers `day`, else at `day` itself.
 */
const fetchStart = (day: string, venue: Venue): string =>
	venue.reviewsFetchedFrom && venue.reviewsFetchedAt && dayOf(venue.reviewsFetchedFrom) <= day && dayOf(venue.reviewsFetchedAt) > day ?
		dayOf(venue.reviewsFetchedAt)
	:	day;

/** A fetch from `day` came back whole for the venue: its stored stretch now reaches `now` */
const markFetched = (venue: Venue, day: string, now: Date): void => {
	const joins = venue.reviewsFetchedFrom && venue.reviewsFetchedAt && day <= dayOf(venue.reviewsFetchedAt);
	if (!joins || day < dayOf(venue.reviewsFetchedFrom!)) venue.reviewsFetchedFrom = new Date(`${day}T00:00:00Z`);
	venue.reviewsFetchedAt = now;
};

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
// Reviews a daily-backlog batch of the re-read takes (~50 agent calls)
const REREAD_BATCH_REVIEWS = 500;

/** One item of `compass/Google-Maps-Reviews-Scraper`. */
interface GoogleReviewItem {
	reviewId?: string;
	placeId?: string;
	publishedAtDate?: string;
	stars?: number;
	text?: string;
	textTranslated?: string;
	originalLanguage?: string;
	likesCount?: number;
	responseFromOwnerText?: string;
	responseFromOwnerDate?: string;
	// The place's all-time figures, repeated on every item
	totalScore?: number;
	reviewsCount?: number;
}

@Injectable()
export class ReviewService implements OnModuleInit {
	private readonly logger = new Logger(ReviewService.name);

	constructor(
		private readonly em: EntityManager,
		private readonly apifyService: ApifyService,
		private readonly reviewClaimsAgent: ReviewClaimsAgent,
		private readonly venueService: VenueService,
		private readonly pgBossService: PgBossService,
		private readonly statementService: StatementService,
		private readonly statementPartsService: StatementPartsService,
		private readonly llmBacklogRegistry: LlmBacklogRegistry,
	) {}

	/** Reviews the old agents read (before statements shipped) are read again by A and B, a little each night */
	onModuleInit() {
		this.llmBacklogRegistry.register({
			key: 'reread-reviews',
			label: 'Re-read reviews as claims',
			priority: 40,
			remaining: () => this.countToReread(REVIEWS_QUOTED_AT),
			runBatch: async () => {
				const res = await this.reread({
					before: REVIEWS_QUOTED_AT,
					limit: REREAD_BATCH_REVIEWS,
				});
				return { done: res.analysed, tokens: res.tokens };
			},
		});
	}

	/**
	 * Pulls one month's Google reviews of these venues. The actor only takes a start date, so
	 * everything since the month began (or since `since`, a backfill) comes back, and all of it is
	 * kept: each review belongs to the month it was posted in, and a later month's were paid for
	 * too. With `fromLastFetch` a venue starts at its `reviewsFetchedAt` when that is later: the
	 * weekly fetch has its reviews up to then, and paying for them twice buys nothing.
	 *
	 * Every item repeats its place's all-time rating and review count, so each venue with at
	 * least one item gets today's `VenueSnapshot` for free: the report's rating trend. A venue
	 * with no review since its start returns no item and gets none.
	 *
	 * The places go to the actor in `venueIds`' order, so when the cap stops a run the first
	 * ones are the ones covered.
	 */
	async scrapeMonth(
		month: string,
		venueIds: string[],
		budgetUsd: number,
		now = new Date(),
		since = `${month}-01`,
		opts: { fromLastFetch?: boolean } = {},
	): Promise<number> {
		const venues = await this.ordered(venueIds);
		const fetches = venues.map(venue => ({
			venue,
			since: opts.fromLastFetch ? fetchStart(since, venue) : since,
		}));
		const label = since === `${month}-01` ? month : `${month} from ${since}`;
		return (await this.fetch(fetches, budgetUsd, label, now)).saved;
	}

	/**
	 * The weekly watch: these venues' reviews published since `since` (the actor takes a day),
	 * whatever month they fall in, or since their last fetch when that is later. Also snapshots
	 * each venue's rating, like `scrapeMonth`.
	 */
	async scrapeRecent(
		venueIds: string[],
		since: Date,
		budgetUsd: number,
		now = new Date(),
	): Promise<number> {
		const venues = await this.ordered(venueIds);
		const fetches = venues.map(venue => ({ venue, since: fetchStart(dayOf(since), venue) }));
		return (await this.fetch(fetches, budgetUsd, `since ${dayOf(since)}`, now)).saved;
	}

	/**
	 * The weekly fetch of these venues (`SNAPSHOT_RATINGS`, every open venue): every Google
	 * review published since its last fetch (`reviewsFetchedAt`; a venue never fetched starts
	 * `FIRST_FETCH_DAYS` back, no backfill), kept like any review, and today's rating snapshot
	 * from the items. A venue with nothing new returns nothing, so the ones the first run returned
	 * nothing for are asked for their one newest review (`maxReviews: 1`, $0.0006 a place): older
	 * than their start, they had nothing new, get their snapshot and count as fetched; newer, the
	 * first run never reached them (its cap) and they start there again next time. The places go
	 * to the actor in the order given, so a cap cuts the last ones. Flushes.
	 */
	async snapshotRatings(
		venueIds: string[],
		budgetUsd: number,
		now = new Date(),
	): Promise<{ requested: number; saved: number; snapshots: number; upToDate: number; missed: number }> {
		const venues = await this.ordered(venueIds);
		const result = { requested: venues.length, saved: 0, snapshots: 0, upToDate: 0, missed: 0 };
		if (venues.length === 0) return result;
		const firstDay = dayOf(new Date(now.getTime() - FIRST_FETCH_DAYS * 86_400_000));
		const fetches = venues.map(venue => ({
			venue,
			since: venue.reviewsFetchedAt ? dayOf(venue.reviewsFetchedAt) : firstDay,
		}));
		// What the check of the quiet ones needs, all of them at most, planned on 80 %
		const reserve = Math.min(budgetUsd * CHECK_BUDGET_SHARE, (venues.length * REVIEW_USD) / 0.8);
		const first = await this.fetch(fetches, budgetUsd - reserve, 'new', now);
		result.saved = first.saved;
		result.snapshots = first.rated;

		const rest = fetches.filter(f => !first.returned.has(f.venue.id));
		if (rest.length) {
			const byPlaceId = new Map(rest.map(f => [f.venue.placeId, f]));
			const items = await this.apifyService.runActor<GoogleReviewItem>(
				GOOGLE_REVIEWS_ACTOR,
				{
					placeIds: rest.map(f => f.venue.placeId),
					maxReviews: 1,
					reviewsSort: 'newest',
					language: 'en',
					personalData: false,
				},
				{ maxCostUsd: reserve, purpose: `google-ratings: ${rest.length} venues without new reviews` },
			);
			const answered = new Set<string>();
			for (const item of items) {
				const fetch = item.placeId ? byPlaceId.get(item.placeId) : undefined;
				if (!fetch || answered.has(fetch.venue.id)) continue;
				answered.add(fetch.venue.id);
				// A review since its start: the first run never got to it
				if (item.publishedAtDate && item.publishedAtDate.slice(0, 10) >= fetch.since) {
					result.missed++;
					continue;
				}
				if (item.totalScore != null || item.reviewsCount != null) {
					await this.venueService.recordRating(fetch.venue, item, now);
					result.snapshots++;
				}
				markFetched(fetch.venue, fetch.since, now);
				result.upToDate++;
			}
			// A place the check returned nothing for has no review at all, unless its cap cut it
			if (items.length * REVIEW_USD < reserve * CAP_REACHED_SHARE)
				for (const f of rest) if (!answered.has(f.venue.id)) markFetched(f.venue, f.since, now);
			await this.em.flush();
		}
		return result;
	}

	/**
	 * A one-off backfill (`BACKFILL_REVIEWS`): every Google review of these venues published from
	 * `since` (YYYY-MM-DD) on, in runs of `BACKFILL_RUN_VENUES` in the order given. Each venue is
	 * planned at `BACKFILL_MONTHLY_SHARE` of its all-time review count per month back, and venues
	 * are taken while the plan fits the budget (the rest are `left`); a run's cap is its plan with
	 * `BACKFILL_CAP_HEADROOM`, never more than the budget left. A venue that came back whole gets
	 * its stored stretch from `since` (`markFetched`), so the weekly fetch and the monthly scrape go
	 * on from its last fetch and never pay for these months again; the last venue of a run its cap
	 * stopped does not. Each run flushes.
	 */
	async backfill(
		venueIds: string[],
		since: string,
		budgetUsd: number,
		now = new Date(),
	): Promise<{ venues: number; taken: number; left: number; runs: number; saved: number; returned: number; plannedUsd: number }> {
		const venues = await this.ordered(venueIds);
		const months = Math.max(1, (now.getTime() - new Date(`${since}T00:00:00Z`).getTime()) / (30.44 * 86_400_000));
		const planOf = (venue: Venue) =>
			Math.max(BACKFILL_MIN_REVIEWS, (venue.reviewsCount ?? 0) * BACKFILL_MONTHLY_SHARE * months) * REVIEW_USD;
		let plannedUsd = 0;
		const taken: Venue[] = [];
		for (const venue of venues) {
			if (plannedUsd + planOf(venue) > budgetUsd) break;
			plannedUsd += planOf(venue);
			taken.push(venue);
		}
		let spentUsd = 0;
		let saved = 0;
		let returned = 0;
		let runs = 0;
		for (const chunk of _.chunk(taken, BACKFILL_RUN_VENUES)) {
			runs++;
			const capUsd = Math.min(
				_.sumBy(chunk, planOf) * BACKFILL_CAP_HEADROOM,
				Math.max(budgetUsd - spentUsd, MIN_RUN_CAP_USD),
			);
			const result = await this.fetch(
				chunk.map(venue => ({ venue, since })),
				capUsd,
				`backfill from ${since}`,
				now,
			);
			saved += result.saved;
			returned += result.returned.size;
			spentUsd += result.saved * REVIEW_USD;
			if (spentUsd >= budgetUsd) break;
		}
		this.logger.log(
			`Backfill from ${since}: ${returned} of ${taken.length} venues returned ${saved} reviews (${venues.length - taken.length} left over budget)`,
		);
		return {
			venues: venues.length,
			taken: taken.length,
			left: venues.length - taken.length,
			runs,
			saved,
			returned,
			plannedUsd: Math.round(plannedUsd * 100) / 100,
		};
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

	/** The venues, in the order of the ids given */
	/** The stored reviews of these Google review ids, by id, in a few queries. */
	private async storedReviews(reviewIds: (string | undefined)[]): Promise<Map<string, Review>> {
		const ids = _.uniq(reviewIds.filter((id): id is string => !!id));
		const stored = new Map<string, Review>();
		for (const chunk of _.chunk(ids, STORED_REVIEWS_CHUNK))
			for (const review of await this.em.find(Review, { reviewId: { $in: chunk } }))
				stored.set(review.reviewId, review);
		return stored;
	}

	private async ordered(venueIds: string[]): Promise<Venue[]> {
		const order = new Map(venueIds.map((id, i) => [id, i]));
		return _.sortBy(await this.em.find(Venue, { id: { $in: venueIds } }), v => order.get(v.id));
	}

	/**
	 * Every review of each venue published from its `since` day on: one actor run per start day
	 * (after the first weekly fetch most venues share one), the budget split by venues. Each venue
	 * with an item gets its rating snapshot and `reviewsFetchedAt` = now, except the last one of a
	 * run that spent its cap, whose older reviews the cap may have cut. Flushes.
	 */
	private async fetch(
		fetches: { venue: Venue; since: string }[],
		budgetUsd: number,
		label: string,
		now: Date,
	): Promise<{ saved: number; rated: number; returned: Set<string> }> {
		const returned = new Set<string>();
		let saved = 0;
		let rated = 0;
		if (fetches.length === 0) return { saved, rated, returned };
		const byDay = _.groupBy(fetches, f => f.since);
		for (const day of Object.keys(byDay).sort()) {
			const group = byDay[day];
			const capUsd = Math.max((budgetUsd * group.length) / fetches.length, MIN_RUN_CAP_USD);
			const byPlaceId = new Map(group.map(f => [f.venue.placeId, f.venue]));
			const items = await this.apifyService.runActor<GoogleReviewItem>(
				GOOGLE_REVIEWS_ACTOR,
				{
					placeIds: group.map(f => f.venue.placeId),
					reviewsStartDate: day,
					reviewsSort: 'newest',
					language: 'en',
					personalData: false,
				},
				{
					maxCostUsd: capUsd,
					purpose: `google-reviews ${label}${day === label ? '' : ` from ${day}`}: ${group.length} venues`,
				},
			);

			const seen = new Set<string>();
			// One row per Google review id (unique): the stored ones looked up first, so a review
			// fetched again is updated, never stored twice. In one query a few thousand ids at a time,
			// never one per item: before each query the entity manager checks every entity it holds
			// for changes to flush, so a lookup per review was quadratic (a batch of 12,000 reviews
			// held the CPU for hours, 2026-11-05). This run's own new rows are in `fresh` until the flush
			const stored = await this.storedReviews(items.map(i => i.reviewId));
			const fresh = new Map<string, Review>();
			let last: Venue | undefined;
			for (const item of items) {
				const venue = item.placeId ? byPlaceId.get(item.placeId) : undefined;
				if (!venue) continue;
				last = venue;
				if (!seen.has(venue.id)) {
					seen.add(venue.id);
					if (item.totalScore != null || item.reviewsCount != null) {
						await this.venueService.recordRating(venue, item, now);
						rated++;
					}
				}
				if (!item.reviewId || !item.publishedAtDate || item.publishedAtDate.slice(0, 10) < day) continue;
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
				review.text = item.text ?? null;
				review.textTranslated = item.textTranslated ?? null;
				review.language = item.originalLanguage ?? null;
				review.likes = item.likesCount ?? 0;
				review.ownerResponse = item.responseFromOwnerText ?? null;
				review.ownerResponseAt =
					item.responseFromOwnerDate ? new Date(item.responseFromOwnerDate) : null;
				saved++;
			}
			const capped = items.length * REVIEW_USD >= capUsd * CAP_REACHED_SHARE;
			for (const id of seen) returned.add(id);
			for (const f of group) if (seen.has(f.venue.id) && !(capped && f.venue === last)) markFetched(f.venue, day, now);
			await this.em.flush();
			this.logger.log(
				`Saved ${saved} reviews ${label} from ${day}; ${seen.size} of ${group.length} venues returned reviews${capped ? ' (cap reached)' : ''}`,
			);
		}
		return { saved, rated, returned };
	}

	/** Topics, dishes and noticed changes for the month's reviews that have none yet. */
	async analyseMonth(month: string): Promise<number> {
		const { start, end } = monthRange(month);
		return (await this.analyse({ analysedAt: null, publishedAt: { $gte: start, $lt: end } }))
			.analysed;
	}

	/**
	 * The city's written reviews not read yet, newest first, `limit` at most: the reading job's
	 * part, whatever the month (a backfill's months too)
	 */
	analysePending(cityId: string, limit: number): Promise<{ analysed: number; tokens: number }> {
		return this.analyse({ analysedAt: null, venue: { city: cityId } }, { limit });
	}

	/** The city's written reviews not read yet: what `analysePending` still has to read */
	countPending(cityId: string): Promise<number> {
		return this.em.count(Review, {
			analysedAt: null,
			venue: { city: cityId },
			...WITH_TEXT,
		} as FilterQuery<Review>);
	}

	/** Reviews with text analysed before `before`: what the `reread-reviews` backlog still has to read */
	countToReread(before: Date): Promise<number> {
		return this.em.count(Review, {
			analysedAt: { $lt: before },
			...WITH_TEXT,
		} as FilterQuery<Review>);
	}

	/**
	 * Reads up to `limit` reviews analysed before `before` again (newest first), replacing their
	 * statements and restamping `analysedAt`: the `reread-reviews` backlog, after a prompt change.
	 */
	reread(opts: { before: Date; limit: number }): Promise<{ analysed: number; tokens: number }> {
		return this.analyse({ analysedAt: { $lt: opts.before } }, { limit: opts.limit });
	}

	/** The same for these venues' reviews published since `since` (the weekly watch). */
	async analyseRecent(venueIds: string[], since: Date): Promise<number> {
		if (venueIds.length === 0) return 0;
		return (
			await this.analyse({
				analysedAt: null,
				venue: { $in: venueIds },
				publishedAt: { $gte: since },
			})
		).analysed;
	}

	/**
	 * Agent A over the reviews with text `where` picks (the callers say whether unanalysed or a
	 * window of analysed ones; `limit` takes the newest first), their statements replaced, then
	 * agent B over the new claims.
	 */
	private async analyse(
		where: ObjectQuery<Review>,
		opts: { limit?: number } = {},
	): Promise<{ analysed: number; tokens: number }> {
		const reviews = await this.em.find(
			Review,
			{ ...where, ...WITH_TEXT } as FilterQuery<Review>,
			// Its statements too: re-analysing a review replaces them
			{
				populate: ['venue', 'statements'],
				...(opts.limit && {
					limit: opts.limit,
					orderBy: { publishedAt: 'desc', id: 'asc' },
				}),
			},
		);
		let analysed = 0;
		let tokens = 0;
		const created: Statement[] = [];
		// A provider failure (no credits) stops the pool: keep what was finished before it
		try {
			// One review a call: a packed call drops reviews and mixes them up
			await runPool(
				reviews,
				REVIEW_CONCURRENCY,
				async review => {
					const res = await this.reviewClaimsAgent.generate(
						reviewClaimsInput(review.venue.name, {
							reviewId: review.reviewId,
							stars: review.stars ?? null,
							text: review.text ?? null,
							textTranslated: review.textTranslated ?? null,
						}),
					);
					tokens += res.usage?.totalTokens ?? 0;
					// What it says, one claim per row, flushed with the review
					created.push(
						...this.statementService.replaceForReview(review, res.object.claims),
					);
					review.analysedAt = new Date();
					analysed++;
				},
				(review, e) => this.logger.warn(`Review ${review.reviewId} failed: ${e.message}`),
			);
		} catch (e) {
			await this.em.flush();
			throw e;
		}
		// One flush at the end: the reviews are read side by side on this entity manager
		await this.em.flush();
		// Agent B over the new claims in the same step; what it misses, the `statement-parts` backlog reads
		const parts = await this.statementPartsService.read({ ids: created.map(s => s.id) });
		return { analysed, tokens: tokens + parts.tokens };
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
