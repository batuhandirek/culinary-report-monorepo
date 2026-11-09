import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import type { WorkflowHandle } from '@dbos-inc/dbos-sdk';

import { startActorCall } from 'src/modules/apify/actors/actor.js';
import { type ActorRunRef, ApifyService } from 'src/modules/apify/services/apify.service.js';
import { CityService } from 'src/modules/cities/services/city.service.js';
import { stepBudgetUsd } from 'src/modules/cities/util/city.js';
import { DurableStep } from 'src/modules/durable-workflows/decorators/durable-step.decorator.js';
import { DurableWorkflow } from 'src/modules/durable-workflows/decorators/durable-workflow.decorator.js';
import { settleHandles } from 'src/modules/durable-workflows/util/durable-steps.js';
import {
	type SearchInterestPlan,
	type SearchInterestRecords,
	SearchInterestService,
} from 'src/modules/trends/services/search-interest.service.js';

import { PipelineStepEnum } from '../../constants/pipeline.constant.js';
import { ReportBrandsService } from '../../shared/services/report-brands.service.js';
import { workflowName } from '../../shared/util/operations.js';

/**
 * Google search interest of the month for every food topic with a Trends id and the names of the
 * won prospects with a branch in the city (the reports' city section quotes the changes): two
 * actor runs, children on the `apify` queue, both started, then awaited; one failing keeps the
 * other's terms, then the run fails.
 */
@Injectable()
export class SearchInterestWorkflow {
	constructor(
		private readonly orm: MikroORM,
		private readonly apifyService: ApifyService,
		private readonly cityService: CityService,
		private readonly reportBrands: ReportBrandsService,
		private readonly searchInterestService: SearchInterestService,
	) {}

	@DurableWorkflow({ name: workflowName('search-interest', 'month') })
	@EnsureRequestContext()
	async month(cityId: string, month: string) {
		const plan = await this.plan(cityId, month);
		const runs = [plan.topics, plan.brands].flatMap(run => (run ? [run] : []));
		const handles: WorkflowHandle<ActorRunRef>[] = [];
		for (const run of runs) handles.push(await startActorCall(this.apifyService, run.call));
		const settled = await settleHandles(handles);
		const records: SearchInterestRecords = {};
		const failed: string[] = [];
		for (const [i, run] of runs.entries()) {
			const outcome = settled[i];
			records[run === plan.topics ? 'topics' : 'brands'] =
				outcome.ok ? outcome.value.recordId : null;
			if (!outcome.ok) failed.push(`${run.call.purpose}: ${outcome.error}`);
		}
		const result = await this.save(cityId, plan, records);
		if (failed.length) throw new Error(failed.join('; '));
		return result;
	}

	/** The topics' run in Food & Drink and the won brands' in all categories, the budget split by terms */
	@DurableStep({ name: 'plan' })
	private async plan(cityId: string, month: string): Promise<SearchInterestPlan> {
		const city = await this.cityService.getById(cityId);
		return this.searchInterestService.plan(city.id, month, {
			brands: await this.reportBrands.wonBrandsIn(city),
			budgetUsd: stepBudgetUsd(city, PipelineStepEnum.SEARCH_INTEREST),
		});
	}

	/** Each term's months and related queries stored from its run's items */
	@DurableStep({ name: PipelineStepEnum.SEARCH_INTEREST })
	private async save(cityId: string, plan: SearchInterestPlan, records: SearchInterestRecords) {
		return this.searchInterestService.save(cityId, plan, records);
	}
}
