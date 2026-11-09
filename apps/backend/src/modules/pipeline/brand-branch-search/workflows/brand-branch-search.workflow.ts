import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import { CityService } from 'src/modules/cities/services/city.service.js';
import { stepBudgetUsd } from 'src/modules/cities/util/city.js';
import { DurableStep } from 'src/modules/durable-workflows/decorators/durable-step.decorator.js';
import { DurableWorkflow } from 'src/modules/durable-workflows/decorators/durable-workflow.decorator.js';
import { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';
import { durableNow } from 'src/modules/durable-workflows/util/durable-steps.js';
import { VenueScrapeSourceEnum } from 'src/modules/venues/constants/venue-status.constant.js';
import { type BranchSearchBrand, BrandService } from 'src/modules/venues/services/brand.service.js';

import { type PlacesResult, PlacesWorkflow } from '../../atoms/places/workflows/places.workflow.js';
import { PipelineStepEnum } from '../../constants/pipeline.constant.js';
import { workflowName } from '../../shared/util/operations.js';
import {
	BRAND_BRANCH_SEARCH_BRAND,
	BRAND_SEARCH_BUDGET_USD,
	BRAND_SEARCH_RESULTS,
} from '../constants/brand-branch-search.constant.js';

/** What the plan step says: the brands to search by name, and what the run may spend */
interface BranchSearchPlan {
	cityName: string;
	brands: BranchSearchBrand[];
	budgetUsd: number;
}

export interface BranchSearchResult {
	brands: number;
	found: number;
	saved: number;
	/** Open food venues named like a brand that are not its branches: offered on its page */
	candidates: number;
}

/**
 * Branches found by a brand search: one `places.run` of the brands' names on the city's grid,
 * `BRAND_SEARCH_RESULTS` places a name (Google lists a chain's branches together, look-alikes
 * after them), every place saved as a lookup (never an opening, so matching gets the look-alikes
 * too), then the places on the brand's own site joined to it and the rest counted for an admin
 * (`BrandService.saveBranchSearch`). `month` covers every chain with a branch in the city, after
 * the quarter's list (`scrape-venues.month` calls it under its one id); `brand` is one brand by
 * hand ("Find branches", `AdminBrandBranchSearchController`), the page polling
 * `branchesSearchedAt` until the save stamps it.
 */
@Injectable()
export class BrandBranchSearchWorkflow {
	constructor(
		private readonly orm: MikroORM,
		private readonly durable: DurableWorkflowsService,
		private readonly cityService: CityService,
		private readonly brandService: BrandService,
		private readonly places: PlacesWorkflow,
	) {}

	@DurableWorkflow({ name: workflowName('brand-branch-search', 'month') })
	@EnsureRequestContext()
	async month(cityId: string, _month: string): Promise<BranchSearchResult> {
		return this.search(cityId, null);
	}

	@DurableWorkflow({ name: BRAND_BRANCH_SEARCH_BRAND })
	@EnsureRequestContext()
	async brand(brandId: string, cityId: string): Promise<BranchSearchResult> {
		return this.search(cityId, [brandId]);
	}

	private async search(cityId: string, brandIds: string[] | null): Promise<BranchSearchResult> {
		const now = await durableNow(this.durable);
		const plan = await this.plan(cityId, brandIds);
		if (!plan.brands.length) return { brands: 0, found: 0, saved: 0, candidates: 0 };
		const found = await this.places.call({
			cityId,
			search: {
				mode: 'grid',
				queries: plan.brands.map(b => b.name),
				perQuery: BRAND_SEARCH_RESULTS,
			},
			maxCostUsd: plan.budgetUsd,
			purpose: `google-places brands ${plan.cityName}: ${plan.brands.map(b => b.name).join(', ')}`,
			save: { source: VenueScrapeSourceEnum.LOOKUP, newPlaces: 'all' },
		});
		return this.save(cityId, plan.brands, found, now);
	}

	/** The city's chains, or the given brands, with the budget: the step's for the quarter's run, a dollar for a hand run */
	@DurableStep({ name: 'plan' })
	private async plan(cityId: string, brandIds: string[] | null): Promise<BranchSearchPlan> {
		const city = await this.cityService.getById(cityId);
		const { brands } = await this.brandService.planBranchSearch(city, brandIds);
		return {
			cityName: city.name,
			brands,
			budgetUsd:
				brandIds ? BRAND_SEARCH_BUDGET_USD : (
					stepBudgetUsd(city, PipelineStepEnum.SEARCH_BRANCHES)
				),
		};
	}

	/** The branches on the brands' sites joined, the candidates counted, the brands stamped */
	@DurableStep({ name: PipelineStepEnum.SEARCH_BRANCHES })
	private async save(
		cityId: string,
		brands: BranchSearchBrand[],
		found: PlacesResult,
		now: Date,
	): Promise<BranchSearchResult> {
		return this.brandService.saveBranchSearch(
			await this.cityService.getById(cityId),
			brands,
			found,
			now,
		);
	}
}
