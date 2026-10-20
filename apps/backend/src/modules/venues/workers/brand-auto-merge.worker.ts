import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import { JobWithMetadata } from 'pg-boss';

import { OnJob } from 'src/modules/pgboss/decorators/on-job.decorator.js';

import { BrandAutoMergeJob, BrandAutoMergeJobPayload } from '../jobs/brand-auto-merge.job.js';
import { BrandService } from '../services/brand.service.js';

@Injectable()
export class BrandAutoMergeWorker {
	constructor(
		private readonly orm: MikroORM,
		private readonly brandService: BrandService,
	) {}

	// Stately: one merge runs and one waits per city, so a burst of scrapes merges once more at most
	@OnJob(BrandAutoMergeJob.jobName, { policy: 'stately', retryLimit: 2, retryDelay: 60 })
	@EnsureRequestContext()
	async onBrandAutoMerge(job: JobWithMetadata<BrandAutoMergeJobPayload>) {
		await this.brandService.autoMerge(job.data.cityId);
	}
}
