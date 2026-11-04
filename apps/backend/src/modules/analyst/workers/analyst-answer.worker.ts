import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import { JobWithMetadata } from 'pg-boss';

import { OnJob } from 'src/modules/pgboss/decorators/on-job.decorator.js';

import { AnalystAnswerJob, AnalystAnswerJobPayload } from '../jobs/analyst-answer.job.js';
import { AnalystAnswerService } from '../services/analyst-answer.service.js';

@Injectable()
export class AnalystAnswerWorker {
	constructor(
		private readonly orm: MikroORM,
		private readonly answerService: AnalystAnswerService,
	) {}

	// A few answers side by side (several admins); never retried, see the job
	@OnJob(AnalystAnswerJob.jobName, {
		retryLimit: 0,
		expireInSeconds: 15 * 60,
		localConcurrency: 3,
	})
	@EnsureRequestContext()
	async onAnalystAnswer(job: JobWithMetadata<AnalystAnswerJobPayload>) {
		await this.answerService.answer(job.data.messageId);
	}
}
