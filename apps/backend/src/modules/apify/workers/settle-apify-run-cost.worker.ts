import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import { JobWithMetadata } from 'pg-boss';

import { OnJob } from 'src/modules/pgboss/decorators/on-job.decorator.js';

import {
	SettleApifyRunCostJob,
	SettleApifyRunCostJobPayload,
} from '../jobs/settle-apify-run-cost.job.js';
import { ApifyService } from '../services/apify.service.js';

@Injectable()
export class SettleApifyRunCostWorker {
	constructor(
		private readonly orm: MikroORM,
		private readonly apifyService: ApifyService,
	) {}

	// Reading a run costs nothing, so a failed read may be retried
	@OnJob(SettleApifyRunCostJob.jobName, { retryLimit: 3, retryDelay: 60 })
	@EnsureRequestContext()
	async onSettleCost(job: JobWithMetadata<SettleApifyRunCostJobPayload>) {
		await this.apifyService.settleCost(job.data.apifyRunId);
	}
}
