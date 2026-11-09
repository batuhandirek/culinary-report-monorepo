import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import { DurableSchedule } from 'src/modules/durable-workflows/decorators/durable-schedule.decorator.js';

import { LLM_BACKLOG_CRON } from '../constants/backlog.constant.js';
import { LlmBacklogService } from '../services/llm-backlog.service.js';

@Injectable()
export class LlmBacklogSchedule {
	constructor(
		private readonly orm: MikroORM,
		private readonly llmBacklogService: LlmBacklogService,
	) {}

	// Daily at the end of the allowance's day (`LLM_BACKLOG_CRON`); the work runs as the
	// `LlmBacklogWorkflows.drain` workflow, so "Run now" and the cron share one queue and never overlap
	@DurableSchedule('llm-backlog', LLM_BACKLOG_CRON)
	@EnsureRequestContext()
	async daily(): Promise<void> {
		await this.llmBacklogService.queue('cron');
	}
}
