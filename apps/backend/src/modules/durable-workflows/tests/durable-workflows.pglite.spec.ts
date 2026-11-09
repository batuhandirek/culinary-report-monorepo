import { Injectable } from '@nestjs/common';

import { DBOS } from '@dbos-inc/dbos-sdk';
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';

import {
	createPgliteTestingModule,
	describeWithDbos,
	PgliteTestingModule,
} from 'src/tests/testing-module.js';

import { DurableSchedule } from '../decorators/durable-schedule.decorator.js';
import { DurableStep } from '../decorators/durable-step.decorator.js';
import { DurableWorkflow } from '../decorators/durable-workflow.decorator.js';
import { defineDurableQueue } from '../queues/define-durable-queue.js';
import { DurableRegistry } from '../services/durable-registry.service.js';
import { DurableWorkflowsService } from '../services/durable-workflows.service.js';
import { WorkflowScannerService } from '../services/workflow-scanner.service.js';

const SAMPLE_QUEUE = defineDurableQueue('sample', { workerConcurrency: 1 });
/** One slot, so a run holding it makes the rest wait in priority order */
const ONE_SLOT_QUEUE = defineDurableQueue('one-slot', { workerConcurrency: 1 });

/** A service with every kind of durable method, as a module's `workflows/*.workflow.ts` has them */
@Injectable()
class SampleWorkflows {
	readonly calls: string[] = [];

	constructor(private readonly durable: DurableWorkflowsService) {}

	@DurableStep()
	async double(n: number): Promise<number> {
		this.calls.push(`double ${n}`);
		return n * 2;
	}

	@DurableWorkflow()
	async compute(n: number): Promise<number> {
		const doubled = await this.double(n);
		return this.durable.step('add one', async () => {
			this.calls.push(`add ${doubled}`);
			return doubled + 1;
		});
	}

	@DurableWorkflow()
	async slow(label: string): Promise<string> {
		await this.durable.sleep(300);
		this.calls.push(`slow ${label}`);
		return label;
	}

	/** Holds its queue's slot for `ms` */
	@DurableWorkflow()
	async hold(label: string, ms: number): Promise<string> {
		await this.durable.sleep(ms);
		this.calls.push(`hold ${label}`);
		return label;
	}

	/** Starts a child on the one-slot queue without saying a priority, and waits for it */
	@DurableWorkflow()
	async parent(label: string): Promise<string> {
		const child = await this.durable.start(this.hold, [`${label} child`, 10], {
			queue: ONE_SLOT_QUEUE,
		});
		return child.getResult();
	}

	@DurableSchedule('sample-tick', '*/5 * * * *')
	async tick(at: Date): Promise<void> {
		this.calls.push(`tick ${at.toISOString()}`);
	}
}

const until = async (check: () => Promise<boolean>, ms = 15_000): Promise<void> => {
	const deadline = Date.now() + ms;
	while (!(await check())) {
		if (Date.now() > deadline) throw new Error('Timed out waiting');
		await new Promise(resolve => setTimeout(resolve, 100));
	}
};

/*
 * The module on a real DBOS (the app's tables on PGlite, DBOS's on `DBOS_TEST_DATABASE_URL`; the
 * suite skips without it): decorated methods registered by the scanner and run as workflows with
 * checkpointed steps, queues with deduplication, schedules written, fired and pruned.
 *
 *   DBOS_TEST_DATABASE_URL="postgresql://postgres:<DB_PASSWORD>@localhost:5441/munchwerk_dbos_test" \
 *     npm run test -w backend -- --testPathPatterns durable-workflows.pglite
 */
