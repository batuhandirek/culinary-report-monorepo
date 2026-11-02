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
	 * too. Run right after a month ends, nothing extra comes back.
	 *
	 * Every item repeats its place's all-time rating and review count, so each venue with at
	 * least one item gets today's `VenueSnapshot` for free: the report's rating trend. A venue
	 * with no review since the month began returns no item and gets none.
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
	): Promise<number> {
		return this.scrape(venueIds, {
			startDate: since,
			keep: publishedAt => publishedAt.slice(0, 10) >= since,
			budgetUsd,
			label: since === `${month}-01` ? month : `${month} from ${since}`,
			now,
		});
	}

	/**
	 * The weekly watch: these venues' reviews published since `since` (the actor takes a day),
	 * whatever month they fall in. Also snapshots each venue's rating, like `scrapeMonth`.
	 */
	async scrapeRecent(
		venueIds: string[],
		since: Date,
		budgetUsd: number,
		now = new Date(),
	): Promise<number> {
		const day = since.toISOString().slice(0, 10);
		return this.scrape(venueIds, {
			startDate: day,
			keep: publishedAt => new Date(publishedAt) >= since,
			budgetUsd,
			label: `since ${day}`,
			now,
		});
	}

	/**
	 * Today's rating snapshot of these venues at the price of one review each: the newest review
	 * of every place repeats its all-time rating and review count. The reviews themselves are
	 * not kept, since the month scrape keeps the report venues' and the rest would only add
	 * analysis. A place without any review returns nothing. The places go to the actor in the
	 * order given, so a cap that stops the run cuts the last ones. Flushes.
	 */
	async snapshotRatings(
		venueIds: string[],
		budgetUsd: number,
		now = new Date(),
	): Promise<{ requested: number; snapshots: number }> {
		const order = new Map(venueIds.map((id, i) => [id, i]));
		const venues = _.sortBy(await this.em.find(Venue, { id: { $in: venueIds } }), v =>
			order.get(v.id),
		);
		if (venues.length === 0) return { requested: 0, snapshots: 0 };
		const byPlaceId = new Map(venues.map(v => [v.placeId, v]));
		const items = await this.apifyService.runActor<GoogleReviewItem>(
			GOOGLE_REVIEWS_ACTOR,
			{
				placeIds: venues.map(v => v.placeId),
				maxReviews: 1,
				reviewsSort: 'newest',
				language: 'en',
				personalData: false,
			},
			{ maxCostUsd: budgetUsd, purpose: `google-ratings: ${venues.length} venues` },
		);
		const rated = new Set<string>();
		for (const item of items) {
			const venue = item.placeId ? byPlaceId.get(item.placeId) : undefined;
			if (!venue || rated.has(venue.id)) continue;
			if (item.totalScore == null && item.reviewsCount == null) continue;
			await this.venueService.recordRating(venue, item, now);
			rated.add(venue.id);
		}
		await this.em.flush();
		return { requested: venues.length, snapshots: rated.size };
	}

	/**
	 * Of these venues, the ones with a Google review stored from before `month`: a venue without
	 * one has no history yet (never in a month scrape, or only in the weekly watch's last days),
	 * and the monthly `SCRAPE_REVIEWS` starts it months earlier. TripAdvisor rows don't count.
	 */
	async venuesWithHistory(venueIds: string[], month: string): Promise<Set<string>> {
		if (venueIds.length === 0) return new Set();
		const rows = await this.em.getConnection().execute<{ venue_id: string }[]>(
			`select distinct venue_id from reviews
			where platform = '${ReviewPlatformEnum.GOOGLE}' and published_at < ?
				and venue_id in (${venueIds.map(() => '?').join(', ')})`,
			[monthRange(month).start, ...venueIds],
		);
		return new Set(rows.map(r => r.venue_id));
	}

	private async scrape(
		venueIds: string[],
		opts: {
			startDate: string;
			keep: (publishedAt: string) => boolean;
			budgetUsd: number;
			label: string;
			now: Date;
		},
	): Promise<number> {
		const order = new Map(venueIds.map((id, i) => [id, i]));
		const venues = _.sortBy(await this.em.find(Venue, { id: { $in: venueIds } }), v =>
			order.get(v.id),
		);
		if (venues.length === 0) return 0;
		const byPlaceId = new Map(venues.map(v => [v.placeId, v]));

		const items = await this.apifyService.runActor<GoogleReviewItem>(
			GOOGLE_REVIEWS_ACTOR,
			{
				placeIds: venues.map(v => v.placeId),
				reviewsStartDate: opts.startDate,
				reviewsSort: 'newest',
				language: 'en',
				personalData: false,
			},
			{
				maxCostUsd: opts.budgetUsd,
				purpose: `google-reviews ${opts.label}: ${venues.length} venues`,
			},
		);

		const rated = new Set<string>();
		for (const item of items) {
			const venue = item.placeId ? byPlaceId.get(item.placeId) : undefined;
			if (!venue || rated.has(venue.id)) continue;
			if (item.totalScore == null && item.reviewsCount == null) continue;
			await this.venueService.recordRating(venue, item, opts.now);
			rated.add(venue.id);
		}

		let saved = 0;
		for (const item of items) {
			const venue = item.placeId ? byPlaceId.get(item.placeId) : undefined;
			if (
				!venue ||
				!item.reviewId ||
				!item.publishedAtDate ||
				!opts.keep(item.publishedAtDate)
			)
				continue;
			const review =
				(await this.em.findOne(Review, { reviewId: item.reviewId })) ??
				this.em.create(Review, {
					reviewId: item.reviewId,
					venue,
					publishedAt: new Date(item.publishedAtDate),
				});
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
		await this.em.flush();
		this.logger.log(
			`Saved ${saved} reviews ${opts.label}; rating snapshots for ${rated.size} of ${venues.length} venues`,
		);
		return saved;
	}

	/** Topics, dishes and noticed changes for the month's reviews that have none yet. */
	async analyseMonth(month: string): Promise<number> {
		const { start, end } = monthRange(month);
		return (await this.analyse({ analysedAt: null, publishedAt: { $gte: start, $lt: end } }))
			.analysed;
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
