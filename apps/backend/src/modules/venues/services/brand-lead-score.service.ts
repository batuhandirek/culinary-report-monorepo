import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable, Logger } from '@nestjs/common';

import _ from 'lodash';

import type { City } from 'src/modules/cities/entities/city.entity.js';
import { CityService } from 'src/modules/cities/services/city.service.js';
import { ownPostSql } from 'src/modules/social/util/accounts.js';

import {
	LEAD_DENY_LIST_FACTOR,
	LEAD_NEW_PLACE_BONUS,
	LEAD_NEW_PLACE_MAX_REVIEWS,
	LEAD_NEW_PLACE_MONTHS,
	LEAD_PRESS_VALUES,
	LEAD_PROSPECT_SCORE,
	LEAD_SCORE_WEIGHTS,
} from '../constants/lead-score.constant.js';
import { Brand } from '../entities/brand.entity.js';
import type {
	BuzzDistribution,
	LeadInputs,
	LeadSignal,
	LeadSignals,
} from '../interfaces/lead-score.interface.js';
import { monthRange, previousMonth } from '../util/month.js';
import { districtRatingStanding, RATING_BENCHMARK_MIN_REVIEWS } from '../util/rating-benchmark.js';
import { normalizeVenueName } from '../util/venue-names.js';

// Venues written in one update statement
const UPDATE_CHUNK = 500;

/** Share of `values` below `x`, ties counted at half: 1 for the clear leader. */
const percentile = (values: number[], x: number): number => {
	if (!values.length) return 0;
	let below = 0;
	let equal = 0;
	for (const v of values) {
		if (v < x) below++;
		else if (v === x) equal++;
	}
	return (below + equal / 2) / values.length;
};

const cap = (x: number): number => Math.max(0, Math.min(1, x));
const round = (x: number, digits = 2): number => Math.round(x * 10 ** digits) / 10 ** digits;

/** A chain or an institution from the city's deny-list (`City.chainDenyList`, normalized names). */
export const isDenied = (name: string, denyList: readonly string[]): boolean => {
	const normalized = ` ${normalizeVenueName(name)} `;
	return denyList.some(term => normalized.includes(` ${normalizeVenueName(term)} `));
};

/**
 * The lead score (0–100) and the signals behind it. Unknown signals (reviews not scraped) count
 * at half their weight, so missing data neither sinks nor lifts a venue. Buzz is a percentile
 * among the venues others posted about, because scrape budgets vary month to month. A deny-listed
 * chain or institution keeps only half its score.
 */
