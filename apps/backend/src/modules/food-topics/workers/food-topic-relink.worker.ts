import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import { JobWithMetadata } from 'pg-boss';

import { OnJob } from 'src/modules/pgboss/decorators/on-job.decorator.js';

import { FoodTopicRelinkJob, FoodTopicRelinkJobPayload } from '../jobs/food-topic-relink.job.js';
import { FoodTopicRelinkService } from '../services/food-topic-relink.service.js';

@Injectable()
export class FoodTopicRelinkWorker {
	constructor(
		private readonly orm: MikroORM,
		private readonly foodTopicRelinkService: FoodTopicRelinkService,
	) {}

	// Stately with one key: one re-link runs and one waits. Pure matching, so a retry is cheap
	@OnJob(FoodTopicRelinkJob.jobName, { policy: 'stately', retryLimit: 2, retryDelay: 60, expireInSeconds: 30 * 60 })
	@EnsureRequestContext()
	async onFoodTopicRelink(_job: JobWithMetadata<FoodTopicRelinkJobPayload>) {
		await this.foodTopicRelinkService.relinkAll();
	}
}
