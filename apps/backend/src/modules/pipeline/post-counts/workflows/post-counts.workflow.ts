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
	type PostCountsPlan,
	type PostCountsRecords,
	PostCountsService,
} from 'src/modules/social/services/post-counts.service.js';

import { PipelineStepEnum } from '../../constants/pipeline.constant.js';
import { workflowName } from '../../shared/util/operations.js';

/**
 * Every post that turned seven days old without a read at that age, read again and kept
 * (`PostCountsService`): every reader compares posts at seven days. TikTok's and Instagram's
 * runs are children on the `apify` queue, both started, then awaited; one failing keeps the
 * other's reads, then the run fails.
 */
@Injectable()
export class PostCountsWorkflow {
	constructor(
		private readonly orm: MikroORM,
		private readonly durable: DurableWorkflowsService,
		private readonly apifyService: ApifyService,
		private readonly cityService: CityService,
		private readonly postCountsService: PostCountsService,
	) {}

	@DurableWorkflow({ name: workflowName('post-counts', 'day') })
	@EnsureRequestContext()
	async day(cityId: string, _period: string) {
		const now = await durableNow(this.durable);
		const plan = await this.plan(cityId, now);
		const runs = [plan.tiktok, plan.instagram].flatMap(run => (run ? [run] : []));
		const handles: WorkflowHandle<ActorRunRef>[] = [];
		for (const run of runs) handles.push(await startActorCall(this.apifyService, run.call));
		const settled = await settleHandles(handles);
		const records: PostCountsRecords = {};
		const failed: string[] = [];
		for (const [i, run] of runs.entries()) {
			const outcome = settled[i];
			const key = run === plan.tiktok ? 'tiktok' : 'instagram';
			records[key] = outcome.ok ? outcome.value.recordId : null;
			if (!outcome.ok) failed.push(`${run.call.purpose}: ${outcome.error}`);
		}
		const result = await this.save(plan, records, now);
		if (failed.length) throw new Error(`${failed.join('; ')}`);
		return result;
	}

	/** The city's TikTok and Instagram posts 7 to 14 days old and not final, oldest first as the budget covers, one run a platform */
	@DurableStep({ name: 'plan' })
	private async plan(cityId: string, now: Date): Promise<PostCountsPlan> {
		const city = await this.cityService.getById(cityId);
		return this.postCountsService.plan(
			city,
			stepBudgetUsd(city, PipelineStepEnum.REFRESH_POST_COUNTS),
			now,
		);
	}

	/** Each read kept as the post's count at seven days; a deleted post closed as last read */
	@DurableStep({ name: PipelineStepEnum.REFRESH_POST_COUNTS })
	private async save(plan: PostCountsPlan, records: PostCountsRecords, now: Date) {
		return this.postCountsService.save(plan, records, now);
	}
}
