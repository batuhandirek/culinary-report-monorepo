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
import { VenueScrapeService } from 'src/modules/venues/services/venue-scrape.service.js';

import { type PlacesResult, PlacesWorkflow } from '../../atoms/places/workflows/places.workflow.js';
import { BRAND_BRANCH_SEARCH_MONTH } from '../../brand-branch-search/constants/brand-branch-search.constant.js';
import { BrandBranchSearchWorkflow } from '../../brand-branch-search/workflows/brand-branch-search.workflow.js';
import { PipelineStepEnum } from '../../constants/pipeline.constant.js';
import { runOperation, workflowName } from '../../shared/util/operations.js';
import { CITY_LIST_PER_TERM, CITY_LIST_TERMS } from '../constants/scrape-venues.constant.js';
import { cityVenueScrapeDue } from '../util/venue-scrape-due.js';

/** What the `due` step says: whether the quarter is up, and what the list runs with */
interface CityListDue {
	due: boolean;
	/** The city had a list before: this one records openings */
	scrapedBefore: boolean;
	budgetUsd: number;
	cityName: string;
}

/**
 * The city's Places list a quarter after the last one (openings and closures, new venues to match
 * against): one `places.run` of the city's terms on its grid, every place saved, the city stamped;
 * then every chain's name searched for the branches that opened since (`brand-branch-search`,
 * called by its one id). Every month it checks whether the quarter is up; most months it does
 * nothing.
 */
@Injectable()
export class ScrapeVenuesWorkflow {
	constructor(
		private readonly orm: MikroORM,
		private readonly durable: DurableWorkflowsService,
		private readonly cityService: CityService,
		private readonly venueScrapeService: VenueScrapeService,
		private readonly places: PlacesWorkflow,
		private readonly brandBranchSearch: BrandBranchSearchWorkflow,
	) {}

	@DurableWorkflow({ name: workflowName('scrape-venues', 'month') })
	@EnsureRequestContext()
	async month(cityId: string, month: string) {
		const now = await durableNow(this.durable);
		const due = await this.due(cityId, now);
		if (!due.due) return { due: false };
		const list = await this.places.call({
			cityId,
			search: { mode: 'grid', queries: CITY_LIST_TERMS, perQuery: CITY_LIST_PER_TERM },
			maxCostUsd: due.budgetUsd,
			purpose: `google-places ${due.cityName}: ${CITY_LIST_TERMS.join(', ')}`,
			// The city's first list is the baseline: what it finds is not new
			save: {
				source: VenueScrapeSourceEnum.CITY,
				newPlaces: 'all',
				openings: due.scrapedBefore,
			},
		});
		const venues = await this.markScraped(cityId, list, now);
		const branches = await runOperation(
			this.durable,
			this.brandBranchSearch.month,
			BRAND_BRANCH_SEARCH_MONTH,
			cityId,
			month,
		);
		return { due: true, venues, branches };
	}

	@DurableStep({ name: 'due' })
	private async due(cityId: string, now: Date): Promise<CityListDue> {
		const city = await this.cityService.getById(cityId);
		return {
			due: cityVenueScrapeDue(city.venuesScrapedAt, now),
			scrapedBefore: !!city.venuesScrapedAt,
			budgetUsd: stepBudgetUsd(city, PipelineStepEnum.SCRAPE_VENUES),
			cityName: city.name,
		};
	}

	/** The list taken: the city stamped (the next list records openings; a quarter later it is due again) */
	@DurableStep({ name: PipelineStepEnum.SCRAPE_VENUES })
	private async markScraped(
		cityId: string,
		list: PlacesResult,
		now: Date,
	): Promise<{ found: number; saved: number }> {
		await this.venueScrapeService.markCityScraped(await this.cityService.getById(cityId), now);
		return { found: list.found, saved: list.saved };
	}
}
