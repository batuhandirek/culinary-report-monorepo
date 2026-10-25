import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { PgBossService } from 'src/modules/pgboss/pgboss.service.js';
import { PipelineStepEnum } from 'src/modules/pipeline/constants/pipeline.constant.js';
import { PipelineRun, PipelineRunStatusEnum } from 'src/modules/pipeline/entities/pipeline-run.entity.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { ApifyRun, ApifyRunStatusEnum } from '../entities/apify-run.entity.js';
import { SettleApifyRunCostJob } from '../jobs/settle-apify-run-cost.job.js';
import {
	ApifyService,
	COST_SETTLE_DELAY_SECONDS,
	hashActorInput,
} from '../services/apify.service.js';
import { apifyRunContext, processShutdown, ShuttingDownError } from '../util/apify-run-context.js';
import { planLimitNote } from '../util/plan-cap.js';

// apidojo's status message on a run its Free-plan limit stopped at 10 items
const PAID_PLAN_MESSAGE =
	'Your run has finished. Please subscribe to a paid plan on Apify for the best experience. Link: https://apify.com/pricing';

// apify/instagram-scraper's log on a hashtag its Free-plan limit stopped after one page
const ONE_PAGE_LOG = [
	'2026-10-18T10:00:29.492Z ACTOR: Running under "LIMITED_PERMISSIONS".',
	'2026-10-18T10:00:31.545Z INFO  Hashtag scraper is limited to one page for free users, finishing https://www.instagram.com/explore/tags/berlinbrunch/',
].join('\n');

/**
 * A fake ApifyClient: `start` returns the started run, `run().waitForFinish()` the finished run
 * before its usage settled, `run().get()` after. `reads` are the usages successive
 * `run().get()` calls return (undefined = the read fails). `onWait` runs while the run is going.
 */
function fakeClient(
	reads: (number | undefined)[],
	statusMessage?: string,
	log = 'INFO  Scraper finished',
	onWait?: () => Promise<void>,
) {
	let read = 0;
	const started: string[] = [];
	return {
		started,
		log: () => ({ get: async () => log }),
		actor: () => ({
			start: async () => {
				started.push('run-1');
				return { id: 'run-1', status: 'READY' };
			},
		}),
		dataset: () => ({ listItems: async () => ({ items: [{ a: 1 }, { a: 2 }] }) }),
		run: (id: string) => ({
			waitForFinish: async () => {
				await onWait?.();
				return {
					id,
					status: 'SUCCEEDED',
					defaultDatasetId: 'ds-1',
					usageTotalUsd: 0,
					statusMessage,
				};
			},
			get: async () => {
				const usage = reads[Math.min(read++, reads.length - 1)];
				return usage === undefined ?
						undefined
					:	{ usageTotalUsd: usage, statusMessage, status: 'SUCCEEDED' };
			},
		}),
	};
}

