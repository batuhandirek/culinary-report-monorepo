import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import { FoodTopicService } from 'src/modules/food-topics/services/food-topic.service.js';
import { VenueFoodTopicService } from 'src/modules/food-topics/services/venue-food-topic.service.js';
import { SearchInterestService } from 'src/modules/trends/services/search-interest.service.js';
import { TrendService } from 'src/modules/trends/services/trend.service.js';
import _ from 'lodash';

import type { Venue } from 'src/modules/venues/entities/venue.entity.js';
import type { VenueDetails } from 'src/modules/venues/interfaces/venue-details.interface.js';
import { RATING_BENCHMARK_MIN_REVIEWS, RatingPeer, isRatingPeer } from 'src/modules/venues/util/rating-benchmark.js';
import { VenueSearchRankService } from 'src/modules/venues/services/venue-search-rank.service.js';
import { VenueStatusChangeService } from 'src/modules/venues/services/venue-status-change.service.js';
import { monthRange } from 'src/modules/venues/util/month.js';
import { quarterWindow } from 'src/modules/venues/util/venue-status.js';

import type {
	ReportCitySection,
	ReportNeighbourhood,
	ReportRatingBenchmark,
	ReportSearchRank,
} from '../interfaces/report-data.interface.js';
import { cityThemes, type CityThemeComplaint } from '../util/city-themes.js';
import { BaselineReview, baselineVenues, citySection } from '../util/city-section.js';
import { ratingBenchmark } from '../util/rating-benchmark.js';
import { neighbourhoodChanges } from '../util/neighbourhood.js';
import { reportSearchRanks } from '../util/search-ranks.js';

/**
 * The report's city context: the city's rising cuisines and dishes (`TrendService`), the brand's
 * place in its kind of food and its month against the month's report brands; and, per branch,
 * its neighbourhood's openings and closures (`VenueStatusChangeService`), search ranks and
 * rating benchmark.
 */
@Injectable()
export class ReportCityService {
	constructor(
		private readonly em: EntityManager,
		private readonly trendService: TrendService,
		private readonly searchInterestService: SearchInterestService,
		private readonly venueStatusChangeService: VenueStatusChangeService,
		private readonly venueSearchRankService: VenueSearchRankService,
		private readonly foodTopicService: FoodTopicService,
		private readonly venueFoodTopicService: VenueFoodTopicService,
	) {}

	/** The venue's Google Maps search ranks of the month with their history (`TRACK_SEARCH_RANKS`). */
	async searchRanks(venue: Venue, month: string): Promise<ReportSearchRank[] | undefined> {
		return reportSearchRanks(
			await this.venueSearchRankService.forVenue(venue.id),
			month,
			venue.placeId,
		);
	}

	/**
	 * Openings and closures in the venue's district over the quarter ending with `month`: the
	 * scrapes' and the openings a matched post announced. Undefined without a district, or before
	 * the city's first city-wide list (closures unknown yet).
	 */
	async neighbourhood(venue: Venue, month: string): Promise<ReportNeighbourhood | undefined> {
		if (!venue.district || !venue.city.venuesScrapedAt) return undefined;
		const window = quarterWindow(month);
		const rows = await this.venueStatusChangeService.inDistrict(
			venue.city.id,
			venue.district,
			venue.id,
			month,
		);
		return {
			changes: neighbourhoodChanges(
				{ district: venue.district, street: venue.street },
				window,
				rows,
			),
		};
	}

	/**
	 * The brand's month in its city, `branches` its open branches there: its kind of food is the
	 * primary food topic most of them share (the most reviewed one's on a tie). `peerBrandIds` are
	 * the month's report brands of the city (the pipeline passes `topBrands`); without them, the
	 * brands that already have a report of the month in the city, plus this one. Undefined when
	 * the city's month is too thin to show.
	 */
	async section(
		branches: Venue[],
		month: string,
		peerBrandIds?: string[],
	): Promise<ReportCitySection | undefined> {
		const [first] = branches;
		const cityId = first.city.id;
		const brandId = first.brand.id;
		const { trends, mentions } = await this.trendService.monthWithMentions(month, cityId);
		const peers = [...new Set([brandId, ...(peerBrandIds ?? (await this.reportBrandIds(cityId, month)))])];
		const index = await this.foodTopicService.index();
		const tags = await this.venueFoodTopicService.tags(branches);
		const primaries = branches.flatMap(b => (tags.get(b.id) ?? []).filter(t => t.primary).map(t => t.key));
		const counts = _.countBy(primaries);
		const section = citySection({
			cityName: first.city.name,
			brandId,
			// Most branches' first; `primaries` keeps the branches' order for a tie
			venueTopic: _.maxBy(_.uniq(primaries), key => counts[key]),
			index,
			trends,
			mentions,
			baseline: baselineVenues(peers, mentions, await this.reviews(peers, cityId, month)),
		});
		if (section) {
			const searches = await this.searchInterestService.reportDeltas(cityId, month, section.cuisine?.key);
			if (searches.length) section.searches = searches;
			const themes = cityThemes({ brandId, ...(await this.complaintThemes(peers, cityId, month)) });
			if (themes?.length) section.themes = themes;
		}
		return section;
	}

