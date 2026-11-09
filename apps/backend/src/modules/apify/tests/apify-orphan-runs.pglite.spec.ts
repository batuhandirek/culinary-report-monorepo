import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';
import { PgBossService } from 'src/modules/pgboss/pgboss.service.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { ApifyRun, ApifyRunStatusEnum } from '../entities/apify-run.entity.js';
import { ApifyService } from '../services/apify.service.js';

import { apifyRunFactory } from './factories/apify-run.factory.js';

/**
 * Rows left RUNNING that no workflow will close (`ApifyService.settleOrphans`): one no workflow
 * owns or whose workflow is dead takes Apify's outcome and cost, items not stored; a live
 * workflow's row, and one Apify still runs, stay RUNNING. The credit then stops counting the
 * closed rows' caps.
 */
describe('ApifyService.settleOrphans (pglite)', () => {
	let harness: PgliteTestingModule;
	let service: ApifyService;
	const state = { launched: true };
	/** DBOS's status of each workflow; a workflow not listed is gone */
	const workflows = new Map<string, string>();
	/** Apify's runs by id; `'throw'` for a read that fails, absent for a run Apify doesn't know */
	const apifyRuns = new Map<string, Record<string, unknown> | 'throw'>();
	const sendJob = jest.fn(async () => undefined);
	const durable = {
		isLaunched: () => state.launched,
		list: jest.fn(async ({ workflowIDs }: { workflowIDs: string[] }) =>
			workflowIDs
				.filter(id => workflows.has(id))
				.map(id => ({ workflowID: id, status: workflows.get(id) })),
		),
	};
	const client = {
		run: (id: string) => ({
			get: async () => {
				const run = apifyRuns.get(id);
				if (run === 'throw') throw new Error('socket hang up');
				return run;
			},
		}),
		user: () => ({
			limits: async () => ({
				limits: { maxMonthlyUsageUsd: 250 },
				current: { monthlyUsageUsd: 100 },
				monthlyUsageCycle: {
					startAt: new Date('2026-11-01'),
					endAt: new Date('2026-12-01'),
				},
			}),
		}),
	};

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				ApifyService,
				{ provide: PgBossService, useValue: { sendJob } },
				{ provide: DurableWorkflowsService, useValue: durable },
			],
		});
		entityManagerManager.setEntityManager(harness.orm.em);
		service = harness.moduleRef.get(ApifyService);
		(service as unknown as { client: typeof client }).client = client;
	});

	afterAll(async () => {
		await harness.stop();
	});

	beforeEach(async () => {
		state.launched = true;
		workflows.clear();
		apifyRuns.clear();
		sendJob.mockClear();
		durable.list.mockClear();
		await harness.orm.em.fork().nativeDelete(ApifyRun, {});
	});

	const reload = (id: string) => harness.orm.em.fork().findOneOrFail(ApifyRun, id);

	it('closes a row no workflow owns with what Apify says it did and cost', async () => {
		const finishedAt = new Date('2026-11-05T07:28:15Z');
		const row = await apifyRunFactory.create({ apifyRunId: 'abc', maxCostUsd: 8.78 });
		apifyRuns.set('abc', { status: 'ABORTED', usageTotalUsd: 1.33, finishedAt });

		expect(await service.settleOrphans()).toBe(1);

		const closed = await reload(row.id);
		expect(closed.status).toBe(ApifyRunStatusEnum.PARTIAL);
		expect(closed.costUsd).toBe(1.33);
		expect(closed.finishedAt).toEqual(finishedAt);
		expect(closed.error).toBe('Items not stored: no workflow owns it (Apify: ABORTED)');
		expect(sendJob).toHaveBeenCalledTimes(1);
	});

	it("leaves a live workflow's row to it, whatever Apify says", async () => {
		const rows = await Promise.all(
			['PENDING', 'ENQUEUED', 'DELAYED'].map((status, i) => {
				workflows.set(`wf-${i}`, status);
				apifyRuns.set(`run-${i}`, { status: 'SUCCEEDED', usageTotalUsd: 1 });
				return apifyRunFactory.create({ workflowId: `wf-${i}`, apifyRunId: `run-${i}` });
			}),
		);

		expect(await service.settleOrphans()).toBe(0);
		for (const row of rows)
			expect((await reload(row.id)).status).toBe(ApifyRunStatusEnum.RUNNING);
		expect(durable.list).toHaveBeenCalledTimes(1);
	});

	it('closes the rows of cancelled, failed and finished workflows by their Apify outcome', async () => {
		workflows.set('wf-cancelled', 'CANCELLED');
		workflows.set('wf-error', 'ERROR');
		workflows.set('wf-done', 'SUCCESS');
		apifyRuns.set('r-1', { status: 'TIMED-OUT', usageTotalUsd: 2 });
		apifyRuns.set('r-2', { status: 'SUCCEEDED', usageTotalUsd: 3 });
		apifyRuns.set('r-3', { status: 'FAILED', usageTotalUsd: 0.1 });
		const cancelled = await apifyRunFactory.create({
			workflowId: 'wf-cancelled',
			apifyRunId: 'r-1',
		});
		const failed = await apifyRunFactory.create({ workflowId: 'wf-error', apifyRunId: 'r-2' });
		const done = await apifyRunFactory.create({ workflowId: 'wf-done', apifyRunId: 'r-3' });

		expect(await service.settleOrphans()).toBe(3);

		expect(await reload(cancelled.id)).toMatchObject({
			status: ApifyRunStatusEnum.PARTIAL,
			costUsd: 2,
			error: 'Items not stored: its workflow wf-cancelled was cancelled (Apify: TIMED-OUT)',
		});
		expect(await reload(failed.id)).toMatchObject({
			status: ApifyRunStatusEnum.SUCCEEDED,
			error: 'Items not stored: its workflow wf-error failed (ERROR) (Apify: SUCCEEDED)',
		});
		expect(await reload(done.id)).toMatchObject({ status: ApifyRunStatusEnum.FAILED });
	});

	it("waits for a dead workflow's run Apify still runs, and tries an unreadable one again later", async () => {
		workflows.set('wf-cancelled', 'CANCELLED');
		apifyRuns.set('still', { status: 'RUNNING', usageTotalUsd: 0.5 });
		apifyRuns.set('down', 'throw');
		const still = await apifyRunFactory.create({
			workflowId: 'wf-cancelled',
			apifyRunId: 'still',
		});
		const down = await apifyRunFactory.create({ apifyRunId: 'down' });

		expect(await service.settleOrphans()).toBe(0);
		expect((await reload(still.id)).status).toBe(ApifyRunStatusEnum.RUNNING);
		expect((await reload(down.id)).status).toBe(ApifyRunStatusEnum.RUNNING);
	});

	it('fails a row that never started or that Apify does not know', async () => {
		const unstarted = await apifyRunFactory.create({ workflowId: 'wf-gone', apifyRunId: null });
		const unknown = await apifyRunFactory.create({ apifyRunId: 'nobody' });

		expect(await service.settleOrphans()).toBe(2);

		expect(await reload(unstarted.id)).toMatchObject({
			status: ApifyRunStatusEnum.FAILED,
			error: 'Never started: its workflow wf-gone is gone',
		});
		expect(await reload(unknown.id)).toMatchObject({
			status: ApifyRunStatusEnum.FAILED,
			error: 'Apify knows no run nobody: no workflow owns it',
		});
		// No re-read for a run that never started
		expect(sendJob).toHaveBeenCalledTimes(1);
	});

	it('does nothing without DBOS: it could not tell a live workflow from a dead one', async () => {
		state.launched = false;
		const row = await apifyRunFactory.create({ apifyRunId: 'abc' });
		apifyRuns.set('abc', { status: 'ABORTED', usageTotalUsd: 1 });

		expect(await service.settleOrphans()).toBe(0);
		expect((await reload(row.id)).status).toBe(ApifyRunStatusEnum.RUNNING);
	});

	it("the credit stops counting a closed row's cap", async () => {
		apifyRuns.set('dead', { status: 'ABORTED', usageTotalUsd: 1.33 });
		apifyRuns.set('live', { status: 'RUNNING' });
		workflows.set('wf-live', 'PENDING');
		await apifyRunFactory.create({ apifyRunId: 'dead', maxCostUsd: 8.78 });
		await apifyRunFactory.create({ workflowId: 'wf-live', apifyRunId: 'live', maxCostUsd: 4 });
		const before = await service.credit();
		expect(before.runningRuns).toBe(2);
		expect(before.remainingUsd).toBeCloseTo(250 - 100 - 12.78, 4);

		await service.settleOrphans();

		const after = await service.credit();
		expect(after.runningRuns).toBe(1);
		expect(after.runningCapsUsd).toBe(4);
		expect(after.remainingUsd).toBe(146);
	});
});
