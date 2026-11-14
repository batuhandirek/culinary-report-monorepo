import { Injectable } from '@nestjs/common';

import { DBOS, type WorkflowHandle } from '@dbos-inc/dbos-sdk';
import { afterAll, beforeAll, expect, it } from '@jest/globals';
import pg from 'pg';

import {
	createPgliteTestingModule,
	DBOS_TEST_DATABASE_URL,
	describeWithDbos,
	PgliteTestingModule,
} from 'src/tests/testing-module.js';

import { DURABLE_WORKFLOWS_OPTIONS } from '../constants/durable-workflows.constant.js';
import { DurableWorkflow } from '../decorators/durable-workflow.decorator.js';
import type { DurableWorkflowsModuleOptions } from '../interfaces/durable-workflows.interface.js';
import { DurablePruneSchedule } from '../schedules/durable-prune.schedule.js';
import { DurablePruneService, type PruneCursor } from '../services/durable-prune.service.js';
import { DurableRegistry } from '../services/durable-registry.service.js';
import { DurableWorkflowsService } from '../services/durable-workflows.service.js';

const DAY_MS = 24 * 3600 * 1000;

/** Item runs that may go after three days, a sweep over them, one kept for good, one that waits */
@Injectable()
class PruneSamples {
	constructor(private readonly durable: DurableWorkflowsService) {}

	@DurableWorkflow({ keepDays: 3 })
	async item(label: string): Promise<string> {
		return this.durable.step('work', async () => label);
	}

	@DurableWorkflow({ keepDays: 3 })
	async sweep(labels: string[]): Promise<string[]> {
		const handles: WorkflowHandle<string>[] = [];
		for (const label of labels) handles.push(await this.durable.start(this.item, [label]));
		const out: string[] = [];
		for (const handle of handles) out.push(await handle.getResult());
		return out;
	}

	@DurableWorkflow({ keepDays: 3 })
	async broken(): Promise<string> {
		return this.durable.step('fail', async () => {
			throw new Error('no');
		});
	}

	/** Kept for good (no `keepDays`), like an operation's run */
	@DurableWorkflow()
	async kept(label: string): Promise<string> {
		return label;
	}

	/** Starts an item and stays running until told to finish: a live parent */
	@DurableWorkflow()
	async waiter(label: string): Promise<string> {
		const child = await this.durable.start(this.item, [label]);
		await child.getResult();
		await this.durable.recv('finish', 60);
		return label;
	}
}

/*
 * The prune on a real DBOS (skipped without `DBOS_TEST_DATABASE_URL`): runs of the workflows that
 * declare `keepDays` are deleted with every row DBOS keeps for them once they ended that long ago,
 * a failed one only after `DURABLE_PRUNE_FAILED_KEEP_DAYS`, never one under a live run, never a
 * workflow without `keepDays`; the batches walk the runs by a cursor.
 */
