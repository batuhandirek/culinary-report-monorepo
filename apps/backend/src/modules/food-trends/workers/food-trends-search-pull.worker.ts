import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import { JobWithMetadata } from 'pg-boss';

import { OnJob } from 'src/modules/pgboss/decorators/on-job.decorator.js';

import {
	FoodTrendsSearchPullJob,
	FoodTrendsSearchPullJobPayload,
} from '../jobs/food-trends-search-pull.job.js';
import { FoodTrendsReportService } from '../services/food-trends-report.service.js';

@Injectable()
export class FoodTrendsSearchPullWorker {
	constructor(
		private readonly orm: MikroORM,
		private readonly foodTrendsReportService: FoodTrendsReportService,
	) {}

	// Never retried: a retry would pay for the pull again
	@OnJob(FoodTrendsSearchPullJob.jobName, { retryLimit: 0 })
	@EnsureRequestContext()
	async onFoodTrendsSearchPull(job: JobWithMetadata<FoodTrendsSearchPullJobPayload>) {
		await this.foodTrendsReportService.pullSearches(job.data.cityId, job.data.quarter);
	}
}
