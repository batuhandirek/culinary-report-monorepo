import type { ModulesContainer } from '@nestjs/core';

import { describe, expect, it, jest } from '@jest/globals';

import type { DurableQueue } from 'src/modules/durable-workflows/interfaces/durable-workflows.interface.js';
import type { QueuedRun } from 'src/modules/durable-workflows/services/durable-queue-moves.service.js';
import type { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';

import { BaseMastraAgent } from '../abstractions/base-mastra-agent.abstract.js';
import {
	type LlmModelChoice,
	OPENROUTER_FREE_MODEL,
	tierOf,
} from '../constants/llm-models.constant.js';
import { LLM_PAID_QUEUES, LLM_QUEUES } from '../queues/llm.queue.js';
import { DurableLlmService } from '../services/durable-llm.service.js';
import type { LlmModelsService } from '../services/llm-models.service.js';
import type { LlmWorkflows } from '../workflows/llm.workflow.js';

/** An agent whose calls run on `choice` unless the call names a model; `paidFallback` when it may pay */
const agent = (id: string, choice: LlmModelChoice, paidFallback = false) => ({
	id,
	paidFallback,
	modelChoice: (_context?: unknown, options?: { model?: LlmModelChoice }) =>
		options?.model ?? choice,
	availability: () => ({ available: true, until: null, reason: '' }),
	generate: async () => ({}),
});

const AGENTS = {
	'review-claims': agent('review-claims', 'mini'),
	'post-gate': agent('post-gate', 'mini', true),
	'post-claims': agent('post-claims', 'full', true),
	'report-editor': agent('report-editor', 'full'),
	reference: agent('reference', 'high'),
};

/** An instance of an agent class as Nest built it, with `register` watched */
const builtAgent = () => {
	const instance = Object.create(BaseMastraAgent.prototype) as BaseMastraAgent<never, object>;
	const register = jest.fn();
	Object.assign(instance, { register });
	return { instance, register };
};

const service = (providers: object[] = []) => {
	const enqueue = jest.fn(async () => ({ workflowID: 'wf', getResult: async () => ({}) }));
	const moves: { from: string; picked: (string | undefined)[] }[] = [];
	let runs: QueuedRun[] = [];
	const durable = {
		isLaunched: () => true,
		isInStep: () => false,
		enqueue,
		moveRuns: async (
			from: DurableQueue,
			pick: (run: QueuedRun) => DurableQueue | undefined,
		) => {
			moves.push({ from: from.name, picked: runs.map(r => pick(r)?.name) });
			return {};
		},
	} as unknown as DurableWorkflowsService;
	const llmModels = {
		agent: (id: string) => AGENTS[id as keyof typeof AGENTS],
	} as unknown as LlmModelsService;
	const modules = new Map([
		['m', { providers: new Map(providers.map((instance, i) => [i, { instance }])) }],
	]) as unknown as ModulesContainer;
	const llm = new DurableLlmService(durable, {} as LlmWorkflows, llmModels, modules);
	return { llm, enqueue, moves, setRuns: (r: QueuedRun[]) => (runs = r) };
};

const run = (agentId: string, extra: Partial<QueuedRun> = {}): QueuedRun => ({
	workflowId: `${agentId}-run`,
	className: 'LlmWorkflows',
	workflowName: 'generate',
	status: 'PENDING',
	attributes: { agentId },
	...extra,
});

describe('LLM queues per tier', () => {
	it('puts a choice in its tier: a tier itself, else the first tier listing the model', () => {
		expect(tierOf('mini')).toBe('mini');
		expect(tierOf('openai/gpt-5.4')).toBe('full');
		expect(tierOf('openai/gpt-5.4-mini')).toBe('mini');
		expect(tierOf('anthropic/claude-opus-5-5')).toBe('high');
		expect(tierOf(OPENROUTER_FREE_MODEL)).toBe('mini');
		expect(tierOf('openai/gpt-9')).toBe('full');
	});

	it("keeps the mini queue's old name and gives the other tiers their own", () => {
		expect([LLM_QUEUES.mini.name, LLM_QUEUES.full.name, LLM_QUEUES.high.name]).toEqual([
			'llm',
			'llm-full',
			'llm-high',
		]);
	});

	it('gives the agents that may pay queues of their own, one per tier', () => {
		expect([LLM_PAID_QUEUES.mini.name, LLM_PAID_QUEUES.full.name, LLM_PAID_QUEUES.high.name]).toEqual(
			['llm-paid', 'llm-full-paid', 'llm-high-paid'],
		);
	});

	it("starts a call on its agent's tier queue, or the tier of the model the call names, tagged with it", async () => {
		const { llm, enqueue } = service();
		const as = (id: keyof typeof AGENTS) => AGENTS[id] as unknown as BaseMastraAgent<never, object>;
		await llm.start(as('report-editor'), 'a report');
		await llm.start(as('report-editor'), 'a report', undefined, { model: 'openai/gpt-5.4-mini' });
		await llm.start(as('review-claims'), 'a review');

		const calls = enqueue.mock.calls as unknown as [
			unknown,
			unknown,
			{ queue: DurableQueue; attributes: Record<string, unknown> },
		][];
		expect(calls.map(c => c[2].queue.name)).toEqual(['llm-full', 'llm', 'llm']);
		expect(calls.map(c => c[2].attributes.model)).toEqual([
			undefined,
			'openai/gpt-5.4-mini',
			undefined,
		]);
	});

	it('starts a paying agent\'s call on its tier\'s paid queue, never behind the free-only calls that sleep until the reset', async () => {
		const { llm, enqueue } = service();
		const as = (id: keyof typeof AGENTS) => AGENTS[id] as unknown as BaseMastraAgent<never, object>;
		await llm.start(as('post-gate'), 'a post');
		await llm.start(as('post-claims'), 'a post');
		await llm.start(as('post-claims'), 'a post', undefined, { model: 'openai/gpt-5.4-mini' });

		const calls = enqueue.mock.calls as unknown as [unknown, unknown, { queue: DurableQueue }][];
		expect(calls.map(c => c[2].queue.name)).toEqual(['llm-paid', 'llm-full-paid', 'llm-paid']);
	});

	it('moves each live call to its tier at boot: by agent, by the tagged model, never an unknown agent', async () => {
		const { llm, moves, setRuns } = service();
		setRuns([
			run('review-claims'),
			run('post-claims'),
			run('reference'),
			run('post-gate'),
			run('report-editor'),
			run('post-claims', {
				attributes: { agentId: 'post-claims', model: 'openai/gpt-5.4-mini' },
			}),
			run('gone-agent'),
			run('post-claims', { workflowName: 'other' }),
		]);
		await llm.moveCallsToTheirTier();

		expect(moves.map(m => m.from)).toEqual([
			'llm',
			'llm-full',
			'llm-high',
			'llm-paid',
			'llm-full-paid',
			'llm-high-paid',
		]);
		// A paying agent's calls move to its paid queue (the post gate's waiting on `llm` included)
		expect(moves[0].picked).toEqual([
			'llm',
			'llm-full-paid',
			'llm-high',
			'llm-paid',
			'llm-full',
			'llm-paid',
			undefined,
			undefined,
		]);
	});

	it('registers every agent Nest built before it moves anything (their own init runs after the engine launched)', async () => {
		const built = builtAgent();
		const { llm } = service([built.instance, { notAnAgent: true }]);
		await llm.moveCallsToTheirTier();
		expect(built.register).toHaveBeenCalledTimes(1);
	});
});
