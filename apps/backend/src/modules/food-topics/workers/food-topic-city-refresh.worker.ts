import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import { JobWithMetadata } from 'pg-boss';

import { OnJob } from 'src/modules/pgboss/decorators/on-job.decorator.js';

import { FoodTopicCityRefreshJob, FoodTopicCityRefreshJobPayload } from '../jobs/food-topic-city-refresh.job.js';
import { FoodTopicService } from '../services/food-topic.service.js';
import { MentionFoodTopicService } from '../services/mention-food-topic.service.js';
import { VenueFoodTopicService } from '../services/venue-food-topic.service.js';

@Injectable()
export class FoodTopicCityRefreshWorker {
	constructor(
		private readonly orm: MikroORM,
		private readonly foodTopicService: FoodTopicService,
		private readonly mentionFoodTopicService: MentionFoodTopicService,
		private readonly venueFoodTopicService: VenueFoodTopicService,
	) {}

	// Stately per city: one refresh runs and one waits. Pure matching, so a retry is cheap
	@OnJob(FoodTopicCityRefreshJob.jobName, { policy: 'stately', retryLimit: 2, retryDelay: 60, expireInSeconds: 30 * 60 })
	@EnsureRequestContext()
	async onFoodTopicCityRefresh(job: JobWithMetadata<FoodTopicCityRefreshJobPayload>) {
		const index = await this.foodTopicService.index();
		// The mentions first: a venue's tags read their topics
		await this.mentionFoodTopicService.relink({ cityId: job.data.cityId, index });
		await this.venueFoodTopicService.refreshCity(job.data.cityId, index);
	}
}
