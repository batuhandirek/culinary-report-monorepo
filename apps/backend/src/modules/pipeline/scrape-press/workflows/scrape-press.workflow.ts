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
import { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';
import { durableNow, settleHandles } from 'src/modules/durable-workflows/util/durable-steps.js';
import {
	type PressPlan,
	type PressRecords,
	WebMentionService,
} from 'src/modules/venues/services/web-mention.service.js';

import { PipelineStepEnum } from '../../constants/pipeline.constant.js';
import { FILL_COMPETITORS_MONTH } from '../../fill-competitors/constants/fill-competitors.constant.js';
import { FillCompetitorsWorkflow } from '../../fill-competitors/workflows/fill-competitors.workflow.js';
import { ReportBrandsService } from '../../shared/services/report-brands.service.js';
import { runOperation, workflowName } from '../../shared/util/operations.js';

/**
 * Each report brand's name with the city searched once on Google News and Google (the two runs
 * children on the `apify` queue, both started, then awaited; one failing keeps the other's
 * mentions, then the run fails), the pages stored for `classify-press`. The report brands are
 * final once the competitors are picked, so it calls that.
 */
@Injectable()
export class ScrapePressWorkflow {
	constructor(
		private readonly orm: MikroORM,
		private readonly durable: DurableWorkflowsService,
		private readonly apifyService: ApifyService,
		private readonly cityService: CityService,
		private readonly reportBrands: ReportBrandsService,
		private readonly webMentionService: WebMentionService,
		private readonly fillCompetitors: FillCompetitorsWorkflow,
	) {}

	@DurableWorkflow({ name: workflowName('scrape-press', 'month') })
	@EnsureRequestContext()
	async month(cityId: string, month: string) {
		await runOperation(
			this.durable,
			this.fillCompetitors.month,
			FILL_COMPETITORS_MONTH,
			cityId,
			month,
		);
		const now = await durableNow(this.durable);
		const plan = await this.planPress(cityId, month);
		const runs = [plan.news, plan.web].flatMap(call => (call ? [call] : []));
		const handles: WorkflowHandle<ActorRunRef>[] = [];
		for (const call of runs) handles.push(await startActorCall(this.apifyService, call));
		const settled = await settleHandles(handles);
		const records: PressRecords = {};
		const failed: string[] = [];
		for (const [i, call] of runs.entries()) {
			const outcome = settled[i];
			records[call === plan.news ? 'news' : 'web'] =
				outcome.ok ? outcome.value.recordId : null;
			if (!outcome.ok) failed.push(`${call.purpose}: ${outcome.error}`);
		}
		const result = await this.savePress(plan, records, now);
		if (failed.length) throw new Error(failed.join('; '));
		return result;
	}

	/** One query a report brand, on Google News and Google over the month */
	@DurableStep({ name: 'plan press' })
	private async planPress(cityId: string, month: string): Promise<PressPlan> {
		const city = await this.cityService.getById(cityId);
		const scope = await this.reportBrands.scope(city, month);
		return this.webMentionService.planMonth(
			city,
			scope.branches,
			month,
			stepBudgetUsd(city, PipelineStepEnum.SCRAPE_PRESS),
		);
	}

	/** The press candidates stored once per URL, every branch stamped */
	@DurableStep({ name: PipelineStepEnum.SCRAPE_PRESS })
	private async savePress(plan: PressPlan, records: PressRecords, now: Date) {
		return this.webMentionService.saveMonth(plan, records, now);
	}
}