describeWithDbos('Durable workflows (DBOS)', () => {
	let harness: PgliteTestingModule;
	let sample: SampleWorkflows;
	let durable: DurableWorkflowsService;

	beforeAll(async () => {
		harness = await createPgliteTestingModule({ providers: [SampleWorkflows], durable: true });
		sample = harness.moduleRef.get(SampleWorkflows);
		durable = harness.moduleRef.get(DurableWorkflowsService);
	});

	afterAll(async () => {
		await harness.stop();
	});

	it('registers the decorated methods and launches', () => {
		expect(durable.launched).toBe(true);
		expect(durable.registered()).toEqual(
			expect.arrayContaining([
				{ className: 'SampleWorkflows', name: 'compute' },
				{ className: 'SampleWorkflows', name: 'slow' },
				{ className: 'SampleWorkflows', name: 'tick' },
			]),
		);
	});

	it('runs a decorated method as a workflow whose steps are checkpointed', async () => {
		expect(await sample.compute(4)).toBe(9);
		const [run] = await durable.list({ workflowName: 'compute', loadOutput: true });
		expect([run.status, run.workflowClassName, run.output]).toEqual([
			'SUCCESS',
			'SampleWorkflows',
			9,
		]);
		const steps = await durable.steps(run.workflowID);
		expect(steps.map(s => [s.name, s.output])).toEqual([
			['double', 8],
			['add one', 9],
		]);
	});

	it('starts a workflow in the background on a queue, one per dedupe key, with its tags', async () => {
		const first = await durable.start(sample.slow, ['a'], {
			queue: SAMPLE_QUEUE,
			dedupe: 'k',
			onDuplicate: 'return-existing',
			attributes: { purpose: 'test' },
		});
		const again = await durable.start(sample.slow, ['b'], {
			queue: SAMPLE_QUEUE,
			dedupe: 'k',
			onDuplicate: 'return-existing',
		});
		expect(again.workflowID).toBe(first.workflowID);
		expect(await first.getResult()).toBe('a');
		const status = await durable.get(first.workflowID);
		expect([status?.status, status?.queueName, status?.attributes]).toEqual([
			'SUCCESS',
			durable.qualifiedQueueName('sample'),
			{ purpose: 'test', priority: 'normal' },
		]);
		expect(sample.calls).toContain('slow a');
		expect(sample.calls).not.toContain('slow b');
	});

	it('enqueues by name, hands back the run in flight under the same key, and refuses an unknown name', async () => {
		const ref = { className: 'SampleWorkflows', name: 'slow' };
		const handle = await durable.enqueue(ref, ['c'], {
			queue: SAMPLE_QUEUE,
			dedupe: 'n',
			onDuplicate: 'return-existing',
		});
		const again = await durable.enqueue(ref, ['d'], {
			queue: SAMPLE_QUEUE,
			dedupe: 'n',
			onDuplicate: 'return-existing',
		});
		expect(again.workflowID).toBe(handle.workflowID);
		expect(await handle.getResult()).toBe('c');
		expect(await again.getResult()).toBe('c');
		await expect(
			durable.enqueue({ className: 'Nobody', name: 'x' }, [], { queue: SAMPLE_QUEUE }),
		).rejects.toThrow(/No workflow Nobody\/x is registered/);
	});

	it('writes the schedules to the database and fires one on demand', async () => {
		const schedules = await durable.schedules();
		expect(
			schedules.map(s => [
				durable.declaredScheduleName(s.scheduleName),
				s.schedule,
				s.workflowClassName,
				s.workflowName,
			]),
		).toEqual([['sample-tick', '*/5 * * * *', 'SampleWorkflows', 'tick']]);
		const id = await durable.triggerSchedule('sample-tick');
		await until(async () => (await durable.get(id))?.status === 'SUCCESS');
		expect(sample.calls.some(call => call.startsWith('tick '))).toBe(true);
		expect((await durable.get(id))?.scheduleName).toBe(
			durable.qualifiedScheduleName('sample-tick'),
		);
	});

	it('removes a schedule no decorator names any more', async () => {
		const tick = harness.moduleRef
			.get(DurableRegistry)
			.get({ className: 'SampleWorkflows', name: 'tick' })!;
		// Left behind by an earlier deploy
		await DBOS.createSchedule({
			scheduleName: 'gone-tick',
			workflowFn: tick.invoker as (at: Date, context: unknown) => Promise<void>,
			schedule: '0 0 * * *',
		});
		expect(
			(await durable.schedules())
				.map(s => durable.declaredScheduleName(s.scheduleName))
				.sort(),
		).toEqual(['gone-tick', 'sample-tick']);

		await harness.moduleRef.get(WorkflowScannerService).applySchedules(true);

		expect(
			(await durable.schedules()).map(s => durable.declaredScheduleName(s.scheduleName)),
		).toEqual(['sample-tick']);
	});

	it('runs a step plainly outside a workflow', async () => {
		expect(durable.inWorkflow()).toBe(false);
		expect(await durable.step('plain', async () => 42)).toBe(42);
	});

	it('cancels a queued run and resumes it', async () => {
		// Queued behind a running one, so it is still waiting when cancelled
		const blocker = await durable.start(sample.slow, ['blocker'], { queue: SAMPLE_QUEUE });
		const waiting = await durable.start(sample.slow, ['waiting'], { queue: SAMPLE_QUEUE });
		await durable.cancel(waiting.workflowID);
		expect((await durable.get(waiting.workflowID))?.status).toBe('CANCELLED');
		await blocker.getResult();
		await durable.resume(waiting.workflowID);
		await until(async () => (await durable.get(waiting.workflowID))?.status === 'SUCCESS');
		expect(sample.calls).toContain('slow waiting');
	});

	describe('priority', () => {
		const holdRuns = async (label: string) =>
			(await durable.list({ workflowName: 'hold', loadInput: true })).filter(
				w => (w.input as unknown[] | undefined)?.[0] === label,
			);
		/** Starts a run that takes the one-slot queue's slot, and waits until it has */
		const takeSlot = async (label: string, ms: number) => {
			const handle = await durable.start(sample.hold, [label, ms], { queue: ONE_SLOT_QUEUE });
			await until(async () => (await durable.get(handle.workflowID))?.status === 'PENDING');
			return handle;
		};

		it('starts a run at normal by default, with the level as a tag and DBOS number', async () => {
			const handle = await durable.start(sample.hold, ['plain', 10], {
				queue: ONE_SLOT_QUEUE,
			});
			await handle.getResult();
			const status = await durable.get(handle.workflowID);
			expect([status?.priority, status?.attributes]).toEqual([50, { priority: 'normal' }]);
		});

		it('hands a high run the slot before the normal ones that waited longer', async () => {
			const blocker = await takeSlot('order blocker', 1_500);
			const normal = await durable.start(sample.hold, ['order normal', 10], {
				queue: ONE_SLOT_QUEUE,
			});
			const high = await durable.start(sample.hold, ['order high', 10], {
				queue: ONE_SLOT_QUEUE,
				priority: 'high',
			});
			await Promise.all([blocker.getResult(), normal.getResult(), high.getResult()]);
			const order = sample.calls.filter(c => c.startsWith('hold order'));
			expect(order).toEqual(['hold order blocker', 'hold order high', 'hold order normal']);
		});

		it("gives a child its parent's level when the start says none", async () => {
			const parent = await durable.start(sample.parent, ['inherit'], { priority: 'high' });
			expect(await parent.getResult()).toBe('inherit child');
			const [child] = await holdRuns('inherit child');
			expect([child.parentWorkflowID, child.priority, child.attributes]).toEqual([
				parent.workflowID,
				1,
				{ priority: 'high' },
			]);
		});

		it('raises a waiting run a high start is handed through its dedupe key', async () => {
			const blocker = await takeSlot('shared blocker', 1_000);
			const first = await durable.start(sample.hold, ['shared', 10], {
				queue: ONE_SLOT_QUEUE,
				dedupe: 'shared',
				onDuplicate: 'return-existing',
			});
			expect((await durable.get(first.workflowID))?.priority).toBe(50);
			const again = await durable.start(sample.hold, ['shared again', 10], {
				queue: ONE_SLOT_QUEUE,
				dedupe: 'shared',
				onDuplicate: 'return-existing',
				priority: 'high',
			});
			expect(again.workflowID).toBe(first.workflowID);
			const raised = await durable.get(first.workflowID);
			expect([raised?.priority, raised?.attributes?.priority]).toEqual([1, 'high']);
			await Promise.all([blocker.getResult(), first.getResult()]);
		});

		it('sets a running run and the children waiting under it (the admin)', async () => {
			const blocker = await takeSlot('cascade blocker', 1_500);
			const parent = await durable.start(sample.parent, ['cascade']);
			await until(async () => (await holdRuns('cascade child')).length === 1);
			const [waiting] = await holdRuns('cascade child');
			expect([waiting.status, waiting.priority]).toEqual(['ENQUEUED', 50]);

			const changed = await durable.setPriority(parent.workflowID, 'high');

			expect(changed.sort()).toEqual([parent.workflowID, waiting.workflowID].sort());
			const child = await durable.get(waiting.workflowID);
			expect([child?.priority, child?.attributes?.priority]).toEqual([1, 'high']);
			expect((await durable.get(parent.workflowID))?.attributes?.priority).toBe('high');
			await Promise.all([blocker.getResult(), parent.getResult()]);
		});
	});
});