export const scoreBrand = (
	inputs: LeadInputs,
	buzz: BuzzDistribution,
	month: string,
	denyList: readonly string[] = [],
): { score: number; signals: LeadSignals } => {
	const w = LEAD_SCORE_WEIGHTS;
	const missing: string[] = [];

	const percentiles = {
		postsPercentile: inputs.posts ? percentile(buzz.posts, inputs.posts) : 0,
		viewsPercentile: inputs.posts ? percentile(buzz.views, inputs.views) : 0,
		creatorsPercentile: inputs.posts ? percentile(buzz.creators, inputs.creators) : 0,
	};
	const buzzSignal: LeadSignal = {
		value:
			inputs.posts ?
				(percentiles.postsPercentile +
					percentiles.viewsPercentile +
					percentiles.creatorsPercentile) /
				3
			:	0,
		weight: w.buzz,
		inputs: {
			posts: inputs.posts,
			views: inputs.views,
			creators: inputs.creators,
			...Object.fromEntries(Object.entries(percentiles).map(([k, v]) => [k, round(v)])),
		},
	};

	const spends: LeadSignal = {
		value:
			(inputs.ownPosts ? 0.5 : 0) +
			(inputs.promotionalPosts ? 0.3 : 0) +
			(inputs.hasWebsite ? 0.2 : 0),
		weight: w.spends,
		inputs: {
			ownPosts: inputs.ownPosts,
			promotionalPosts: inputs.promotionalPosts,
			website: inputs.hasWebsite,
		},
	};

	// Each part is 1 when it alone makes a clear pitch; half the strongest part, half their mean
	let problem: LeadSignal;
	const negativeShare = inputs.posts ? inputs.negativePosts / inputs.posts : 0;
	const r = inputs.reviews;
	const districtPercentile = inputs.districtRatingPercentile;
	if (!r) {
		missing.push('reviews not scraped');
		// Without reviews, a rating below the district's median is still a problem we can name
		const parts =
			districtPercentile != null ? [cap((50 - districtPercentile) / 50), cap(negativeShare / 0.3)] : undefined;
		problem = {
			value: parts ? (Math.max(...parts) + parts.reduce((a, b) => a + b, 0) / parts.length) / 2 : null,
			weight: w.problem,
			inputs: {
				reviews: 0,
				...(districtPercentile != null && { districtRatingPercentile: round(districtPercentile / 100) }),
				negativePostShare: round(negativeShare),
			},
		};
	} else {
		if (r.analysed === 0) missing.push('reviews not analysed');
		const complaintShare = r.analysed ? r.withComplaints / r.analysed : 0;
		const replyRate = r.total ? r.replied / r.total : 0;
		const parts = [
			cap(complaintShare / 0.4),
			cap(r.unansweredCritical / 3),
			cap((0.5 - replyRate) / 0.5),
			cap(r.withChanges / 2),
			cap(negativeShare / 0.3),
		];
		problem = {
			value: (Math.max(...parts) + parts.reduce((a, b) => a + b, 0) / parts.length) / 2,
			weight: w.problem,
			inputs: {
				reviews: r.total,
				analysedReviews: r.analysed,
				complaintShare: round(complaintShare),
				unansweredCritical: r.unansweredCritical,
				replyRate: round(replyRate),
				changesNoticed: r.withChanges,
				negativePostShare: round(negativeShare),
			},
		};
	}

	const denied = isDenied(inputs.name, denyList);

	const reachable: LeadSignal = {
		value: (inputs.hasPhone || inputs.hasWebsite ? 0.5 : 0) + (inputs.ownPosts ? 0.5 : 0),
		weight: w.reachable,
		inputs: {
			phone: inputs.hasPhone,
			website: inputs.hasWebsite,
			ownAccount: inputs.ownPosts > 0,
		},
	};

	// The best press of the window; unknown when its press was never searched
	const p = inputs.press;
	if (!p) missing.push('press not searched');
	const press: LeadSignal = {
		value:
			!p ? null
			: p.features ? LEAD_PRESS_VALUES.feature
			: p.listicles ? LEAD_PRESS_VALUES.listicle
			: p.passing ? LEAD_PRESS_VALUES.passing
			: 0,
		weight: w.press,
		inputs: p ? { ...p } : { searched: false },
	};

	const newSince = new Date(monthRange(month).end);
	newSince.setUTCMonth(newSince.getUTCMonth() - LEAD_NEW_PLACE_MONTHS);
	const newPlaceBonus =
		(
			!!inputs.openedAt &&
			inputs.openedAt >= newSince &&
			inputs.reviewsCount != null &&
			inputs.reviewsCount < LEAD_NEW_PLACE_MAX_REVIEWS
		) ?
			LEAD_NEW_PLACE_BONUS
		:	0;

	const signals = { buzz: buzzSignal, spends, problem, reachable, press };
	const weighted = Object.values(signals).reduce(
		(sum, s) => sum + s.weight * (s.value ?? 0.5),
		0,
	);
	for (const s of Object.values(signals)) if (s.value != null) s.value = round(s.value);
	return {
		score: round(
			Math.min(100, weighted * 100 + newPlaceBonus) * (denied ? LEAD_DENY_LIST_FACTOR : 1),
			1,
		),
		signals: { month, ...signals, ...(denied && { denyListed: true }), newPlaceBonus, missing },
	};
};

/** Scores a city's venues against each other's buzz; `denyList` is the city's `chainDenyList`. */
export const scoreBrands = <T extends LeadInputs>(
	venues: T[],
	month: string,
	denyList: readonly string[] = [],
): { venue: T; score: number; signals: LeadSignals }[] => {
	const mentioned = venues.filter(v => v.posts > 0);
	const buzz: BuzzDistribution = {
		posts: mentioned.map(v => v.posts),
		views: mentioned.map(v => v.views),
		creators: mentioned.map(v => v.creators),
	};
	return venues.map(venue => ({ venue, ...scoreBrand(venue, buzz, month, denyList) }));
};

