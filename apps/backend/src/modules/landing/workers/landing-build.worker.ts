import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import { JobWithMetadata } from 'pg-boss';

import { OnJob } from 'src/modules/pgboss/decorators/on-job.decorator.js';

import { LandingBuildJob, LandingBuildJobPayload } from '../jobs/landing-build.job.js';
import { LandingEditionService } from '../services/landing-edition.service.js';

@Injectable()
export class LandingBuildWorker {
	constructor(
		private readonly orm: MikroORM,
		private readonly landingEditionService: LandingEditionService,
	) {}

	// Stately: one build runs and one waits per city. Retried once: a build reads stored data
	// and makes one model call, so a retry costs little (the cron would otherwise try tomorrow)
	@OnJob(LandingBuildJob.jobName, {
		policy: 'stately',
		retryLimit: 1,
		retryDelay: 300,
		expireInSeconds: 30 * 60,
	})
	@EnsureRequestContext()
	async onLandingBuild(job: JobWithMetadata<LandingBuildJobPayload>) {
		await this.landingEditionService.build(job.data.cityId);
	}
}