describe('ApifyService (pglite)', () => {
	let harness: PgliteTestingModule;
	let service: ApifyService;
	const sendJob = jest.fn(async (..._args: unknown[]) => undefined);

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [ApifyService, { provide: PgBossService, useValue: { sendJob } }],
		});
		service = harness.moduleRef.get(ApifyService);
	});

	afterAll(async () => {
		await harness.stop();
	});

	beforeEach(() => {
		sendJob.mockClear();
	});

	const useClient = (client: ReturnType<typeof fakeClient>) =>
		jest
			.spyOn(service as unknown as { getClient: () => unknown }, 'getClient')
			.mockReturnValue(client as never);
	const lastRun = () =>
		harness.orm.em
			.fork()
			.findOneOrFail(ApifyRun, { purpose: 'test' }, { orderBy: { createdAt: 'desc' } });
	// A pipeline run to start Apify runs in, as `PipelineService.execute` does
	const pipelineRun = async () => {
		const em = harness.orm.em.fork();
		const run = em.create(PipelineRun, {
			step: PipelineStepEnum.SCRAPE_TIKTOK,
			city: testCity(em),
			month: '2026-09',
			status: PipelineRunStatusEnum.RUNNING,
		});
		await em.flush();
		return run.id;
	};

	it("joins a pipeline run's Apify runs, and lets them go when the run is deleted", async () => {
		const em = harness.orm.em.fork();
		const runId = await pipelineRun();
		const paid = (costUsd: number, pipelineRun: string | null) =>
			em.create(ApifyRun, {
				actorId: 'x',
				purpose: 'joined',
				maxCostUsd: 1,
				status: ApifyRunStatusEnum.SUCCEEDED,
				costUsd,
				pipelineRun,
			});
		paid(0.4, runId);
		paid(0.35, runId);
		paid(2, null);
		await em.flush();
		const [{ runs, cost }] = await em.getConnection().execute<{ runs: number; cost: number }[]>(
			`select count(a.id)::int as runs, sum(a.cost_usd)::float as cost
			from pipeline_runs pr join apify_runs a on a.pipeline_run_id = pr.id where pr.id = ?`,
			[runId],
		);
		expect([runs, cost]).toEqual([2, 0.75]);

		await em.nativeDelete(PipelineRun, { id: runId });
		const left = await harness.orm.em.fork().find(ApifyRun, { purpose: 'joined' }, { orderBy: { costUsd: 'asc' } });
		expect(left.map(a => [a.costUsd, a.pipelineRun ?? null])).toEqual([
			[0.35, null],
			[0.4, null],
			[2, null],
		]);
	});

	it('records the settled cost, not the $0 the finished call reports', async () => {
		useClient(fakeClient([0.003]));

		const items = await service.runActor(
			'clockworks/tiktok-scraper',
			{},
			{ maxCostUsd: 1, purpose: 'test' },
		);

		expect(items).toHaveLength(2);
		const run = await lastRun();
		expect(run.status).toBe(ApifyRunStatusEnum.SUCCEEDED);
		expect(run.costUsd).toBeCloseTo(0.003);
		expect(run.itemCount).toBe(2);
		expect(run.error ?? null).toBeNull();
	});

	it('keeps the call cost when the run cannot be read again', async () => {
		useClient(fakeClient([undefined]));

		await service.runActor('clockworks/tiktok-scraper', {}, { maxCostUsd: 1, purpose: 'test' });

		expect((await lastRun()).costUsd).toBe(0);
	});

	it('records a run the Free plan cut short as partial, with its status message, and keeps its items', async () => {
		useClient(fakeClient([0.005], PAID_PLAN_MESSAGE));

		const items = await service.runActor(
			'apidojo/instagram-scraper',
			{},
			{ maxCostUsd: 1, purpose: 'test' },
		);

		expect(items).toHaveLength(2);
		const run = await lastRun();
		expect(run.status).toBe(ApifyRunStatusEnum.PARTIAL);
		expect(run.error).toBe(`Free-plan limit: ${PAID_PLAN_MESSAGE}`);
		expect(run.itemCount).toBe(2);
	});

	it('records a run whose log alone says the Free plan limited it', async () => {
		useClient(fakeClient([0.99], 'Scraper finished', ONE_PAGE_LOG));

		await service.runActor('apify/instagram-scraper', {}, { maxCostUsd: 6, purpose: 'test' });

		const run = await lastRun();
		expect(run.status).toBe(ApifyRunStatusEnum.PARTIAL);
		expect(run.error).toBe(
			'Free-plan limit: Hashtag scraper is limited to one page for free users, finishing https://www.instagram.com/explore/tags/berlinbrunch/',
		);
	});

	it('reads the cost again a few minutes later, when Apify has settled it', async () => {
		// Read right after the run: partly settled; read by the job: the real figure
		const client = fakeClient([0.0008, 0.037]);
		useClient(client);

		await service.runActor(
			'novi/advanced-search-tiktok-api',
			{},
			{ maxCostUsd: 4, purpose: 'test' },
		);
		const run = await lastRun();
		expect(run.costUsd).toBeCloseTo(0.0008);
		expect(sendJob).toHaveBeenCalledWith(
			SettleApifyRunCostJob.jobName,
			new SettleApifyRunCostJob({ apifyRunId: run.id }),
			{ startAfter: COST_SETTLE_DELAY_SECONDS },
		);

		await service.settleCost(run.id);
		expect((await lastRun()).costUsd).toBeCloseTo(0.037);
	});

	it('queues no re-read for a run Apify refused to start', async () => {
		useClient({
			actor: () => ({
				start: async () => {
					throw new Error(
						'Maximum cost per run is less than the allowed minimum of $4.00',
					);
				},
			}),
		} as never);

		await expect(
			service.runActor(
				'novi/advanced-search-tiktok-api',
				{},
				{ maxCostUsd: 3, purpose: 'test' },
			),
		).rejects.toThrow('allowed minimum');

		const run = await lastRun();
		expect(run.status).toBe(ApifyRunStatusEnum.FAILED);
		expect(run.error).toContain('allowed minimum of $4.00');
		expect(sendJob).not.toHaveBeenCalled();
	});

	it('knows the wording of a Free-plan limit, in the status message or the log', () => {
		expect(planLimitNote(PAID_PLAN_MESSAGE)).toBe(PAID_PLAN_MESSAGE);
		expect(
			planLimitNote(
				undefined,
				'2026-10-15T19:11:02.321Z Monthly run limit exceeded per user.',
			),
		).toBe('Monthly run limit exceeded per user.');
		expect(
			planLimitNote(
				null,
				'[FREE_API_LIMIT] Free API runs are limited to 2,000 results per run',
			),
		).toContain('Free API runs');
		expect(
			planLimitNote(
				'Collected 30 videos.',
				'[apify] INFO  Free-plan sample limit: 100 results total per run',
			),
		).toBe('Free-plan sample limit: 100 results total per run');
		// What the pipeline's actors print on a normal run
		expect(
			planLimitNote('Scraped 2/2 posts for top-level comments. Total comments scraped: 40.'),
		).toBeNull();
		expect(
			planLimitNote(
				'Collected 30 videos from berlin restaurant.',
				'INFO  Results limited to maxItems (100)',
			),
		).toBeNull();
		expect(planLimitNote(undefined, undefined)).toBeNull();
	});

	it('starts no new run once the process is shutting down', async () => {
		const client = fakeClient([0.01]);
		useClient(client);
		processShutdown.requested = true;
		try {
			await expect(
				service.runActor('clockworks/tiktok-scraper', { a: 9 }, { maxCostUsd: 1, purpose: 'test' }),
			).rejects.toBeInstanceOf(ShuttingDownError);
		} finally {
			processShutdown.requested = false;
		}
		expect(client.started).toHaveLength(0);
	});

	it('stores the Apify run id as soon as the run starts', async () => {
		let whileRunning: ApifyRun | undefined;
		useClient(
			fakeClient([0.01], undefined, undefined, async () => {
				whileRunning = await lastRun();
			}),
		);

		await service.runActor('clockworks/tiktok-scraper', { a: 1 }, { maxCostUsd: 1, purpose: 'test' });

		expect(whileRunning?.apifyRunId).toBe('run-1');
		expect(whileRunning?.status).toBe(ApifyRunStatusEnum.RUNNING);
		expect(whileRunning?.inputHash).toBe(hashActorInput('clockworks/tiktok-scraper', { a: 1 }));
	});

	it('tags a run with the pipeline step it was started in', async () => {
		useClient(fakeClient([0.01]));
		const context = { pipelineRunId: await pipelineRun(), stepKey: '1. SCRAPE_TIKTOK' };

		await apifyRunContext.run(context, () =>
			service.runActor('clockworks/tiktok-scraper', { a: 1 }, { maxCostUsd: 1, purpose: 'test' }),
		);

		const run = await lastRun();
		expect(run.pipelineRun?.id).toBe(context.pipelineRunId);
		expect(run.stepKey).toBe(context.stepKey);
	});

	it('re-attaches a resumed step to the run its earlier attempt started, without paying again', async () => {
		const context = { pipelineRunId: await pipelineRun(), stepKey: '3. SCRAPE_REVIEWS' };
		const input = { placeIds: ['p1', 'p2'], since: '2026-09-01' };
		const em = harness.orm.em.fork();
		const earlier = em.create(ApifyRun, {
			actorId: 'compass/Google-Maps-Reviews-Scraper',
			purpose: 'test',
			maxCostUsd: 5,
			status: ApifyRunStatusEnum.RUNNING,
			apifyRunId: 'run-before-restart',
			inputHash: hashActorInput('compass/Google-Maps-Reviews-Scraper', { since: '2026-09-01', placeIds: ['p1', 'p2'] }),
			pipelineRun: context.pipelineRunId,
			stepKey: context.stepKey,
		});
		await em.flush();
		const client = fakeClient([0.2]);
		useClient(client);

		const items = await apifyRunContext.run(context, () =>
			service.runActor('compass/Google-Maps-Reviews-Scraper', input, { maxCostUsd: 5, purpose: 'test' }),
		);

		expect(items).toHaveLength(2);
		expect(client.started).toHaveLength(0);
		const runs = await harness.orm.em.fork().find(ApifyRun, { pipelineRun: context.pipelineRunId });
		expect(runs).toHaveLength(1);
		expect(runs[0].id).toBe(earlier.id);
		expect(runs[0].status).toBe(ApifyRunStatusEnum.SUCCEEDED);
		expect(runs[0].itemCount).toBe(2);

		// The same call again in this process is a new run, not the one just read
		await apifyRunContext.run(context, () =>
			service.runActor('compass/Google-Maps-Reviews-Scraper', input, { maxCostUsd: 5, purpose: 'test' }),
		);
		expect(client.started).toHaveLength(1);
	});

	it('never re-attaches to another step, another input or a failed run', async () => {
		const context = { pipelineRunId: await pipelineRun(), stepKey: '1. SCRAPE_TIKTOK' };
		const em = harness.orm.em.fork();
		const base = {
			actorId: 'clockworks/tiktok-scraper',
			purpose: 'test',
			maxCostUsd: 1,
			apifyRunId: 'old',
			pipelineRun: context.pipelineRunId,
		};
		em.create(ApifyRun, { ...base, status: ApifyRunStatusEnum.RUNNING, stepKey: '2. OTHER', inputHash: hashActorInput(base.actorId, { a: 1 }) });
		em.create(ApifyRun, { ...base, status: ApifyRunStatusEnum.RUNNING, stepKey: context.stepKey, inputHash: hashActorInput(base.actorId, { a: 2 }) });
		em.create(ApifyRun, { ...base, status: ApifyRunStatusEnum.FAILED, stepKey: context.stepKey, inputHash: hashActorInput(base.actorId, { a: 1 }) });
		await em.flush();
		const client = fakeClient([0.01]);
		useClient(client);

		await apifyRunContext.run(context, () =>
			service.runActor(base.actorId, { a: 1 }, { maxCostUsd: 1, purpose: 'test' }),
		);

		expect(client.started).toHaveLength(1);
	});

	it('settles the runs a restart left RUNNING, except those a resumed step will re-attach to', async () => {
		const em = harness.orm.em.fork();
		const kept = await pipelineRun();
		const orphan = em.create(ApifyRun, { actorId: 'x', purpose: 'orphan', maxCostUsd: 1, status: ApifyRunStatusEnum.RUNNING, apifyRunId: 'run-orphan' });
		const neverStarted = em.create(ApifyRun, { actorId: 'x', purpose: 'orphan', maxCostUsd: 1, status: ApifyRunStatusEnum.RUNNING });
		const resumed = em.create(ApifyRun, { actorId: 'x', purpose: 'kept', maxCostUsd: 1, status: ApifyRunStatusEnum.RUNNING, apifyRunId: 'run-kept', pipelineRun: kept, stepKey: '1. X' });
		await em.flush();
		useClient(fakeClient([0.42]));

		await service.settleOrphans([kept]);

		const read = harness.orm.em.fork();
		const [o, n, r] = await Promise.all([orphan, neverStarted, resumed].map(x => read.findOneOrFail(ApifyRun, x.id)));
		// Apify's outcome: a later attempt of its step may still re-attach to it
		expect(o.status).toBe(ApifyRunStatusEnum.SUCCEEDED);
		expect(o.costUsd).toBeCloseTo(0.42);
		expect(o.error).toContain('Items not stored');
		expect(n.status).toBe(ApifyRunStatusEnum.FAILED);
		expect(n.error).toContain('before the run started');
		expect(r.status).toBe(ApifyRunStatusEnum.RUNNING);
	});

	it('waits while Apify refuses a start for the plan memory, then starts', async () => {
		const client = fakeClient([0.01]);
		let refusals = 2;
		const start = client.actor().start;
		const refusing = {
			...client,
			actor: () => ({
				start: async () => {
					if (refusals-- > 0)
						throw Object.assign(new Error('By launching this job you will exceed the memory limit of 16384MB'), { statusCode: 402 });
					return start();
				},
			}),
		};
		useClient(refusing as never);
		service.memoryRetryMs = 1;

		const items = await service.runActor('clockworks/tiktok-comments-scraper', { a: 7 }, { maxCostUsd: 1, purpose: 'test', memoryMbytes: 1024 });

		expect(items).toHaveLength(2);
		expect(refusals).toBe(-1);
		expect((await lastRun()).status).toBe(ApifyRunStatusEnum.SUCCEEDED);
	});
});
