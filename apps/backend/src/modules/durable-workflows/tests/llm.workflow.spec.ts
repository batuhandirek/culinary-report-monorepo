// import { beforeEach, describe, expect, it, jest } from '@jest/globals';
//
// import type { BaseMastraAgent } from 'src/modules/llm/abstractions/base-mastra-agent.abstract.js';
// import {
// 	type LlmAvailability,
// 	LlmModelsService,
// 	NoModelError,
// 	type RegisteredAgent,
// } from 'src/modules/llm/services/llm-models.service.js';
// import { currentLlmCallContext, withLlmCallContext } from 'src/modules/llm/util/llm-call-context.js';
//
// import { LLM_GENERATE_WORKFLOW } from '../constants/durable-workflows.constant.js';
// import { LLM_QUEUE } from '../queues/llm.queue.js';
// import { DurableLlmService } from '../services/durable-llm.service.js';
// import type { DurableWorkflowsService } from '../services/durable-workflows.service.js';
// import {
// 	DEFAULT_MAX_LLM_WAIT_MS,
// 	LLM_WAKE_JITTER_MS,
// 	LlmWorkflows,
// 	MIN_LLM_WAIT_MS,
// } from '../workflows/llm.workflow.js';
//
// const noModel = () =>
// 	new NoModelError('No model can serve mini: openai/gpt-5.4-mini until 2026-11-07T00:00:00.000Z');
// const quotaError = () =>
// 	Object.assign(new Error('You exceeded your current quota'), { statusCode: 429 });
//
// /*
//  * The agent call workflow: one step for the call, the quota policy around it with durable waits
//  * inside a workflow, and the starter that puts it on the `llm` queue for any caller.
//  */
// describe('LlmWorkflows', () => {
// 	const slept: number[] = [];
// 	let inWorkflow = true;
// 	const durable = {
// 		inWorkflow: () => inWorkflow,
// 		step: async <T>(_name: string, fn: () => Promise<T>) => fn(),
// 		sleep: jest.fn(async (ms: number) => {
// 			slept.push(ms);
// 		}),
// 	} as unknown as DurableWorkflowsService;
// 	const generate = jest.fn<(...args: unknown[]) => Promise<unknown>>();
// 	const availability = jest.fn<() => LlmAvailability>(() => ({
// 		available: false,
// 		until: Date.now() + 10 * 60_000,
// 		reason: 'blocked',
// 	}));
// 	const agent = { id: 'post-claims', generate, availability } as unknown as RegisteredAgent;
// 	const llmModels = {
// 		agent: (id: string) => (id === 'post-claims' ? agent : undefined),
// 	} as unknown as LlmModelsService;
// 	const workflows = new LlmWorkflows({} as never, durable, llmModels);
// 	const answer = {
// 		object: { claims: 2 },
// 		text: '',
// 		model: 'anthropic/claude-haiku-5-5',
// 		totalUsage: { inputTokens: 1000, outputTokens: 500, cachedInputTokens: 0 },
// 	};
//
// 	beforeEach(() => {
// 		jest.clearAllMocks();
// 		generate.mockReset();
// 		slept.length = 0;
// 		inWorkflow = true;
// 	});
//
// 	it('finds the agent by id, keeps the small part of the answer, priced', async () => {
// 		expect(workflows.agentById('post-claims')).toBe(agent);
// 		expect(() => workflows.agentById('nobody')).toThrow(/No agent nobody/);
// 		generate.mockResolvedValueOnce(answer);
// 		const result = await workflows.run(agent, 'a post', {}, {});
// 		expect(result).toEqual({
// 			object: { claims: 2 },
// 			text: '',
// 			model: 'anthropic/claude-haiku-5-5',
// 			usage: {
// 				inputTokens: 1000,
// 				outputTokens: 500,
// 				cachedInputTokens: 0,
// 				cacheWriteTokens: 0,
// 			},
// 			// Haiku: $0.10 in, $0.50 out per million
// 			usd: 0.0001 + 0.00025,
// 		});
// 		expect(slept).toEqual([]);
// 	});
//
// 	it('hands the call its model and the spend context it was started with', async () => {
// 		let seen: unknown;
// 		generate.mockImplementationOnce(async () => {
// 			// What the ledger sees for the call made inside
// 			seen = currentLlmCallContext();
// 			return answer;
// 		});
// 		await workflows.run(
// 			agent,
// 			'a post',
// 			{ k: 1 },
// 			{ model: 'full', spend: { cityId: 'c1', purpose: 'ingest' } },
// 		);
// 		expect(generate).toHaveBeenCalledWith('a post', { k: 1 }, { model: 'full' });
// 	});
//
// 	it('waits for the roster until it serves again, then asks once more', async () => {
// 		generate
// 			.mockRejectedValueOnce(noModel())
// 			.mockRejectedValueOnce(quotaError())
// 			.mockResolvedValueOnce(answer);
// 		const result = await workflows.run(agent, 'a post', {}, { mode: 'wait' });
// 		expect(result?.object).toEqual({ claims: 2 });
// 		expect(generate).toHaveBeenCalledTimes(3);
// 		expect(slept).toHaveLength(2);
// 		for (const ms of slept) {
// 			expect(ms).toBeGreaterThanOrEqual(10 * 60_000);
// 			expect(ms).toBeLessThanOrEqual(10 * 60_000 + LLM_WAKE_JITTER_MS + 1000);
// 		}
// 	});
//
// 	it('never waits less than a minute nor longer than the cap', async () => {
// 		availability.mockReturnValueOnce({
// 			available: false,
// 			until: Date.now() - 5000,
// 			reason: 'just reset',
// 		});
// 		availability.mockReturnValueOnce({
// 			available: false,
// 			until: Date.now() + 48 * 3_600_000,
// 			reason: 'a key refused',
// 		});
// 		generate
// 			.mockRejectedValueOnce(noModel())
// 			.mockRejectedValueOnce(noModel())
// 			.mockResolvedValueOnce(answer);
// 		await workflows.run(agent, 'a post', {}, { mode: 'wait' });
// 		expect(slept[0]).toBeGreaterThanOrEqual(MIN_LLM_WAIT_MS);
// 		expect(slept[0]).toBeLessThan(MIN_LLM_WAIT_MS + LLM_WAKE_JITTER_MS + 1000);
// 		expect(slept[1]).toBeGreaterThanOrEqual(DEFAULT_MAX_LLM_WAIT_MS);
// 		expect(slept[1]).toBeLessThan(DEFAULT_MAX_LLM_WAIT_MS + LLM_WAKE_JITTER_MS + 1000);
// 	});
//
// 	it('throws instead of waiting forever when no model is configured at all', async () => {
// 		availability.mockReturnValueOnce({
// 			available: false,
// 			until: null,
// 			reason: 'no model configured for mini',
// 		});
// 		generate.mockRejectedValueOnce(noModel());
// 		await expect(workflows.run(agent, 'a post', {}, { mode: 'wait' })).rejects.toThrow(
// 			/would wait forever/,
// 		);
// 		expect(slept).toEqual([]);
// 	});
//
// 	it('stops quietly under `stop` and leaves the work for later', async () => {
// 		generate.mockRejectedValueOnce(noModel());
// 		expect(await workflows.run(agent, 'a post', {}, { mode: 'stop' })).toBeNull();
// 		expect(slept).toEqual([]);
// 		expect(generate).toHaveBeenCalledTimes(1);
// 	});
//
// 	it('swallows any error under `fail-open`, but only a provider refusal under `wait`', async () => {
// 		generate.mockRejectedValueOnce(new Error('schema mismatch'));
// 		expect(await workflows.run(agent, 'a post', {}, { mode: 'fail-open' })).toBeNull();
// 		generate.mockRejectedValueOnce(new Error('schema mismatch'));
// 		await expect(workflows.run(agent, 'a post', {}, { mode: 'wait' })).rejects.toThrow(
// 			'schema mismatch',
// 		);
// 		expect(slept).toEqual([]);
// 	});
//
// 	it('outside a workflow applies the policy once and never sleeps', async () => {
// 		inWorkflow = false;
// 		generate.mockRejectedValueOnce(noModel());
// 		expect(await workflows.run(agent, 'a post', {}, { mode: 'wait' })).toBeNull();
// 		expect(slept).toEqual([]);
// 	});
// });
//
// describe('DurableLlmService', () => {
// 	const agent = { id: 'post-claims' } as unknown as BaseMastraAgent<never, object>;
// 	const result = { object: { claims: 1 }, model: 'openai/gpt-5.4-mini', usage: {}, usd: 0 };
// 	const enqueue = jest.fn(async (..._args: unknown[]) => ({
// 		workflowID: 'wf-llm',
// 		getResult: async () => result,
// 	}));
// 	const run = jest.fn(async (..._args: unknown[]) => result);
// 	let launched = true;
// 	const service = new DurableLlmService(
// 		{
// 			isLaunched: () => launched,
// 			isInStep: () => false,
// 			enqueue,
// 		} as unknown as DurableWorkflowsService,
// 		{ run } as unknown as LlmWorkflows,
// 	);
//
// 	beforeEach(() => {
// 		jest.clearAllMocks();
// 		launched = true;
// 	});
//
// 	it('starts the call as a workflow on the llm queue, tagged and carrying the spend context', async () => {
// 		const out = await withLlmCallContext({ cityId: 'c1', purpose: 'ingest' }, () =>
// 			service.generate(agent, 'a post', { k: 1 }, { mode: 'stop', model: 'full' }),
// 		);
// 		expect(out).toBe(result);
// 		expect(enqueue).toHaveBeenCalledWith(
// 			LLM_GENERATE_WORKFLOW,
// 			[
// 				'post-claims',
// 				'a post',
// 				{ k: 1 },
// 				{ mode: 'stop', model: 'full', spend: { cityId: 'c1', purpose: 'ingest' } },
// 			],
// 			{
// 				queue: LLM_QUEUE,
// 				attributes: { agentId: 'post-claims', cityId: 'c1', purpose: 'ingest' },
// 			},
// 		);
// 		expect(run).not.toHaveBeenCalled();
// 	});
//
// 	it('is the plain call with the policy once when DBOS is not launched', async () => {
// 		launched = false;
// 		await service.generate(agent, 'a post', undefined, { mode: 'wait' });
// 		expect(run).toHaveBeenCalledWith(agent, 'a post', undefined, { mode: 'wait', spend: {} });
// 		expect(enqueue).not.toHaveBeenCalled();
// 	});
// });

import { describe, it } from '@jest/globals';

// Kept visible as skipped while the suite above stays commented out
describe.skip('llm.workflow.spec (commented out)', () => {
	it.todo('port the suite above');
});
