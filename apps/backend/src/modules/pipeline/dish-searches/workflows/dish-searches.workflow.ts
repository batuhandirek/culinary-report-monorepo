import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import type { WorkflowHandle } from '@dbos-inc/dbos-sdk';

import { CityService } from 'src/modules/cities/services/city.service.js';
import { stepBudgetUsd } from 'src/modules/cities/util/city.js';
import { DurableStep } from 'src/modules/durable-workflows/decorators/durable-step.decorator.js';
import { DurableWorkflow } from 'src/modules/durable-workflows/decorators/durable-workflow.decorator.js';
import { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';
import { durableNow, settleHandles } from 'src/modules/durable-workflows/util/durable-steps.js';
import { VenueTopicService } from 'src/modules/topics/services/venue-topic.service.js';
import { VenueScrapeSourceEnum } from 'src/modules/venues/constants/venue-status.constant.js';
import {
	type DishSearchRunResult,
	DishSearchService,
	type DishSweepPlan,
	type DishSweepSummary,
} from 'src/modules/venues/services/dish-search.service.js';

import { type PlacesResult, PlacesWorkflow } from '../../atoms/places/workflows/places.workflow.js';
import { PipelineStepEnum } from '../../constants/pipeline.constant.js';
import { workflowName } from '../../shared/util/operations.js';

/**
 * Today's snapshot of every searched food topic in every district of the city on Google Maps, the
 * topics most of the city's venues are tagged with first (the tags brought up to date for that
 * order). Its day is the city's local day, the run's period. Every search is a `places.run` of
 * its own (the actor outputs a place once a run, so a shared run would leave a place out of every
 * search after the first that found it), started in order and awaited in order; the `apify`
 * queue runs four at a time. A failed search leaves its ranks out of the snapshot; the save fails
 * only when none came back.
 */
@Injectable()
export class DishSearchesWorkflow {
	constructor(
		private readonly orm: MikroORM,
		private readonly durable: DurableWorkflowsService,
		private readonly cityService: CityService,
		private readonly dishSearchService: DishSearchService,
		private readonly venueTopicService: VenueTopicService,
		private readonly places: PlacesWorkflow,
	) {}

	@DurableWorkflow({ name: workflowName('dish-searches', 'day') })
	@EnsureRequestContext()
	async day(cityId: string, _day: string): Promise<DishSweepSummary> {
		await this.refreshTopics(cityId);
		const now = await durableNow(this.durable);
		const plan = await this.planSweep(cityId, now);
		const handles: WorkflowHandle<PlacesResult>[] = [];
		for (const search of plan.searches)
			handles.push(
				await this.places.start({
					cityId,
					search: { mode: 'map', query: search.query, perQuery: plan.perQuery },
					maxCostUsd: plan.capUsd,
					purpose: `google-places dish searches ${plan.cityName} ${plan.searchedOn}: ${search.query}`,
					save: { source: VenueScrapeSourceEnum.LOOKUP, newPlaces: 'food-in-city' },
				}),
			);
		const settled = await settleHandles(handles);
		const results: DishSearchRunResult[] = plan.searches.map((search, i) => {
			const outcome = settled[i];
			return outcome.ok ?
					{
						query: search.query,
						recordId: outcome.value.recordId,
						venueIds: outcome.value.venueIds,
					}
				:	{ query: search.query, failed: outcome.error };
		});
		return this.saveSweep(cityId, plan, results, now);
	}

	@DurableStep({ name: 'refresh topics' })
	private async refreshTopics(cityId: string): Promise<void> {
		await this.venueTopicService.refreshCity(cityId);
	}

	/** Every searched topic in every district, as many topics as the budget covers, dated the city's day */
	@DurableStep({ name: 'plan sweep' })
	private async planSweep(
		cityId: string,
		now: Date,
	): Promise<DishSweepPlan & { cityName: string }> {
		const city = await this.cityService.getById(cityId);
		const plan = await this.dishSearchService.planSweep(
			city,
			stepBudgetUsd(city, PipelineStepEnum.TRACK_DISH_SEARCHES),
			now,
		);
		return { ...plan, cityName: city.name };
	}

	/** Each search's top ten stored from its run's items */
	@DurableStep({ name: PipelineStepEnum.TRACK_DISH_SEARCHES })
	private async saveSweep(
		cityId: string,
		plan: DishSweepPlan,
		results: DishSearchRunResult[],
		now: Date,
	): Promise<DishSweepSummary> {
		return this.dishSearchService.saveSweep(
			await this.cityService.getById(cityId),
			plan,
			results,
			now,
		);
	}
}