	/**
	 * The month's complaint points of these brands' written reviews in the city, and their written
	 * reviews per brand: what `cityThemes` compares.
	 */
	private async complaintThemes(
		brandIds: string[],
		cityId: string,
		month: string,
	): Promise<{ complaints: CityThemeComplaint[]; written: Map<string, number> }> {
		const { start, end } = monthRange(month);
		const conn = this.em.getConnection();
		const marks = brandIds.map(() => '?').join(', ');
		const params = [...brandIds, cityId, start, end];
		const where = `v.brand_id in (${marks}) and v.city_id = ? and r.published_at >= ? and r.published_at < ?
			and coalesce(r.text_translated, r.text, '') <> ''`;
		const complaints: { brand_id: string; review_id: string; theme: string | null }[] = await conn.execute(
			`select v.brand_id, r.id as review_id, f.theme
			from reviews r join venues v on v.id = r.venue_id
			join feedback_points f on f.review_id = r.id and f.sentiment = 'negative' and f.detail is not null
			where ${where}`,
			params,
		);
		const written: { brand_id: string; n: number }[] = await conn.execute(
			`select v.brand_id, count(*)::int as n from reviews r join venues v on v.id = r.venue_id where ${where} group by 1`,
			params,
		);
		return {
			complaints: complaints.map(c => ({ brandId: c.brand_id, reviewId: c.review_id, theme: c.theme })),
			written: new Map(written.map(w => [w.brand_id, w.n])),
		};
	}

	/**
	 * Each branch's all-time Google rating against its city's open food venues with 20+ reviews:
	 * its district's and its primary food topic's (`ratingBenchmark`), by branch id; a branch
	 * without a rating or enough peers either way is left out. One read of the city's venues and
	 * their tags per city.
	 */
	async ratingBenchmarks(branches: Venue[]): Promise<Map<string, ReportRatingBenchmark>> {
		const out = new Map<string, ReportRatingBenchmark>();
		const rated = branches.filter(b => b.rating != null);
		if (!rated.length) return out;
		const index = await this.foodTopicService.index();
		for (const inCity of Object.values(_.groupBy(rated, b => b.city.id))) {
			const rows: {
				id: string;
				name: string;
				category: string | null;
				categories: string[] | null;
				district: string | null;
				rating: number | string;
				reviews_count: number;
				review_tags: VenueDetails['reviewsTags'] | null;
			}[] = await this.em.getConnection().execute(
				`select id, name, category, categories, district, rating, reviews_count, details->'reviewsTags' as review_tags
				from venues
				where city_id = ? and not closed and deleted_at is null and rating is not null and reviews_count >= ?`,
				[inCity[0].city.id, RATING_BENCHMARK_MIN_REVIEWS],
			);
			const peers = rows
				.map(r => ({ ...r, rating: Number(r.rating), reviewsCount: r.reviews_count }))
				.filter(p => isRatingPeer(p));
			// Stored tags: each peer's and branch's, by id
			const tags = await this.venueFoodTopicService.tags(_.uniqBy([...peers, ...inCity], v => v.id));
			for (const branch of inCity) {
				const benchmark = ratingBenchmark({
					branch: branch as RatingPeer,
					cityName: branch.city.name,
					peers,
					tags,
					index,
				});
				if (benchmark) out.set(branch.id, benchmark);
			}
		}
		return out;
	}

	private async reportBrandIds(cityId: string, month: string): Promise<string[]> {
		const rows: { brand_id: string }[] = await this.em
			.getConnection()
			.execute(`select brand_id from reports where city_id = ? and month = ?`, [cityId, month]);
		return rows.map(r => r.brand_id);
	}

	/** The month's reviews of these brands' branches in the city. */
	private async reviews(brandIds: string[], cityId: string, month: string): Promise<BaselineReview[]> {
		if (!brandIds.length) return [];
		const { start, end } = monthRange(month);
		const rows: { brand_id: string; stars: number | null; replied: boolean }[] = await this.em
			.getConnection()
			.execute(
				`select v.brand_id, r.stars, coalesce(r.owner_response, '') <> '' as replied
				from reviews r join venues v on v.id = r.venue_id
				where v.brand_id in (${brandIds.map(() => '?').join(', ')}) and v.city_id = ?
					and r.published_at >= ? and r.published_at < ?`,
				[...brandIds, cityId, start, end],
			);
		return rows.map(r => ({ brandId: r.brand_id, stars: r.stars, replied: r.replied }));
	}
}