interface PostRow {
	brand_id: string;
	// The author's creator: one person's TikTok and Instagram count once; null without an author
	creator_id: string | null;
	// By one of the brand's own accounts (`SocialAccount.brand`)
	own: boolean;
	posts: number;
	views: string | number;
	promotional: number;
	negative: number;
}

interface ReviewRow {
	venue_id: string;
	total: number;
	analysed: number;
	with_complaints: number;
	replied: number;
	unanswered_critical: number;
	with_changes: number;
}

interface VenueRow {
	id: string;
	name: string;
	city_id: string;
	brand_id: string;
	brand_name: string;
	opened_at: Date | null;
	// The newest post whose matched mention said it had just opened (`Mention.isNewOpening`)
	flagged_new_at: Date | null;
	reviews_count: number | null;
	district: string | null;
	category: string | null;
	rating: number | string | null;
	website: string | null;
	phone: string | null;
	closed: boolean;
	press_searched_at: Date | null;
}

interface PeerRow {
	id: string;
	city_id: string;
	district: string;
	category: string | null;
	rating: number | string;
	reviews_count: number;
}

interface PressRow {
	venue_id: string;
	features: number;
	listicles: number;
	passing: number;
}

const marks = (ids: readonly unknown[]) => ids.map(() => '?').join(', ');

/** Scores brands as outreach prospects: the one entry point for `Brand.leadScore`. */
@Injectable()
export class BrandLeadScoreService {
	private readonly logger = new Logger(BrandLeadScoreService.name);

	constructor(
		private readonly em: EntityManager,
		private readonly cityService: CityService,
	) {}

	/**
	 * Recomputes the lead score of every brand with an open branch in the city (every city
	 * without one) from `month` and the month before. A brand is scored over all its open
	 * branches, in every city, against the buzz of the city's other brands; a brand with no open
	 * branch loses its score. A few SQL passes, no paid calls.
	 */
	async scoreAll(month: string, cityId?: string): Promise<{ scored: number; prospects: number }> {
		const cities =
			cityId ? [await this.cityService.getById(cityId)] : await this.cityService.list();
		let scored = 0;
		let prospects = 0;
		for (const city of cities) {
			const result = await this.scoreCity(city, month);
			scored += result.scored;
			prospects += result.prospects;
		}
		await this.em.getConnection().execute(
			`update brands b set lead_score = null, lead_signals = null
				where b.lead_score is not null and not exists (select 1 from venues v where v.brand_id = b.id and not v.closed)`,
		);
		return { scored, prospects };
	}

