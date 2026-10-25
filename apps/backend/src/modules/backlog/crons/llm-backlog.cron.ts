import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import { OnCron } from 'src/modules/pgboss/decorators/on-cron.decorator.js';

import { LLM_BACKLOG_CRON } from '../constants/backlog.constant.js';
import { LlmBacklogService } from '../services/llm-backlog.service.js';

@Injectable()
export class LlmBacklogCron {
	constructor(
		private readonly orm: MikroORM,
		private readonly llmBacklogService: LlmBacklogService,
	) {}

	// Daily at the end of the allowance's day (`LLM_BACKLOG_CRON`); the work runs as the
	// `llm-backlog` job, so "Run now" and the cron share one queue and never overlap
	@OnCron('llm-backlog', LLM_BACKLOG_CRON)
	@EnsureRequestContext()
	async handleCron() {
		await this.llmBacklogService.queue('cron');
	}
}
