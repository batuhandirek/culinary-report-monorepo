import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import { JobWithMetadata } from 'pg-boss';

import { OnJob } from 'src/modules/pgboss/decorators/on-job.decorator.js';

import { AspectDiscoveryJob, AspectDiscoveryJobPayload } from '../jobs/aspect-discovery.job.js';
import { AspectDiscoveryService } from '../services/aspect-discovery.service.js';

@Injectable()
export class AspectDiscoveryWorker {
	constructor(
		private readonly orm: MikroORM,
		private readonly aspectDiscoveryService: AspectDiscoveryService,
	) {}

	// One at a time, never retried; agent B's re-read of a city's claims takes a while
	@OnJob(AspectDiscoveryJob.jobName, {
		policy: 'stately',
		retryLimit: 0,
		expireInSeconds: 4 * 3600,
	})
	@EnsureRequestContext()
	async onAspectDiscovery(job: JobWithMetadata<AspectDiscoveryJobPayload>) {
		await this.aspectDiscoveryService.runAll({
			dryRun: job.data.dryRun,
			cronOnly: job.data.cronOnly ?? false,
		});
	}
}
