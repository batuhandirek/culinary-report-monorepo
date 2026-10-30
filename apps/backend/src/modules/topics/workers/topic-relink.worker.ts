import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import { JobWithMetadata } from 'pg-boss';

import { OnJob } from 'src/modules/pgboss/decorators/on-job.decorator.js';

import { TopicRelinkJob, TopicRelinkJobPayload } from '../jobs/topic-relink.job.js';
import { TopicRelinkService } from '../services/topic-relink.service.js';

@Injectable()
export class TopicRelinkWorker {
	constructor(
		private readonly orm: MikroORM,
		private readonly topicRelinkService: TopicRelinkService,
	) {}

	// Stately with one key: one re-link runs and one waits. Pure matching, so a retry is cheap
	@OnJob(TopicRelinkJob.jobName, { policy: 'stately', retryLimit: 2, retryDelay: 60, expireInSeconds: 30 * 60 })
	@EnsureRequestContext()
	async onTopicRelink(_job: JobWithMetadata<TopicRelinkJobPayload>) {
		await this.topicRelinkService.relinkAll();
	}
}