	private async scoreCity(
		city: City,
		month: string,
	): Promise<{ scored: number; prospects: number }> {
		const start = monthRange(previousMonth(monthRange(month).start)).start;
		const { end } = monthRange(month);
		const conn = this.em.getConnection();

		// Every branch, in any city, of the brands with an open branch in this one
		const venues: VenueRow[] = await conn.execute(
			`select v.id, v.name, v.city_id, v.reviews_count, v.district, v.category, v.rating,
				v.website, v.phone, v.closed, v.press_searched_at,
				v.brand_id, b.name brand_name,
				(select max(s.at) from venue_status_changes s
					where s.venue_id = v.id and s.kind = 'opened') as opened_at,
				(select max(p.posted_at) from mentions m join social_posts p on p.id = m.post_id
					where m.venue_id = v.id and m.is_new_opening) as flagged_new_at
			from venues v join brands b on b.id = v.brand_id
			where v.deleted_at is null and v.brand_id in (
				select brand_id from venues where city_id = ? and not closed and deleted_at is null
			)`,
			[city.id],
		);
		const brandIds = _.uniq(venues.map(v => v.brand_id));
		const venueIds = venues.map(v => v.id);
		if (brandIds.length === 0) return { scored: 0, prospects: 0 };

		// One row per brand × author: own accounts are told apart in TypeScript. A post naming two
		// branches counts once for the brand
		const postRows: PostRow[] = [];
		for (const ids of _.chunk(brandIds, 1000))
			postRows.push(
				...(await conn.execute<PostRow[]>(
					`select m.brand_id, a.creator_id, ${ownPostSql('p', 'm.brand_id')} as own,
						count(*)::int posts, coalesce(sum(p.views), 0) views,
						count(*) filter (where p.is_ad or p.is_promotional)::int promotional,
						count(*) filter (where m.negative)::int negative
					from (
						select m.brand_id, m.post_id, bool_or(m.sentiment in ('negative', 'mixed')) negative
						from mentions m where m.brand_id in (${marks(ids)}) group by 1, 2
					) m join social_posts p on p.id = m.post_id
					left join social_accounts a on a.id = p.account_id
					where p.posted_at >= ? and p.posted_at < ?
					group by 1, 2, 3`,
					[...ids, start, end],
				)),
			);
		// Same definitions as the report: written = text, critical = 3 stars or fewer with text
		const reviewRows: ReviewRow[] = [];
		const pressRows: PressRow[] = [];
		for (const ids of _.chunk(venueIds, 1000)) {
			reviewRows.push(
				...(await conn.execute<ReviewRow[]>(
					`select venue_id, count(*)::int total,
						count(*) filter (where analysed_at is not null and coalesce(text_translated, text) is not null)::int analysed,
						count(*) filter (where analysed_at is not null and coalesce(text_translated, text) is not null
							and jsonb_array_length(coalesce(complaints, '[]'::jsonb)) > 0)::int with_complaints,
						count(*) filter (where owner_response is not null)::int replied,
						count(*) filter (where coalesce(stars, 5) <= 3 and coalesce(text_translated, text) is not null
							and owner_response is null)::int unanswered_critical,
						count(*) filter (where jsonb_array_length(coalesce(changes, '[]'::jsonb)) > 0)::int with_changes
					from reviews r where published_at >= ? and published_at < ? and venue_id in (${marks(ids)})
					group by venue_id`,
					[start, end, ...ids],
				)),
			);
			// Press found by the searches of the window (`WebMention.month`)
			pressRows.push(
				...(await conn.execute<PressRow[]>(
					`select w.venue_id,
						count(*) filter (where w.kind = 'feature')::int features,
						count(*) filter (where w.kind = 'listicle')::int listicles,
						count(*) filter (where w.kind = 'passing')::int passing
					from web_mentions w where w.month in (?, ?) and w.venue_id in (${marks(ids)}) group by w.venue_id`,
					[start.toISOString().slice(0, 7), month, ...ids],
				)),
			);
		}
		const pressByVenue = new Map(pressRows.map(r => [r.venue_id, r]));

		// Each branch's rating against its district's food venues (the report's benchmark): the
		// problem signal for a brand whose reviews were not scraped
		const cityIds = _.uniq(venues.map(v => v.city_id));
		const peerRows: PeerRow[] = await conn.execute(
			`select id, city_id, district, category, rating, reviews_count from venues
			where city_id in (${marks(cityIds)}) and not closed and deleted_at is null
				and district is not null and rating is not null and reviews_count >= ?`,
			[...cityIds, RATING_BENCHMARK_MIN_REVIEWS],
		);
		const peersByDistrict = _.groupBy(
			peerRows.map(p => ({ ...p, rating: Number(p.rating), reviewsCount: p.reviews_count })),
			p => `${p.city_id}:${p.district}`,
		);
		const districtPercentile = (v: VenueRow): number | undefined =>
			v.district ?
				districtRatingStanding(
					{ ...v, rating: v.rating == null ? null : Number(v.rating) },
					peersByDistrict[`${v.city_id}:${v.district}`] ?? [],
				)?.percentile
			:	undefined;

		const reviewsByVenue = new Map(reviewRows.map(r => [r.venue_id, r]));
		const postsByBrand = _.groupBy(postRows, r => r.brand_id);

		const units = Object.values(
			_.groupBy(
				venues.filter(v => !v.closed),
				v => v.brand_id,
			),
		);
		const inputs = units.map(members => {
			const [first] = members;
			const name = first.brand_name;
			const rows = postsByBrand[first.brand_id] ?? [];
			const own = rows.filter(r => r.own);
			const others = rows.filter(r => !r.own);
			const sum = <T>(rs: T[], f: (r: T) => number) => rs.reduce((a, r) => a + f(r), 0);
			const reviews = members.map(v => reviewsByVenue.get(v.id)).filter(r => !!r);
			// A branch is new from a scrape's `opened` change or a post saying so, whichever is later;
			// `scoreBrand` applies the window and the review cap
			const opened = members.map(v => {
				const dates = [v.opened_at, v.flagged_new_at]
					.filter((d): d is Date => !!d)
					.map(d => new Date(d));
				return dates.length ? _.max(dates)! : null;
			});
			const counts = members.map(v => v.reviews_count).filter(n => n != null);
			const searched = members.filter(
				v => v.press_searched_at && new Date(v.press_searched_at) >= start,
			);
			const press = searched.map(
				v => pressByVenue.get(v.id) ?? { features: 0, listicles: 0, passing: 0 },
			);
			return {
				brandId: first.brand_id,
				name,
				// A brand is new only when every branch is
				openedAt: opened.every(d => d) ? _.max(opened)! : null,
				reviewsCount: counts.length ? _.sum(counts) : null,
				hasWebsite: members.some(v => v.website),
				hasPhone: members.some(v => v.phone),
				posts: sum(others, r => r.posts),
				views: sum(others, r => Number(r.views)),
				// Posts without an author count as one creator each
				creators:
					others.filter(r => r.creator_id).length +
					sum(
						others.filter(r => !r.creator_id),
						r => r.posts,
					),
				ownPosts: sum(own, r => r.posts),
				promotionalPosts: sum(others, r => r.promotional),
				negativePosts: sum(others, r => r.negative),
				reviews:
					reviews.length ?
						{
							total: sum(reviews, r => r.total),
							analysed: sum(reviews, r => r.analysed),
							withComplaints: sum(reviews, r => r.with_complaints),
							replied: sum(reviews, r => r.replied),
							unansweredCritical: sum(reviews, r => r.unanswered_critical),
							withChanges: sum(reviews, r => r.with_changes),
						}
					:	null,
				// The weakest branch against its district
				districtRatingPercentile: _.min(members.map(districtPercentile).filter(p => p !== undefined)) ?? null,
				// Unknown unless a branch was searched in the window
				press:
					searched.length ?
						{
							features: sum(press, p => p.features),
							listicles: sum(press, p => p.listicles),
							passing: sum(press, p => p.passing),
						}
					:	null,
			} satisfies LeadInputs & { brandId: string };
		});

		const results = scoreBrands(inputs, month, city.chainDenyList);
		for (let i = 0; i < results.length; i += UPDATE_CHUNK) {
			const chunk = results.slice(i, i + UPDATE_CHUNK);
			await conn.execute(
				`update brands b set lead_score = x.score, lead_signals = x.signals
				from (values ${chunk.map(() => '(?::uuid, ?::float8, ?::jsonb)').join(', ')})
					as x(id, score, signals)
				where b.id = x.id`,
				chunk.flatMap(r => [r.venue.brandId, r.score, JSON.stringify(r.signals)]),
			);
		}

		const prospects = results.filter(r => r.score >= LEAD_PROSPECT_SCORE).length;
		this.logger.log(
			`Scored ${results.length} brands of ${city.name} for ${month}: ${prospects} prospects`,
		);
		return { scored: results.length, prospects };
	}

