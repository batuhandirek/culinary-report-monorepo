import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { ApifyService } from 'src/modules/apify/services/apify.service.js';
import { apifyRunContext, processShutdown } from 'src/modules/apify/util/apify-run-context.js';
import { CityService } from 'src/modules/cities/services/city.service.js';
import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { ProspectQueryService } from 'src/modules/outreach/services/prospect-query.service.js';
import { PgBossService } from 'src/modules/pgboss/pgboss.service.js';
import { MentionMatchingService } from 'src/modules/social/services/mention-matching.service.js';
import { SearchInterestService } from 'src/modules/trends/services/search-interest.service.js';
import { BrandLeadScoreService } from 'src/modules/venues/services/brand-lead-score.service.js';
import { BrandService } from 'src/modules/venues/services/brand.service.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { MONTHLY_STEPS, PipelineStepEnum } from '../constants/pipeline.constant.js';
import { PipelineRun, PipelineRunStatusEnum } from '../entities/pipeline-run.entity.js';
import { RunPipelineJob } from '../jobs/run-pipeline.job.js';
import { PipelineService } from '../services/pipeline.service.js';
import { MAX_PIPELINE_RESUMES, PipelineRecoveryService } from '../services/pipeline-recovery.service.js';

describe('Pipeline runs after a backend restart (pglite)', () => {
	let harness: PgliteTestingModule;
	let service: PipelineService;
	let recovery: PipelineRecoveryService;
	const sendJob = jest.fn(async (..._args: unknown[]) => undefined);
	const settleOrphans = jest.fn(async (..._args: unknown[]) => 0);
	const contexts: unknown[] = [];
	const pull = jest.fn(async (..._args: unknown[]) => {
		contexts.push(apifyRunContext.getStore());
		return { terms: 1 };
	});
	const scoreAll = jest.fn(async (..._args: unknown[]) => ({ scored: 3 }));

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				BrandService,
				CityService,
				PipelineService,
				PipelineRecoveryService,
				ProspectQueryService,
				{ provide: PgBossService, useValue: { sendJob } },
				{ provide: ApifyService, useValue: { settleOrphans } },
				{ provide: SearchInterestService, useValue: { pull } },
				{ provide: BrandLeadScoreService, useValue: { scoreAll } },
				{ provide: MentionMatchingService, useValue: { topBrandIds: async () => [] } },
			],
		});
		service = harness.moduleRef.get(PipelineService);
		recovery = harness.moduleRef.get(PipelineRecoveryService);
		entityManagerManager.setEntityManager(harness.orm.em);
	});

	afterAll(async () => {
		await harness.stop();
	});

	beforeEach(async () => {
		jest.clearAllMocks();
		contexts.length = 0;
		await harness.orm.em.fork().nativeDelete(PipelineRun, {});
	});

	const createRun = async (fields: Partial<PipelineRun>) => {
		const em = harness.orm.em.fork();
		const run = em.create(PipelineRun, {
			city: testCity(em),
			step: PipelineStepEnum.SEARCH_INTEREST,
			month: '2026-09',
			params: {},
			status: PipelineRunStatusEnum.RUNNING,
			...fields,
		});
		await em.flush();
		return run;
	};
	const reload = (id: string) => harness.orm.em.fork().findOneOrFail(PipelineRun, id);

	it('queues a run the restart left RUNNING again, and it goes on to the end', async () => {
		const startedAt = new Date('2026-10-18T10:00:00Z');
		const run = await createRun({ startedAt });

		expect(await recovery.recover()).toEqual({ resumed: 1, failed: 0, apifySettled: 0 });

		const queued = await reload(run.id);
		expect(queued.status).toBe(PipelineRunStatusEnum.QUEUED);
		expect(queued.resumes).toBe(1);
		expect(sendJob).toHaveBeenCalledWith(RunPipelineJob.jobName, new RunPipelineJob({ pipelineRunId: run.id }));
		// Apify runs of the resumed run are left for its step to re-attach to
		expect(settleOrphans).toHaveBeenCalledWith([run.id]);

		await service.execute(run.id);
		const done = await reload(run.id);
		expect(done.status).toBe(PipelineRunStatusEnum.SUCCEEDED);
		expect(done.startedAt?.toISOString()).toBe(startedAt.toISOString());
		expect(done.result).toEqual({ '1. SEARCH_INTEREST': { terms: 1 } });
		// The step ran inside its context, so its Apify runs can be found again
		expect(contexts).toEqual([{ pipelineRunId: run.id, stepKey: '1. SEARCH_INTEREST' }]);
	});

	it('skips the steps a resumed monthly run had finished', async () => {
		const last = MONTHLY_STEPS.length;
		const finished = Object.fromEntries(
			MONTHLY_STEPS.slice(0, last - 1).map((step, i) => [`${i + 1}. ${step}`, { done: true }]),
		);
		const run = await createRun({ step: PipelineStepEnum.MONTHLY, status: PipelineRunStatusEnum.QUEUED, result: finished });

		await service.execute(run.id);

		expect(pull).not.toHaveBeenCalled();
		expect(scoreAll).toHaveBeenCalledTimes(1);
		const done = await reload(run.id);
		expect(done.status).toBe(PipelineRunStatusEnum.SUCCEEDED);
		expect(done.result?.[`${last}. SCORE_LEADS`]).toEqual({ scored: 3 });
		expect(Object.keys(done.result ?? {})).toHaveLength(last);
	});

	it('fails a run that restarts kept cutting short, and settles its Apify runs', async () => {
		const run = await createRun({ resumes: MAX_PIPELINE_RESUMES });
		const fine = await createRun({ status: PipelineRunStatusEnum.SUCCEEDED });
		const waiting = await createRun({ status: PipelineRunStatusEnum.QUEUED });

		expect(await recovery.recover()).toEqual({ resumed: 0, failed: 1, apifySettled: 0 });

		const failed = await reload(run.id);
		expect(failed.status).toBe(PipelineRunStatusEnum.FAILED);
		expect(failed.error).toContain('backend restart');
		// A run queued again by an earlier boot keeps its Apify runs to re-attach to
		expect(settleOrphans).toHaveBeenCalledWith([waiting.id]);
		// …and gets one wake-up job, as nothing else was resumed
		expect(sendJob).toHaveBeenCalledTimes(1);
		expect((await reload(fine.id)).status).toBe(PipelineRunStatusEnum.SUCCEEDED);
	});

	it('works on the oldest queued run first, so a resumed run goes before the ones queued after it', async () => {
		const later = await createRun({ status: PipelineRunStatusEnum.QUEUED, createdAt: new Date('2026-10-18T12:00:00Z') });
		const resumed = await createRun({ status: PipelineRunStatusEnum.RUNNING, createdAt: new Date('2026-10-18T10:00:00Z') });
		await recovery.recover();

		expect(await service.nextQueuedRunId()).toBe(resumed.id);
		await service.execute(resumed.id);
		expect(await service.nextQueuedRunId()).toBe(later.id);
	});

	it('leaves a run RUNNING for the next process when a shutdown stops it', async () => {
		const run = await createRun({ status: PipelineRunStatusEnum.QUEUED });
		pull.mockImplementationOnce(async () => {
			processShutdown.requested = true;
			throw new Error('connection closed');
		});
		try {
			await service.execute(run.id);
		} finally {
			processShutdown.requested = false;
		}
		const stopped = await reload(run.id);
		expect(stopped.status).toBe(PipelineRunStatusEnum.RUNNING);
		expect(stopped.error ?? null).toBeNull();
	});

	it('never queues again a run this process is already working on', async () => {
		const run = await createRun({ status: PipelineRunStatusEnum.RUNNING });
		service.executing.add(run.id);
		try {
			expect(await recovery.recover()).toEqual({ resumed: 0, failed: 0, apifySettled: 0 });
		} finally {
			service.executing.delete(run.id);
		}
		expect((await reload(run.id)).status).toBe(PipelineRunStatusEnum.RUNNING);
	});

	it('finishing a month skips the paid steps that already succeeded and runs the free ones', async () => {
		const em = harness.orm.em.fork();
		const city = testCity(em);
		await em.flush();
		const done = em.create(PipelineRun, {
			city,
			step: PipelineStepEnum.SEARCH_INTEREST,
			month: '2026-09',
			status: PipelineRunStatusEnum.SUCCEEDED,
			result: { '1. SEARCH_INTEREST': { terms: 9 } },
		});
		const last = MONTHLY_STEPS.length;
		// Everything up to SEARCH_INTEREST finished by an earlier attempt of this run
		const finished = Object.fromEntries(
			MONTHLY_STEPS.slice(0, last - 3).map((step, i) => [`${i + 1}. ${step}`, { done: true }]),
		);
		const run = em.create(PipelineRun, {
			city,
			step: PipelineStepEnum.MONTHLY,
			month: '2026-09',
			params: { onlyMissing: true },
			status: PipelineRunStatusEnum.QUEUED,
			result: finished,
			createdAt: new Date(Date.now() + 1000),
		});
		await em.flush();
		expect(done.id).toBeTruthy();

		await service.execute(run.id);

		const after = await reload(run.id);
		expect(pull).not.toHaveBeenCalled();
		expect(after.result?.[`${last - 2}. SEARCH_INTEREST`]).toEqual({ skipped: 'already ran this month' });
		// BUILD_REPORTS is free, so it runs (nothing to build here)
		expect(after.result?.[`${last - 1}. BUILD_REPORTS`]).toEqual({ built: 0, acrossCities: 0, waiting: 0 });
		expect(scoreAll).toHaveBeenCalledTimes(1);
		expect(after.status).toBe(PipelineRunStatusEnum.SUCCEEDED);
	});

	it('does not record a step that ended during a shutdown (it may have swallowed a refused run)', async () => {
		const run = await createRun({ status: PipelineRunStatusEnum.QUEUED });
		pull.mockImplementationOnce(async () => {
			processShutdown.requested = true;
			return { terms: 0 };
		});
		try {
			await service.execute(run.id);
		} finally {
			processShutdown.requested = false;
		}
		const stopped = await reload(run.id);
		expect(stopped.status).toBe(PipelineRunStatusEnum.RUNNING);
		expect(stopped.result).toEqual({});
	});

	it('lets the worker start once the boot recovery is done', async () => {
		await recovery.onApplicationBootstrap();
		await expect(recovery.ready).resolves.toBeUndefined();
	});
});
