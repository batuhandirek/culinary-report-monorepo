import type { FilterQuery, ObjectQuery } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import _ from 'lodash';

import { ApifyService } from 'src/modules/apify/services/apify.service.js';
import { FeedbackService } from 'src/modules/feedback/services/feedback.service.js';
import { PgBossService } from 'src/modules/pgboss/pgboss.service.js';
import { runPool } from 'src/shared/util/pool.js';

import { ReviewAnalysisAgent } from '../agents/review-analysis.agent.js';
import { Review, ReviewPlatformEnum } from '../entities/review.entity.js';
import { Venue } from '../entities/venue.entity.js';
import type { FeedbackTopic } from '../interfaces/feedback.interface.js';
import { ReviewAlertEvent } from '../persisted-events/review-alert.persisted-event.js';
import { monthRange } from '../util/month.js';

import { VenueService } from './venue.service.js';

const GOOGLE_REVIEWS_ACTOR = 'compass/Google-Maps-Reviews-Scraper';

/** What the portal's review list filters on. All optional; they combine with AND. */
export interface ReviewListFilters {
	/** `YYYY-MM` */
	month?: string;
	stars?: number;
	/** A topic the review praised or criticised */
	topic?: FeedbackTopic;
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
	topics: { topic: FeedbackTopic; count: number }[];
	/** Only the platforms the venue has reviews on */
	platforms: { platform: ReviewPlatformEnum; count: number }[];
	needsReply: number;
}

// A review the owner should answer: the alert's and the portal's "needs a reply"
export const CRITICAL_REVIEW_MAX_STARS = 3;
const NEEDS_REPLY_SQL = `(r.text is not null or r.text_translated is not null)
	and r.stars <= ${CRITICAL_REVIEW_MAX_STARS}
	and r.owner_response is null and r.marked_replied_at is null`;

// Reviews sent to the LLM in one call: few, as a mini model reads each one less closely in a
// long batch
const ANALYSIS_BATCH_SIZE = 10;

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
export class ReviewService {
	private readonly logger = new Logger(ReviewService.name);

	constructor(
		private readonly em: EntityManager,
		private readonly apifyService: ApifyService,
		private readonly reviewAnalysisAgent: ReviewAnalysisAgent,
		private readonly venueService: VenueService,
		private readonly pgBossService: PgBossService,
		private readonly feedbackService: FeedbackService,
	) {}

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
		return this.analyse({ publishedAt: { $gte: start, $lt: end } });
	}

	/** The same for these venues' reviews published since `since` (the weekly watch). */
	async analyseRecent(venueIds: string[], since: Date): Promise<number> {
		if (venueIds.length === 0) return 0;
		return this.analyse({ venue: { $in: venueIds }, publishedAt: { $gte: since } });
	}

	private async analyse(where: ObjectQuery<Review>): Promise<number> {
		const reviews = await this.em.find(
			Review,
			{
				...where,
				analysedAt: null,
				$or: [{ text: { $ne: null } }, { textTranslated: { $ne: null } }],
			} as FilterQuery<Review>,
			// Its feedback too: re-analysing a review replaces its rows
			{ populate: ['venue', 'feedback'] },
		);
		const batches = Object.values(_.groupBy(reviews, r => r.venue.id)).flatMap(group =>
			_.chunk(group, ANALYSIS_BATCH_SIZE),
		);
		const topics = reviews.length ? await this.feedbackService.dishTopics() : undefined;
		const legend = topics?.index.aspectLegend() ?? '';

		let analysed = 0;
		// A provider failure (no credits) stops the pool: keep what was finished before it
		try {
			await runPool(
				batches,
				5,
				async batch => {
					const res = await this.reviewAnalysisAgent.generate(
						JSON.stringify({
							venue: batch[0].venue.name,
							reviews: batch.map(r => ({
								reviewId: r.reviewId,
								stars: r.stars,
								text: r.textTranslated || r.text,
							})),
						}),
						{ legend },
					);
					const byId = new Map(batch.map(r => [r.reviewId, r]));
					for (const result of res.object.reviews) {
						const review = byId.get(result.reviewId);
						if (!review) continue;
						review.sentiment = result.sentiment;
						// What it says, as rows, flushed with the review
						// Its noticed changes are rows too (`change`)
						this.feedbackService.replaceFor(review, result, {
							asked: true,
							topics: topics!,
						});
						review.analysedAt = new Date();
						analysed++;
					}
				},
				(batch, e) =>
					this.logger.warn(`Review batch of ${batch[0].venue.name} failed: ${e.message}`),
			);
		} catch (e) {
			await this.em.flush();
			throw e;
		}
		// One flush at the end: the batches run side by side on this entity manager
		await this.em.flush();
		return analysed;
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
			// Praised or criticised: any point of the topic
			where.push(
				'exists (select 1 from feedback_points f where f.review_id = r.id and f.topic = ? and f.detail is not null and not f.change)',
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
			{ populate: ['feedback', 'feedback.foodTopic', 'feedback.aspect', 'feedback.aspect.parent'] },
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
			conn.execute(
				`select f.topic, count(distinct r.id)::int as count from reviews r
					join feedback_points f on f.review_id = r.id and f.detail is not null and not f.change
				where r.${venueIn} and f.topic is not null
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
			{ populate: ['feedback', 'feedback.foodTopic', 'feedback.aspect', 'feedback.aspect.parent'] },
		);
		if (!review) throw new NotFoundException();
		review.markedRepliedAt = replied ? (review.markedRepliedAt ?? new Date()) : null;
		await this.em.flush();
		return review;
	}
}