	/**
	 * Brands by lead score, best first: the outreach shortlist, with an open branch in one city
	 * or any. Their branches (and cities) are populated.
	 */
	async ranked(options: {
		limit: number;
		minScore?: number;
		cityId?: string;
		/** Brands to leave out, e.g. those already on the outreach list */
		excludeIds?: string[];
	}): Promise<Brand[]> {
		const exclude = options.excludeIds ?? [];
		const rows: { id: string }[] = await this.em.getConnection().execute(
			`select b.id from brands b
			where b.lead_score is not null and b.lead_score >= ?
				and exists (select 1 from venues v where v.brand_id = b.id and not v.closed and v.deleted_at is null
					${options.cityId ? 'and v.city_id = ?' : ''})
				${exclude.length ? `and b.id not in (${marks(exclude)})` : ''}
			order by b.lead_score desc, b.name asc limit ?`,
			[
				options.minScore ?? 0,
				...(options.cityId ? [options.cityId] : []),
				...exclude,
				options.limit,
			],
		);
		const ids = rows.map(r => r.id);
		if (ids.length === 0) return [];
		const brands = await this.em.find(
			Brand,
			{ id: { $in: ids } },
			{ populate: ['branches', 'branches.city'] },
		);
		return _.sortBy(brands, b => ids.indexOf(b.id));
	}
}
