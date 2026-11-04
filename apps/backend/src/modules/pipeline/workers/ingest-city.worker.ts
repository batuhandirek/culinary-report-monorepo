import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import { JobWithMetadata } from 'pg-boss';

import { OnJob } from 'src/modules/pgboss/decorators/on-job.decorator.js';

import { IngestCityJob, IngestCityJobPayload } from '../jobs/ingest-city.job.js';
import { IngestionService } from '../services/ingestion.service.js';
import { PipelineService } from '../services/pipeline.service.js';

@Injectable()
export class IngestCityWorker {
	constructor(
		private readonly orm: MikroORM,
		private readonly ingestionService: IngestionService,
		private readonly pipelineService: PipelineService,
	) {}

	// Never retried: the next pass (a scrape's, or the hourly cron's) goes on where this one
	// stopped. A pass reads a thousand reviews at most, so hours are room enough
	@OnJob(IngestCityJob.jobName, {
		policy: 'stately',
		retryLimit: 0,
		localConcurrency: 1,
		expireInSeconds: 3 * 60 * 60,
	})
	@EnsureRequestContext()
	async onIngestCity(job: JobWithMetadata<IngestCityJobPayload>) {
		const pass = await this.ingestionService.ingestCity(job.data.cityId);
		// A run waiting for the reading checks again; one still short of it waits on
		if (!pass.blocked) await this.pipelineService.wakeWaiting(job.data.cityId);
	}
}
