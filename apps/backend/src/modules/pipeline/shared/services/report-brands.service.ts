import { Injectable } from '@nestjs/common';

import _ from 'lodash';

import type { City } from 'src/modules/cities/entities/city.entity.js';
import { ProspectQueryService } from 'src/modules/outreach/services/prospect-query.service.js';
import { MentionMatchingService } from 'src/modules/social/services/mention-matching.service.js';
import type { Brand } from 'src/modules/venues/entities/brand.entity.js';
import type { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { BrandService } from 'src/modules/venues/services/brand.service.js';
import { CompetitorService } from 'src/modules/venues/services/competitor.service.js';

/**
 * A brand a month's operations cover in a city: its open branches there, the most reviewed first.
 * Every branch's place figures are scraped and reported; no branch stands in for the brand.
 */
export interface ReportBrand {
	brand: Brand;
	branches: Venue[];
	/** Its place among the city's most talked-about brands of the month (1 = most); absent outside the top */
	rank?: number;
	/** A won prospect: a paying customer, covered whatever its rank */
	won: boolean;
}

/** The report brands with every branch and every competing place: what the place steps scrape */
export interface ReportScope {
	brands: ReportBrand[];
	branches: Venue[];
	competitors: Venue[];
}

/**
 * The month's report brands of a city, the one list every operation that scrapes for reports
 * reads. Composed from the modules that own each part, through their services: the most talked
 * about (social), the paying customers (outreach), their branches and competitors (venues). It
 * lives in the pipeline because no domain module may read all three.
 */
@Injectable()
export class ReportBrandsService {
	constructor(
		private readonly mentionMatchingService: MentionMatchingService,
		private readonly prospectQueryService: ProspectQueryService,
		private readonly brandService: BrandService,
		private readonly competitorService: CompetitorService,
	) {}

	/**
	 * The `top` (the city's `topBrands` by default) brands most talked about by others in the
	 * month, then every won prospect with a branch in the city whatever its rank: the report is what
	 * they pay for. A lost or opted-out prospect still gets one when it ranks: only outreach stops.
	 */
	async of(city: City, month: string, top = city.topBrands): Promise<ReportBrand[]> {
		const [ranked, won] = await Promise.all([
			this.mentionMatchingService.topBrandIds(month, top, city.id),
			this.prospectQueryService.wonBrandIds(),
		]);
		const ids = _.uniq([...ranked, ...won]);
		const byBrand = _.groupBy(
			await this.brandService.openBranchesIn(ids, city.id),
			v => v.brand.id,
		);
		return ids
			.filter(id => byBrand[id])
			.map(id => ({
				brand: byBrand[id][0].brand,
				branches: byBrand[id],
				...(ranked.includes(id) && { rank: ranked.indexOf(id) + 1 }),
				won: won.includes(id),
			}));
	}

	/** The report brands, every branch of theirs and every competing place: what a place step scrapes */
	async scope(city: City, month: string): Promise<ReportScope> {
		const brands = await this.of(city, month);
		return {
			brands,
			branches: brands.flatMap(b => b.branches),
			competitors: await this.competitorService.competitorVenuesOf(
				brands.map(b => b.brand.id),
				city.id,
			),
		};
	}

	/** The city's open branches of won brands: the subscribers the weekly review watch covers */
	async subscribedVenues(city: City): Promise<Venue[]> {
		return this.brandService.openBranchesIn(
			await this.prospectQueryService.wonBrandIds(),
			city.id,
		);
	}

	/**
	 * What a week's search by name covers: the report brands of `month`, the brands of their
	 * competing places and the open prospects, each by its busiest open branch in the city
	 */
	async nameSearchVenues(city: City, month: string): Promise<Venue[]> {
		const scope = await this.scope(city, month);
		return this.brandService.busiestBranchesIn(
			[
				...scope.brands.map(b => b.brand.id),
				...scope.competitors.map(v => v.brand.id),
				...(await this.prospectQueryService.openBrandIds()),
			],
			city.id,
		);
	}

	/** The won prospects' brands with a branch in the city: their names are searched on Google Trends */
	async wonBrandsIn(city: City): Promise<Brand[]> {
		return this.brandService.withBranchIn(
			await this.prospectQueryService.wonBrandIds(),
			city.id,
		);
	}
}
