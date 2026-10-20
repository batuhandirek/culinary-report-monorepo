import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import { JobWithMetadata } from 'pg-boss';

import { OnJob } from 'src/modules/pgboss/decorators/on-job.decorator.js';

import { BrandSearchJob, BrandSearchJobPayload } from '../jobs/brand-search.job.js';
import { BrandService } from '../services/brand.service.js';

@Injectable()
export class BrandSearchWorker {
	constructor(
		private readonly orm: MikroORM,
		private readonly brandService: BrandService,
	) {}

	// Never retried: a retry would pay for the search again
	@OnJob(BrandSearchJob.jobName, { retryLimit: 0 })
	@EnsureRequestContext()
	async onBrandSearch(job: JobWithMetadata<BrandSearchJobPayload>) {
		await this.brandService.searchBranches(job.data.brandId, job.data.cityId);
	}
}