describeWithDbos('Durable prune (DBOS)', () => {
	let harness: PgliteTestingModule;
	let samples: PruneSamples;
	let durable: DurableWorkflowsService;
	let db: pg.Pool;
	let app: string;
	const ids: Record<string, string> = {};

	/** This application's runs by status: which of `ids` are still there */
	const left = async (): Promise<Record<string, string>> => {
		const { rows } = await db.query<{ workflow_uuid: string; status: string }>(
			'select workflow_uuid, status from dbos.workflow_status where application_name = $1',
			[app],
		);
		const byId = new Map(rows.map(r => [r.workflow_uuid, r.status]));
		return Object.fromEntries(
			Object.entries(ids)
				.filter(([, id]) => byId.has(id))
				.map(([label, id]) => [label, byId.get(id)!]),
		);
	};
	/** Moves a run's times `days` into the past, as if it had ended then */
	const age = async (id: string, days: number) => {
		const at = Date.now() - days * DAY_MS;
		await db.query(
			`update dbos.workflow_status set created_at = $2, updated_at = $2, completed_at = case when completed_at is null then null else $2::bigint end
			where workflow_uuid = $1`,
			[id, at],
		);
	};

	beforeAll(async () => {
		harness = await createPgliteTestingModule({ providers: [PruneSamples], durable: true });
		samples = harness.moduleRef.get(PruneSamples);
		durable = harness.moduleRef.get(DurableWorkflowsService);
		app =
			harness.moduleRef.get<DurableWorkflowsModuleOptions>(
				DURABLE_WORKFLOWS_OPTIONS,
			).applicationName!;
		db = new pg.Pool({ connectionString: DBOS_TEST_DATABASE_URL, max: 1 });

		const run = async <T>(label: string, start: () => Promise<WorkflowHandle<T>>) => {
			const handle = await start();
			ids[label] = handle.workflowID;
			return handle;
		};
		await (await run('item', () => durable.start(samples.item, ['a']))).getResult();
		await (await run('sweep', () => durable.start(samples.sweep, [['b', 'c']]))).getResult();
		await (await run('kept', () => durable.start(samples.kept, ['k']))).getResult();
		const broken = await run('broken', () => durable.start(samples.broken, []));
		await expect(broken.getResult()).rejects.toThrow('no');
		await run('waiter', () => durable.start(samples.waiter, ['w']));
		// The children: the sweep's two items and the waiter's one
		const { rows } = await db.query<{ workflow_uuid: string; parent_workflow_id: string }>(
			`select workflow_uuid, parent_workflow_id from dbos.workflow_status
			where application_name = $1 and parent_workflow_id is not null order by workflow_uuid`,
			[app],
		);
		const children = (parent: string) =>
			rows.filter(r => r.parent_workflow_id === parent).map(r => r.workflow_uuid);
		[ids['sweep child 1'], ids['sweep child 2']] = children(ids.sweep);
		const waitUntil = Date.now() + 15_000;
		while (!children(ids.waiter).length && Date.now() < waitUntil) {
			await new Promise(resolve => setTimeout(resolve, 100));
			rows.push(
				...(
					await db.query<{ workflow_uuid: string; parent_workflow_id: string }>(
						'select workflow_uuid, parent_workflow_id from dbos.workflow_status where parent_workflow_id = $1',
						[ids.waiter],
					)
				).rows,
			);
		}
		[ids['waiter child']] = children(ids.waiter);
		// The waiter's child has to have finished, so only its live parent keeps it
		await DBOS.retrieveWorkflow(ids['waiter child']).getResult();
		for (const id of Object.values(ids)) await age(id, 5);
	});

	afterAll(async () => {
		if (ids.waiter) await durable.send(ids.waiter, 'done', 'finish').catch(() => undefined);
		await db?.end();
		await harness.stop();
	});

	it('knows the workflows that declare keepDays, the prune schedule among them', () => {
		expect(harness.moduleRef.get(DurableRegistry).prunable()).toEqual(
			expect.arrayContaining([
				{ className: 'PruneSamples', name: 'item', keepDays: 3 },
				{ className: 'PruneSamples', name: 'sweep', keepDays: 3 },
				{ className: 'PruneSamples', name: 'broken', keepDays: 3 },
				{ className: 'DurablePruneSchedule', name: 'prune', keepDays: 3 },
			]),
		);
		expect(
			harness.moduleRef
				.get(DurableRegistry)
				.prunable()
				.map(r => r.name),
		).not.toContain('kept');
	});

	it('walks the runs past their time batch by batch, by a cursor', async () => {
		const service = harness.moduleRef.get(DurablePruneService);
		const rules = [{ className: 'PruneSamples', name: 'item', keepDays: 3 }];
		// At a `now` five days back nothing has ended three days before it
		expect(await service.batch(rules, Date.now() - 5 * DAY_MS, null, 10)).toEqual({
			looked: 0,
			deleted: 0,
			next: null,
		});
		// One run a batch: the four items (the lone one, the sweep's two, the waiter's), then none
		const looked: number[] = [];
		let deleted = 0;
		let after: PruneCursor | null = null;
		for (let i = 0; i < 10; i++) {
			const batch = await service.batch(rules, Date.now(), after, 1);
			looked.push(batch.looked);
			deleted += batch.deleted;
			if (!batch.next) break;
			after = batch.next;
		}
		expect(looked).toEqual([1, 1, 1, 1, 0]);
		// The waiter's child stays: its parent is live and may still await it
		expect(deleted).toBe(3);
	});

	it('deletes the runs past their keepDays with every row of theirs, and keeps the rest', async () => {
		// The sweep is left (the items went in the batches above)
		const result = await harness.moduleRef.get(DurablePruneSchedule).prune();
		expect(result).toMatchObject({ deleted: 1, batches: 1 });
		expect(await left()).toEqual({
			// No keepDays
			kept: 'SUCCESS',
			// Failed: kept at least 14 days, so it can be resumed
			broken: 'ERROR',
			// A live run and the finished child it may still await
			waiter: 'PENDING',
			'waiter child': 'SUCCESS',
		});
		const deleted = [ids.item, ids.sweep, ids['sweep child 1'], ids['sweep child 2']];
		for (const table of ['workflow_input', 'workflow_output', 'operation_outputs']) {
			const { rows } = await db.query<{ n: number }>(
				`select count(*)::int as n from dbos.${table} where workflow_uuid = any($1)`,
				[deleted],
			);
			expect([table, rows[0].n]).toEqual([table, 0]);
		}
	});

	it('deletes a failed run after 14 days, and a child once its parent has finished', async () => {
		await age(ids.broken, 20);
		await durable.send(ids.waiter, 'done', 'finish');
		await DBOS.retrieveWorkflow(ids.waiter).getResult();
		await harness.moduleRef.get(DurablePruneSchedule).prune();
		expect(await left()).toEqual({ kept: 'SUCCESS', waiter: 'SUCCESS' });
	});
});
