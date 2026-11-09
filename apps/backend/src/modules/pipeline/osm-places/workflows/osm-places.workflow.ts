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
import { OsmPlaceService } from 'src/modules/venues/services/osm-place.service.js';

import { type PlacesResult, PlacesWorkflow } from '../../atoms/places/workflows/places.workflow.js';
import { PipelineStepEnum } from '../../constants/pipeline.constant.js';
import { SCRAPE_VENUES_MONTH } from '../../scrape-venues/constants/scrape-venues.constant.js';
import { ScrapeVenuesWorkflow } from '../../scrape-venues/workflows/scrape-venues.workflow.js';
import { runOperation, workflowName } from '../../shared/util/operations.js';

/** What the plan step says: the OSM places to search, each as its Google Maps search */
interface OsmLookupPlan {
	cityName: string;
	osmPlaceIds: string[];
	queries: string[];
	budgetUsd: number;
}

/**
 * OpenStreetMap as the checklist of a city's food places (only a city with an `osmRelationId`):
 * every place OSM lists linked to the venue it is (free), then the ones no venue is searched on
 * Google Maps once each (one `places.run` of typed searches, one place each). After the quarter's
 * Places list, so the links are made against it.
 */
@Injectable()
export class OsmPlacesWorkflow {
	constructor(
		private readonly orm: MikroORM,
		private readonly durable: DurableWorkflowsService,
		private readonly cityService: CityService,
		private readonly osmPlaceService: OsmPlaceService,
		private readonly places: PlacesWorkflow,
		private readonly scrapeVenues: ScrapeVenuesWorkflow,
	) {}

	@DurableWorkflow({ name: workflowName('osm-places', 'month') })
	@EnsureRequestContext()
	async month(cityId: string, month: string) {
		if (!(await this.hasBoundary(cityId))) return { boundary: false };
		await runOperation(
			this.durable,
			this.scrapeVenues.month,
			SCRAPE_VENUES_MONTH,
			cityId,
			month,
		);
		const synced = await this.sync(cityId);
		const now = await durableNow(this.durable);
		const plan = await this.planLookups(cityId);
		const found =
			plan.queries.length ?
				await this.places.call({
					cityId,
					search: { mode: 'typed', queries: plan.queries, perQuery: 1 },
					maxCostUsd: plan.budgetUsd,
					purpose: `google-places OSM gaps ${plan.cityName}: ${plan.queries.length} places`,
					save: { source: VenueScrapeSourceEnum.LOOKUP, newPlaces: 'food-in-city' },
				})
			:	null;
		const lookedUp = await this.saveLookups(cityId, plan.osmPlaceIds, found, now);
		return { boundary: true, synced, lookedUp };
	}

	@DurableStep({ name: 'boundary' })
	private async hasBoundary(cityId: string): Promise<boolean> {
		return !!(await this.cityService.getById(cityId)).osmRelationId;
	}

	@DurableStep({ name: PipelineStepEnum.SYNC_OSM_PLACES })
	private async sync(cityId: string) {
		return this.osmPlaceService.sync(await this.cityService.getById(cityId));
	}

	/** The last sync's places no venue is, never searched, as many as the budget covers */
	@DurableStep({ name: 'plan osm lookups' })
	private async planLookups(cityId: string): Promise<OsmLookupPlan> {
		const city = await this.cityService.getById(cityId);
		const budgetUsd = stepBudgetUsd(city, PipelineStepEnum.LOOKUP_OSM_PLACES);
		return {
			cityName: city.name,
			...(await this.osmPlaceService.planLookups(city, budgetUsd)),
			budgetUsd,
		};
	}

	/** The searched places stamped and linked again against what the run saved */
	@DurableStep({ name: PipelineStepEnum.LOOKUP_OSM_PLACES })
	private async saveLookups(
		cityId: string,
		osmPlaceIds: string[],
		found: PlacesResult | null,
		now: Date,
	) {
		return this.osmPlaceService.saveLookups(
			await this.cityService.getById(cityId),
			osmPlaceIds,
			{ found: found?.found ?? 0, saved: found?.saved ?? 0 },
			now,
		);
	}
}
