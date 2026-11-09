import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable, Logger } from '@nestjs/common';

import type { WorkflowHandle } from '@dbos-inc/dbos-sdk';

import { startActorCall } from 'src/modules/apify/actors/actor.js';
import { type ActorRunRef, ApifyService } from 'src/modules/apify/services/apify.service.js';
import { DurableStep } from 'src/modules/durable-workflows/decorators/durable-step.decorator.js';
import { DurableWorkflow } from 'src/modules/durable-workflows/decorators/durable-workflow.decorator.js';
import { settleHandles } from 'src/modules/durable-workflows/util/durable-steps.js';

import {
	type FoodTrendsPullPlan,
	FoodTrendsReportService,
} from '../services/food-trends-report.service.js';

/**
 * The anchored Google Trends pull of a city's quarter as a workflow (`FoodTrendsPullWorkflow.pull`,
 * on the `food-trends-pull` queue, started by `FoodTrendsReportService.queuePull`): `plan` marks
 * the report's pull running and groups every searched kind of food with the anchor (a step), one
 * actor run per group is a child on the `apify` queue (all started, then awaited in order), and
 * `save` rescales the groups onto the anchor and stores the levels with the pull's outcome (a
 * step). A group that fails is left out, never retried (a retry would pay again); a failure before
 * the save marks the pull failed with its message, so the admin page never waits on a lost pull.
 */
@Injectable()
export class FoodTrendsPullWorkflow {
	private readonly logger = new Logger(FoodTrendsPullWorkflow.name);

	constructor(
		private readonly orm: MikroORM,
		private readonly apifyService: ApifyService,
		private readonly foodTrendsReportService: FoodTrendsReportService,
	) {}

	@DurableWorkflow()
	@EnsureRequestContext()
	async pull(cityId: string, quarter: string): Promise<void> {
		let plan: FoodTrendsPullPlan;
		try {
			plan = await this.plan(cityId, quarter);
		} catch (e) {
			await this.fail(cityId, quarter, (e as Error).message);
			throw e;
		}
		const handles: WorkflowHandle<ActorRunRef>[] = [];
		for (const call of plan.calls) handles.push(await startActorCall(this.apifyService, call));
		const settled = await settleHandles(handles);
		const note = await this.save(
			cityId,
			quarter,
			plan,
			settled.map(outcome => (outcome.ok ? outcome.value.recordId : null)),
		);
		this.logger.log(`Food trends pull ${cityId} ${quarter}: ${note}`);
	}

	/** The pull marked running; the anchor, the groups and their runs */
	@DurableStep({ name: 'plan' })
	private async plan(cityId: string, quarter: string): Promise<FoodTrendsPullPlan> {
		return this.foodTrendsReportService.startPull(cityId, quarter);
	}

	/** The groups' items read from their rows, rescaled onto the anchor and stored; the pull's note */
	@DurableStep({ name: 'save levels' })
	private async save(
		cityId: string,
		quarter: string,
		plan: FoodTrendsPullPlan,
		recordIds: (string | null)[],
	): Promise<string> {
		return this.foodTrendsReportService.savePull(cityId, quarter, plan, recordIds);
	}

	/** The pull marked failed with why, so nothing waits on it */
	@DurableStep({ name: 'fail' })
	private async fail(cityId: string, quarter: string, message: string): Promise<void> {
		await this.foodTrendsReportService.failPull(cityId, quarter, message);
	}
}
