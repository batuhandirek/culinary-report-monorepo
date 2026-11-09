import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import { DurableWorkflow } from 'src/modules/durable-workflows/decorators/durable-workflow.decorator.js';
import { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';

import type { BacklogStopReason } from '../entities/backlog-run.entity.js';
import { LlmBacklogService, type LlmBacklogTrigger } from '../services/llm-backlog.service.js';

/** What the day's drain did, per backlog: the workflow's result */
export interface LlmBacklogDrainResult {
	trigger: LlmBacklogTrigger;
	day: string;
	backlogs: {
		key: string;
		batches: number;
		done: number;
		tokens: number | null;
		stopReason: BacklogStopReason | null;
		remaining: number | null;
	}[];
}

/**
 * The daily LLM backlog drain as a durable workflow (`LlmBacklogService.drain` with each batch a
 * step): a restart resumes after the last finished batch instead of ending the day with
 * `shutdown`. Queued on `LLM_BACKLOG_QUEUE` by `LlmBacklogService.queue` (the cron, or "Run now").
 */
@Injectable()
export class LlmBacklogWorkflows {
	constructor(
		private readonly orm: MikroORM,
		private readonly durable: DurableWorkflowsService,
		private readonly llmBacklogService: LlmBacklogService,
	) {}

	@DurableWorkflow()
	@EnsureRequestContext()
	async drain(trigger: LlmBacklogTrigger): Promise<LlmBacklogDrainResult> {
		const runs = await this.llmBacklogService.drain({
			step: (name, fn) => this.durable.step(name, fn),
		});
		return {
			trigger,
			day: runs[0]?.day ?? '',
			backlogs: runs.map(run => ({
				key: run.key,
				batches: run.batches,
				done: run.done,
				tokens: run.tokens ?? null,
				stopReason: run.stopReason ?? null,
				remaining: run.remaining ?? null,
			})),
		};
	}
}
