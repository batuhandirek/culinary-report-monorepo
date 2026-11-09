import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';
import { PgBossService } from 'src/modules/pgboss/pgboss.service.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { ApifyRun } from '../entities/apify-run.entity.js';
import { ActorRunOutsideWorkflowError, ApifyService } from '../services/apify.service.js';

/**
 * A run and its owner: an actor run is a child workflow, so `runActorRef` refuses one asked for
 * outside a workflow's body; from a body it enqueues the child with the owner in its request (the
 * explicit owner over the calling workflow) and hands back the child's record.
 */
describe('ApifyService.runActorRef (pglite)', () => {
	let harness: PgliteTestingModule;
	let service: ApifyService;
	const state = { launched: false, inStep: false, workflowId: 'wf-1' as string | undefined };
	const enqueued: { args: unknown[]; options: Record<string, unknown> }[] = [];
	const durable = {
		isLaunched: () => state.launched,
		isInStep: () => state.inStep,
		inWorkflow: () => state.launched,
		withinWorkflow: () => !!state.workflowId,
		workflowId: () => state.workflowId,
		stepId: () => (state.workflowId ? 3 : undefined),
		enqueue: async (_ref: unknown, args: unknown[], options: Record<string, unknown>) => {
			enqueued.push({ args, options });
			return {
				workflowID: 'child-1',
				getResult: async () => ({ recordId: 'r-child', itemCount: 0 }),
			};
		},
	};

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				ApifyService,
				{ provide: PgBossService, useValue: { sendJob: jest.fn(async () => undefined) } },
				{ provide: DurableWorkflowsService, useValue: durable },
			],
		});
		service = harness.moduleRef.get(ApifyService);
	});

	afterAll(async () => {
		await harness.stop();
	});

	beforeEach(() => {
		state.launched = false;
		state.inStep = false;
		state.workflowId = 'wf-1';
		enqueued.length = 0;
	});

	it('refuses a run outside a workflow body: plain code, DBOS not launched, or inside a step', async () => {
		const ask = () => service.runActorRef('a/b', { x: 1 }, { maxCostUsd: 1, purpose: 'test' });
		await expect(ask()).rejects.toBeInstanceOf(ActorRunOutsideWorkflowError);
		state.launched = true;
		state.inStep = true;
		await expect(
			service.startActorRef('a/b', { x: 1 }, { maxCostUsd: 1, purpose: 'test' }),
		).rejects.toBeInstanceOf(ActorRunOutsideWorkflowError);
		expect(enqueued).toHaveLength(0);
		expect(await harness.orm.em.fork().count(ApifyRun, {})).toBe(0);
	});

	it('an explicit owner wins over the calling workflow', async () => {
		state.launched = true;
		await service.runActorRef(
			'a/b',
			{ x: 3 },
			{ maxCostUsd: 1, purpose: 'test', ownerWorkflowId: 'op-9' },
		);
		expect(enqueued[0].args[2]).toMatchObject({ ownerWorkflowId: 'op-9' });
	});

	it('launched: enqueues the child with the owner in its request and hands back its record', async () => {
		state.launched = true;
		const ref = await service.runActorRef('a/b', { x: 5 }, { maxCostUsd: 1, purpose: 'test' });
		expect(ref).toEqual({ recordId: 'r-child', itemCount: 0 });
		expect(enqueued).toHaveLength(1);
		expect(enqueued[0].args[2]).toEqual({
			maxCostUsd: 1,
			purpose: 'test',
			ownerWorkflowId: 'wf-1',
		});
		expect(enqueued[0].options).toMatchObject({
			onDuplicate: 'return-existing',
			attributes: { actorId: 'a/b', purpose: 'test' },
		});
	});
});
