import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import _ from 'lodash';

import { CityService } from 'src/modules/cities/services/city.service.js';
import { stepBudgetUsd } from 'src/modules/cities/util/city.js';
import { DurableStep } from 'src/modules/durable-workflows/decorators/durable-step.decorator.js';
import { DurableWorkflow } from 'src/modules/durable-workflows/decorators/durable-workflow.decorator.js';
import { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';
import { VenueScrapeSourceEnum } from 'src/modules/venues/constants/venue-status.constant.js';
import { VenueScrapeService } from 'src/modules/venues/services/venue-scrape.service.js';

import { type PlacesResult, PlacesWorkflow } from '../../atoms/places/workflows/places.workflow.js';
import { PipelineStepEnum } from '../../constants/pipeline.constant.js';
import {
	REFRESH_VENUE_DETAILS_VENUE,
	VENUE_DETAILS_REFRESH_USD,
} from '../constants/refresh-venue-details.constant.js';
import { FILL_COMPETITORS_MONTH } from '../../fill-competitors/constants/fill-competitors.constant.js';
import { FillCompetitorsWorkflow } from '../../fill-competitors/workflows/fill-competitors.workflow.js';
import { ReportBrandsService } from '../../shared/services/report-brands.service.js';
import { runOperation, workflowName } from '../../shared/util/operations.js';

/** What the plan step says: the places to refresh (every report branch and competitor, once each) */
interface DetailsPlan {
	placeIds: string[];
	competitors: number;
	budgetUsd: number;
}

/**
 * The Google Maps detail pages of every report branch and of their competitors (hours, amenities,
 * popular times, menus, the "Order online" links): the report compares them. One `places.run` of
 * the detail pages (known venues only), after the competitors are picked, so it calls that.
 * `venue` is one place by hand ("Refresh from Google" on its page, `AdminRefreshVenueDetailsController`).
 */
@Injectable()
export class RefreshVenueDetailsWorkflow {
	constructor(
		private readonly orm: MikroORM,
		private readonly durable: DurableWorkflowsService,
		private readonly cityService: CityService,
		private readonly reportBrands: ReportBrandsService,
		private readonly venueScrapeService: VenueScrapeService,
		private readonly places: PlacesWorkflow,
		private readonly fillCompetitors: FillCompetitorsWorkflow,
	) {}

	@DurableWorkflow({ name: workflowName('refresh-venue-details', 'month') })
	@EnsureRequestContext()
	async month(cityId: string, month: string) {
		await runOperation(
			this.durable,
			this.fillCompetitors.month,
			FILL_COMPETITORS_MONTH,
			cityId,
			month,
		);
		const plan = await this.plan(cityId, month);
		const details =
			plan.placeIds.length ?
				await this.places.call({
					cityId: null,
					search: { mode: 'details', placeIds: plan.placeIds },
					maxCostUsd: plan.budgetUsd,
					purpose: `google-places details: ${plan.placeIds.length} venues`,
					save: { source: VenueScrapeSourceEnum.DETAILS, newPlaces: 'none' },
				})
			:	null;
		return this.summary(plan, details);
	}

	@DurableWorkflow({ name: REFRESH_VENUE_DETAILS_VENUE })
	@EnsureRequestContext()
	async venue(venueId: string): Promise<{ saved: number; withPopularTimes: number }> {
		const target = await this.venueTarget(venueId);
		const details = await this.places.call({
			cityId: null,
			search: { mode: 'details', placeIds: [target.placeId] },
			maxCostUsd: VENUE_DETAILS_REFRESH_USD,
			purpose: `google-places details: ${target.name}`,
			save: { source: VenueScrapeSourceEnum.DETAILS, newPlaces: 'none' },
		});
		return { saved: details.saved, ...(await this.venueSummary(details)) };
	}

	@DurableStep({ name: 'venue' })
	private async venueTarget(venueId: string) {
		return this.venueScrapeService.detailsTarget(venueId);
	}

	@DurableStep({ name: PipelineStepEnum.REFRESH_VENUE_DETAILS })
	private async venueSummary(details: PlacesResult) {
		return this.venueScrapeService.detailsSummary(details.recordId);
	}

	/** The month's report branches and their competitors, by place id */
	@DurableStep({ name: 'plan details' })
	private async plan(cityId: string, month: string): Promise<DetailsPlan> {
		const city = await this.cityService.getById(cityId);
		const scope = await this.reportBrands.scope(city, month);
		return {
			placeIds: _.uniq([...scope.branches, ...scope.competitors].map(v => v.placeId)),
			competitors: scope.competitors.length,
			budgetUsd: stepBudgetUsd(city, PipelineStepEnum.REFRESH_VENUE_DETAILS),
		};
	}

	/** What the run brought: the places saved, and how many came with popular times */
	@DurableStep({ name: PipelineStepEnum.REFRESH_VENUE_DETAILS })
	private async summary(plan: DetailsPlan, details: PlacesResult | null) {
		return {
			requested: plan.placeIds.length,
			saved: details?.saved ?? 0,
			withPopularTimes:
				details ?
					(await this.venueScrapeService.detailsSummary(details.recordId))
						.withPopularTimes
				:	0,
			competitors: plan.competitors,
		};
	}
}
