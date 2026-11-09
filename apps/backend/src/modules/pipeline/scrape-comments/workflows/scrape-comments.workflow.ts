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
import { settleHandles } from 'src/modules/durable-workflows/util/durable-steps.js';
import { PostCommentService } from 'src/modules/social/services/post-comment.service.js';
import {
	type CommentsPlan,
	SocialScrapeService,
} from 'src/modules/social/services/social-scrape.service.js';

import { PipelineStepEnum } from '../../constants/pipeline.constant.js';
import { FILL_COMPETITORS_MONTH } from '../../fill-competitors/constants/fill-competitors.constant.js';
import { FillCompetitorsWorkflow } from '../../fill-competitors/workflows/fill-competitors.workflow.js';
import { ReportBrandsService } from '../../shared/services/report-brands.service.js';
import { runOperation, workflowName } from '../../shared/util/operations.js';

/**
 * The comments under each report brand's five most viewed TikTok posts of the month by others, 100
 * top-level ones a post at most (most liked first): the report reads their intents and repeated
 * questions. One actor run per post, every run a child on the `apify` queue (started first, then
 * awaited in order; a failed run leaves its post unscraped for next time), then one save step.
 * The report brands are final once the competitors are picked, so it calls that.
 */
@Injectable()
export class ScrapeCommentsWorkflow {
	constructor(
		private readonly orm: MikroORM,
		private readonly durable: DurableWorkflowsService,
		private readonly apifyService: ApifyService,
		private readonly cityService: CityService,
		private readonly reportBrands: ReportBrandsService,
		private readonly postCommentService: PostCommentService,
		private readonly socialScrapeService: SocialScrapeService,
		private readonly fillCompetitors: FillCompetitorsWorkflow,
	) {}

	@DurableWorkflow({ name: workflowName('scrape-comments', 'month') })
	@EnsureRequestContext()
	async month(cityId: string, month: string) {
		await runOperation(
			this.durable,
			this.fillCompetitors.month,
			FILL_COMPETITORS_MONTH,
			cityId,
			month,
		);
		const plan = await this.planComments(cityId, month);
		const handles: WorkflowHandle<ActorRunRef>[] = [];
		for (const call of plan.calls)
			handles.push(
				await startActorCall(this.apifyService, call, { memoryMbytes: plan.memoryMbytes }),
			);
		const settled = await settleHandles(handles);
		return this.saveComments(
			plan,
			settled.map(outcome => (outcome.ok ? outcome.value.recordId : null)),
		);
	}

	/** Each report brand's five most viewed posts with comments not scraped yet, one run each on its share of the budget */
	@DurableStep({ name: 'plan comments' })
	private async planComments(cityId: string, month: string): Promise<CommentsPlan> {
		const city = await this.cityService.getById(cityId);
		const brands = await this.reportBrands.of(city, month);
		const posts = await this.postCommentService.topPosts(
			brands.map(b => b.brand),
			city.id,
			month,
			5,
		);
		return this.socialScrapeService.planComments(
			posts,
			100,
			stepBudgetUsd(city, PipelineStepEnum.SCRAPE_COMMENTS),
		);
	}

	/** Every run's comments stored under its post; a failed run's post stays unscraped */
	@DurableStep({ name: PipelineStepEnum.SCRAPE_COMMENTS })
	private async saveComments(plan: CommentsPlan, recordIds: (string | null)[]) {
		return this.socialScrapeService.saveComments(plan, recordIds);
	}
}
