import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import { JobWithMetadata } from 'pg-boss';

import { OnJob } from 'src/modules/pgboss/decorators/on-job.decorator.js';

import { LlmBacklogJob, LlmBacklogJobPayload } from '../jobs/llm-backlog.job.js';
import { LlmBacklogService } from '../services/llm-backlog.service.js';

@Injectable()
export class LlmBacklogWorker {
	constructor(
		private readonly orm: MikroORM,
		private readonly llmBacklogService: LlmBacklogService,
	) {}

	// Stately with one singletonKey: one drain runs and one waits. Never retried: a stop is
	// recorded on the run, and tomorrow's run goes on where it ended
	@OnJob(LlmBacklogJob.jobName, {
		policy: 'stately',
		retryLimit: 0,
		localConcurrency: 1,
		expireInSeconds: 3 * 60 * 60,
	})
	@EnsureRequestContext()
	async onLlmBacklog(_job: JobWithMetadata<LlmBacklogJobPayload>) {
		await this.llmBacklogService.drain();
	}
}
