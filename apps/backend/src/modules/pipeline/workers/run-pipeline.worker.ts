import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import { JobWithMetadata } from 'pg-boss';

import { processShutdown } from 'src/modules/apify/util/apify-run-context.js';
import { OnJob } from 'src/modules/pgboss/decorators/on-job.decorator.js';

import { RunPipelineJob, RunPipelineJobPayload } from '../jobs/run-pipeline.job.js';
import { PipelineService } from '../services/pipeline.service.js';
import { PipelineRecoveryService } from '../services/pipeline-recovery.service.js';

@Injectable()
export class RunPipelineWorker {
	constructor(
		private readonly orm: MikroORM,
		private readonly pipelineService: PipelineService,
		private readonly pipelineRecoveryService: PipelineRecoveryService,
	) {}

	// One at a time, never retried (a retry would pay again), and allowed to take hours
	@OnJob(RunPipelineJob.jobName, {
		retryLimit: 0,
		localConcurrency: 1,
		expireInSeconds: 6 * 60 * 60,
	})
	@EnsureRequestContext()
	async onRunPipeline(_job: JobWithMetadata<RunPipelineJobPayload>) {
		// A run a restart cut short must be queued again first, or the next one would overtake it
		await this.pipelineRecoveryService.ready;
		// A job only wakes the worker: it works through every queued run, oldest first, so a run
		// resumed after a restart goes before the ones queued after it and never waits for a job
		// of its own. The jobs of runs already done find nothing left.
		const done = new Set<string>();
		for (let next = await this.pipelineService.nextQueuedRunId(); next && !done.has(next); next = await this.pipelineService.nextQueuedRunId()) {
			if (processShutdown.requested) return;
			done.add(next);
			await this.pipelineService.execute(next);
		}
	}
}
