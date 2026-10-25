import { QueryOrder } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable, Logger } from '@nestjs/common';

import type { City } from 'src/modules/cities/entities/city.entity.js';
import { FoodTopicService } from 'src/modules/food-topics/services/food-topic.service.js';
import { VenueFoodTopicService } from 'src/modules/food-topics/services/venue-food-topic.service.js';

import { Venue } from '../entities/venue.entity.js';
import { VenueSearchRank } from '../entities/venue-search-rank.entity.js';
import {
	rankInResults,
	SEARCH_RANK_DEPTH,
	SearchPlaceItem,
	searchQueries,
} from '../util/search-ranks.js';

import { VenueScrapeService } from './venue-scrape.service.js';

/**
 * Where the report venues rank on the Google Maps searches a guest would type ("ramen Mitte"):
 * one Places run per month for every query (about eight cents a search of twenty places, ~$0.004
 * a place). The places found are saved as venues (`VenueScrapeService.saveFound`).
 */
@Injectable()
export class VenueSearchRankService {
	private readonly logger = new Logger(VenueSearchRankService.name);

	constructor(
		private readonly em: EntityManager,
		private readonly venueScrapeService: VenueScrapeService,
		private readonly foodTopicService: FoodTopicService,
		private readonly venueFoodTopicService: VenueFoodTopicService,
	) {}

	/**
	 * Runs each venue's searches (`searchQueries`) and stores its rank and the top ten per query
	 * and month, replacing the month's earlier rows. A venue without a district has none.
	 */
	async track(
		city: City,
		month: string,
		venues: Venue[],
		budgetUsd: number,
	): Promise<{ venues: number; queries: number; ranked: number; notInTop: number }> {
		const plan = new Map<Venue, string[]>();
		const index = await this.foodTopicService.index();
		const tags = await this.venueFoodTopicService.tags(venues);
		for (const venue of venues) {
			const queries = searchQueries(venue.district, tags.get(venue.id) ?? [], index);
			if (queries.length) plan.set(venue, queries);
		}
		const queries = [...new Set([...plan.values()].flat())];
		if (!queries.length) return { venues: 0, queries: 0, ranked: 0, notInTop: 0 };

		// The city goes into the search itself, as a guest types it: no map grid, Google's own order
		const searched = new Map(queries.map(q => [`${q} ${city.name}`, q]));
		// Every place found is saved too (`saveFound`): a search is a free look at the city's venues
		const { items } = await this.venueScrapeService.searchPlaces<SearchPlaceItem>(
			city,
			[...searched.keys()],
			SEARCH_RANK_DEPTH,
			budgetUsd,
			`google-places search ranks ${city.name} ${month}: ${queries.length} queries`,
		);
		const byQuery = new Map<string, SearchPlaceItem[]>();
		for (const item of items) {
			const query = searched.get(item.searchString ?? '');
			if (query) byQuery.set(query, [...(byQuery.get(query) ?? []), item]);
		}

		const known = await this.em.find(
			Venue,
			{
				placeId: {
					$in: [...new Set(items.map(i => i.placeId).filter(Boolean))] as string[],
				},
			},
			{ fields: ['placeId'] },
		);
		const venueIds = new Map(known.map(v => [v.placeId, v.id]));

		await this.em.nativeDelete(VenueSearchRank, {
			venue: { $in: [...plan.keys()].map(v => v.id) },
			month,
		});
		const now = new Date();
		let ranked = 0;
		let notInTop = 0;
		for (const [venue, venueQueries] of plan) {
			for (const query of venueQueries) {
				const result = rankInResults(byQuery.get(query) ?? [], venue.placeId, venueIds);
				// A search that returned nothing (failed, or cut by the budget) is not a rank
				if (!result.results) continue;
				this.em.create(VenueSearchRank, {
					venue,
					month,
					query,
					searchedAt: now,
					...result,
				});
				if (result.rank) ranked++;
				else notInTop++;
			}
		}
		await this.em.flush();
		this.logger.log(
			`Search ranks ${city.name} ${month}: ${ranked} ranked, ${notInTop} not in the top ${SEARCH_RANK_DEPTH}`,
		);
		return { venues: plan.size, queries: queries.length, ranked, notInTop };
	}

	/** A venue's ranks, newest month first: the admin venue page and the report. */
	async forVenue(venueId: string, fromMonth?: string): Promise<VenueSearchRank[]> {
		return this.em.find(
			VenueSearchRank,
			{ venue: venueId, ...(fromMonth && { month: { $gte: fromMonth } }) },
			{ orderBy: { month: QueryOrder.DESC, query: QueryOrder.ASC } },
		);
	}
}
