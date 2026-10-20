import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import { FoodTopicService } from 'src/modules/food-topics/services/food-topic.service.js';
import { VenueFoodTopicService } from 'src/modules/food-topics/services/venue-food-topic.service.js';
import { SearchInterestService } from 'src/modules/trends/services/search-interest.service.js';
import { TrendService } from 'src/modules/trends/services/trend.service.js';
import type { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { VenueSearchRankService } from 'src/modules/venues/services/venue-search-rank.service.js';
import { VenueStatusChangeService } from 'src/modules/venues/services/venue-status-change.service.js';
import { monthRange } from 'src/modules/venues/util/month.js';
import { quarterWindow } from 'src/modules/venues/util/venue-status.js';

import type {
	ReportCitySection,
	ReportNeighbourhood,
	ReportSearchRank,
} from '../interfaces/report-data.interface.js';
import { BaselineReview, baselineVenues, citySection } from '../util/city-section.js';
import { neighbourhoodChanges } from '../util/neighbourhood.js';
import { reportSearchRanks } from '../util/search-ranks.js';

/**
 * The report's city context: the city's rising cuisines and dishes (`TrendService`), the brand's
 * place in its kind of food and its month against the month's report brands; and its branch's
 * neighbourhood's openings and closures (`VenueStatusChangeService`).
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
	 * Openings and closures in the venue's district over the quarter ending with `month`.
	 * Undefined without a district, or before the city's first city-wide list (no openings yet).
	 */
	async neighbourhood(venue: Venue, month: string): Promise<ReportNeighbourhood | undefined> {
		if (!venue.district || !venue.city.venuesScrapedAt) return undefined;
		const window = quarterWindow(month);
		const rows = await this.venueStatusChangeService.inDistrict(
			venue.city.id,
			venue.district,
			venue.id,
			window.start,
			window.end,
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
	 * The brand's month in its city: `venue` is the branch the report describes (its food topic
	 * places the brand in its kind of food). `peerBrandIds` are the month's report brands of the
	 * city (the pipeline passes `topBrands`); without them, the brands that already have a report
	 * of the month in the city, plus this one. Undefined when the city's month is too thin to show.
	 */
	async section(
		venue: Venue,
		month: string,
		peerBrandIds?: string[],
	): Promise<ReportCitySection | undefined> {
		const cityId = venue.city.id;
		const brandId = venue.brand.id;
		const { trends, mentions } = await this.trendService.monthWithMentions(month, cityId);
		const peers = [...new Set([brandId, ...(peerBrandIds ?? (await this.reportBrandIds(cityId, month)))])];
		const index = await this.foodTopicService.index();
		const tags = (await this.venueFoodTopicService.tags([venue], index)).get(venue.id) ?? [];
		const section = citySection({
			cityName: venue.city.name,
			brandId,
			venueTopic: tags.find(t => t.primary)?.key,
			index,
			trends,
			mentions,
			baseline: baselineVenues(peers, mentions, await this.reviews(peers, cityId, month)),
		});
		if (section) {
			const searches = await this.searchInterestService.reportDeltas(cityId, month, section.cuisine?.key);
			if (searches.length) section.searches = searches;
		}
		return section;
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
