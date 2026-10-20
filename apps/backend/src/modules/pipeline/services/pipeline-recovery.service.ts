import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';

import { ApifyService } from 'src/modules/apify/services/apify.service.js';
import { watchProcessShutdown } from 'src/modules/apify/util/apify-run-context.js';

import { PipelineRun, PipelineRunStatusEnum } from '../entities/pipeline-run.entity.js';

import { PipelineService } from './pipeline.service.js';

/** How often one run is resumed after restarts before it is failed (a crash loop stops here). */
export const MAX_PIPELINE_RESUMES = 5;

/**
 * Picks up what a backend restart (deploy, crash, dev watcher) cut short. One instance runs
 * pipeline jobs (`localConcurrency: 1`), so at boot a run still RUNNING belongs to no live process.
 */
@Injectable()
export class PipelineRecoveryService implements OnApplicationBootstrap {
	private readonly logger = new Logger(PipelineRecoveryService.name);
	private markReady!: () => void;
	/**
	 * Settles once the boot recovery is done. `RunPipelineWorker` waits for it: pg-boss may hand
	 * the worker a job before this hook ran, and the worker would then take the next queued run
	 * while the interrupted one, still marked RUNNING, waits to be queued again.
	 */
	readonly ready = new Promise<void>(resolve => (this.markReady = resolve));

	constructor(
		private readonly em: EntityManager,
		private readonly pipelineService: PipelineService,
		private readonly apifyService: ApifyService,
	) {}

	async onApplicationBootstrap(): Promise<void> {
		if (process.env.NODE_ENV === 'test') return this.markReady();
		watchProcessShutdown();
		try {
			const { resumed, failed, apifySettled } = await this.recover();
			if (resumed + failed + apifySettled > 0) {
				this.logger.warn(
					`After a restart: ${resumed} pipeline run(s) resumed, ${failed} failed, ${apifySettled} Apify run(s) settled`,
				);
			}
		} catch (e) {
			this.logger.error(`Pipeline recovery failed: ${(e as Error).message}`);
		} finally {
			this.markReady();
		}
	}

	/**
	 * Queues every RUNNING run again to go on after its last finished step (re-attaching to the
	 * Apify runs its step had started), unless it was resumed `MAX_PIPELINE_RESUMES` times already:
	 * that one fails. Apify runs no resumed step will re-attach to get their final status and cost.
	 */
	async recover(): Promise<{ resumed: number; failed: number; apifySettled: number }> {
		const em = this.em.fork();
		// Not the ones this process already picked up: its worker may start before this runs
		const running = (await em.find(PipelineRun, { status: PipelineRunStatusEnum.RUNNING })).filter(
			r => !this.pipelineService.executing.has(r.id),
		);
		const [toResume, toFail] = [
			running.filter(r => r.resumes < MAX_PIPELINE_RESUMES),
			running.filter(r => r.resumes >= MAX_PIPELINE_RESUMES),
		];
		for (const run of toFail) {
			run.status = PipelineRunStatusEnum.FAILED;
			run.error = `Cut short by a backend restart ${run.resumes + 1} times; rerun it from the admin`;
			run.finishedAt = new Date();
		}
		await em.flush();
		// Apify runs of every run still to go on (resumed now, or queued again by an earlier boot and
		// not picked up yet) are left for their step to re-attach to
		const live = await em.find(PipelineRun, {
			status: { $in: [PipelineRunStatusEnum.QUEUED, PipelineRunStatusEnum.RUNNING] },
		});
		const apifySettled = await this.apifyService.settleOrphans(live.map(r => r.id));
		for (const run of toResume) await this.pipelineService.resume(run.id);
		// Runs queued before the restart whose job is gone: one job wakes the worker for all
		const waiting = await em.fork().find(PipelineRun, { status: PipelineRunStatusEnum.QUEUED }, { limit: 1 });
		if (!toResume.length && waiting.length) await this.pipelineService.wake(waiting[0].id);
		return { resumed: toResume.length, failed: toFail.length, apifySettled };
	}
}
