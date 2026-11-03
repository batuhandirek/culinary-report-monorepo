import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import { JobWithMetadata } from 'pg-boss';

import { OnJob } from 'src/modules/pgboss/decorators/on-job.decorator.js';

import {
	TopicsClaudePassJob,
	TopicsClaudePassJobPayload,
} from '../jobs/topics-claude-pass.job.js';
import { TopicsClaudePassService } from '../services/topics-claude-pass.service.js';

@Injectable()
export class TopicsClaudePassWorker {
	constructor(
		private readonly orm: MikroORM,
		private readonly topicsClaudePassService: TopicsClaudePassService,
	) {}

	// One at a time, never retried (it pays per call); a pass of every pending wording takes hours
	@OnJob(TopicsClaudePassJob.jobName, {
		policy: 'stately',
		retryLimit: 0,
		expireInSeconds: 8 * 3600,
	})
	@EnsureRequestContext()
	async onTopicsClaudePass(job: JobWithMetadata<TopicsClaudePassJobPayload>) {
		await this.topicsClaudePassService.run(job.data.budgetUsd);
	}
}
