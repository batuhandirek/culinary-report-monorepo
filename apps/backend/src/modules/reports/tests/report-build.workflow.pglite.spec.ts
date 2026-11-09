import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';
import { fakeDurable } from 'src/modules/durable-workflows/tests/factories/durable.mock.js';
import { DurableLlmService, type LlmWait } from 'src/modules/llm/services/durable-llm.service.js';
import type { LlmAvailability } from 'src/modules/llm/services/llm-models.service.js';
import { MIN_LLM_WAIT_MS } from 'src/modules/llm/workflows/llm.workflow.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { ReportAnalysisAgent } from '../agents/report-analysis.agent.js';
import { ReportEditorAgent } from '../agents/report-editor.agent.js';
import { REPORT_LLM_WAIT_EVENT } from '../constants/report-runs.constant.js';
import { REPORTS_QUEUE } from '../queues/reports.queue.js';
import { ReportService } from '../services/report.service.js';
import { ReportRunsService } from '../services/report-runs.service.js';
import { ReportBuildWorkflow } from '../workflows/report-build.workflow.js';

const SERVED: LlmAvailability = { available: true, until: null, reason: '' };

/**
 * An admin's report build and "Analyse again" as durable runs (the facade faked: steps run
 * plainly, a started run inline): the wait for an LLM account before the work, told as an event
 * the page reads, then the service in one step; the route's start on the `reports` queue with its
 * dedupe key, and a run read back as queued, running, waiting, done or failed.
 */
describe('ReportBuildWorkflow (pglite)', () => {
	let harness: PgliteTestingModule;
	let workflow: ReportBuildWorkflow;
	let runs: ReportRunsService;
	let durableLlm: DurableLlmService;
	const events: [string, unknown][] = [];
	const durable = {
		...fakeDurable(() => [workflow]),
		setEvent: jest.fn(async (key: string, value: unknown) => {
			events.push([key, value]);
		}),
		get: jest.fn(async (_id: string): Promise<unknown> => null),
		getEvent: jest.fn(async (_id: string, _key: string): Promise<unknown> => null),
	};
	const analysisAgent = {
		id: 'report-analysis',
		availability: jest.fn((): LlmAvailability => SERVED),
	};
	const editorAgent = {
		id: 'report-editor',
		availability: jest.fn((): LlmAvailability => SERVED),
	};
	const reportService = {
		buildAll: jest.fn(async (..._args: unknown[]) => [{ id: 'r-1' }, { id: 'r-2' }]),
		analyseAgain: jest.fn(async (..._args: unknown[]) => ({ id: 'r-1' })),
		assertBuildable: jest.fn(async (..._args: unknown[]) => undefined),
	};
	let sleep: jest.SpiedFunction<(ms: number) => Promise<void>>;

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				ReportBuildWorkflow,
				ReportRunsService,
				DurableLlmService,
				{ provide: DurableWorkflowsService, useValue: durable },
				{ provide: ReportService, useValue: reportService },
				{ provide: ReportAnalysisAgent, useValue: analysisAgent },
				{ provide: ReportEditorAgent, useValue: editorAgent },
			],
		});
		workflow = harness.moduleRef.get(ReportBuildWorkflow);
		runs = harness.moduleRef.get(ReportRunsService);
		durableLlm = harness.moduleRef.get(DurableLlmService);
		// The waits are instant here; their lengths are what the roster named
		sleep = jest
			.spyOn(durableLlm as unknown as { sleep: (ms: number) => Promise<void> }, 'sleep')
			.mockResolvedValue(undefined);
	});

	afterAll(async () => {
		await harness.stop();
	});

	beforeEach(() => {
		events.length = 0;
		durable.started.length = 0;
		sleep.mockClear();
		reportService.buildAll.mockClear();
		analysisAgent.availability.mockImplementation(() => SERVED);
		editorAgent.availability.mockImplementation(() => SERVED);
	});

	it('builds at once when an account can serve both agents, the reports by id', async () => {
		expect(await workflow.build('brand-1', 'city-1', '2026-09', null)).toEqual({
			reportIds: ['r-1', 'r-2'],
		});
		expect(reportService.buildAll).toHaveBeenCalledWith('brand-1', 'city-1', '2026-09', {});
		expect(sleep).not.toHaveBeenCalled();
		expect(events).toEqual([]);
	});

	it('waits until the roster serves the editor, telling the page, then builds', async () => {
		const until = Date.now() + 2 * 3_600_000;
		editorAgent.availability
			.mockImplementationOnce(() => ({
				available: false,
				until,
				reason: 'every account is out of its day',
			}))
			.mockImplementation(() => SERVED);

		expect(await workflow.build('brand-1', null, '2026-09', 'config-1')).toEqual({
			reportIds: ['r-1', 'r-2'],
		});
		expect(sleep).toHaveBeenCalledTimes(1);
		expect(sleep.mock.calls[0][0]).toBeGreaterThanOrEqual(2 * 3_600_000 - 1_000);
		expect(events).toEqual([
			[
				REPORT_LLM_WAIT_EVENT,
				expect.objectContaining({
					agentId: 'report-editor',
					reason: 'every account is out of its day',
					until: new Date(until).toISOString(),
				}),
			],
			// Served again: the page stops saying it waits
			[REPORT_LLM_WAIT_EVENT, null],
		]);
		expect(reportService.buildAll).toHaveBeenCalledWith('brand-1', null, '2026-09', {
			configId: 'config-1',
		});
	});

	it('waits at least a minute when the roster names no end', async () => {
		analysisAgent.availability
			.mockImplementationOnce(() => ({
				available: false,
				until: null,
				reason: 'switched off',
			}))
			.mockImplementation(() => SERVED);
		expect(await workflow.analyse('r-1')).toEqual({ reportIds: ['r-1'] });
		expect(sleep.mock.calls[0][0]).toBeGreaterThanOrEqual(MIN_LLM_WAIT_MS);
		expect(events[0]).toEqual([
			REPORT_LLM_WAIT_EVENT,
			expect.objectContaining({ agentId: 'report-analysis', until: null }),
		]);
		expect(reportService.analyseAgain).toHaveBeenCalledWith('r-1');
	});

	it("starts an admin's build on the reports queue, one in flight per brand, city, month and configuration", async () => {
		durable.get.mockResolvedValueOnce({ workflowName: 'report-build', status: 'ENQUEUED' });
		const run = await runs.build({
			brandId: 'brand-1',
			cityId: 'city-1',
			month: '2026-09',
			configId: null,
		});
		expect(reportService.assertBuildable).toHaveBeenCalledWith('brand-1', 'city-1');
		expect(run).toEqual({ workflowId: 'fake-1', state: 'queued' });
		expect(durable.started[0].args).toEqual(['brand-1', 'city-1', '2026-09', null]);
		expect(durable.started[0].options).toMatchObject({
			queue: REPORTS_QUEUE,
			dedupe: 'build:brand-1:city-1:2026-09:all',
			onDuplicate: 'return-existing',
			priority: 'high',
			attributes: { brandId: 'brand-1', cityId: 'city-1', purpose: 'report-build' },
		});
		await durable.started[0].result;
	});

	it('reads a run back: running, waiting with its wait, done with its reports, failed with why, 404 for another', async () => {
		const wait: LlmWait = {
			agentId: 'report-editor',
			reason: 'out',
			until: '2026-09-02T00:00:00.000Z',
			wakeAt: '2026-09-02T00:01:00.000Z',
		};
		durable.get.mockResolvedValueOnce({ workflowName: 'report-build', status: 'PENDING' });
		expect(await runs.get('w-1')).toEqual({ workflowId: 'w-1', state: 'running' });

		durable.get.mockResolvedValueOnce({ workflowName: 'report-build', status: 'PENDING' });
		durable.getEvent.mockResolvedValueOnce(wait);
		expect(await runs.get('w-1')).toEqual({
			workflowId: 'w-1',
			state: 'waiting',
			wait: {
				agentId: 'report-editor',
				reason: 'out',
				until: new Date(wait.until!),
				wakeAt: new Date(wait.wakeAt),
			},
		});
		expect(durable.getEvent).toHaveBeenLastCalledWith('w-1', REPORT_LLM_WAIT_EVENT);

		durable.get.mockResolvedValueOnce({
			workflowName: 'report-build',
			status: 'SUCCESS',
			output: { reportIds: ['r-1'] },
		});
		expect(await runs.get('w-1')).toEqual({
			workflowId: 'w-1',
			state: 'done',
			reportIds: ['r-1'],
		});

		durable.get.mockResolvedValueOnce({
			workflowName: 'report-analyse',
			status: 'ERROR',
			error: new Error('The brand has no open branch to analyse'),
		});
		expect(await runs.get('w-1')).toEqual({
			workflowId: 'w-1',
			state: 'failed',
			error: 'The brand has no open branch to analyse',
		});

		durable.get.mockResolvedValueOnce({
			workflowName: 'scrape-reviews.month',
			status: 'SUCCESS',
		});
		await expect(runs.get('w-2')).rejects.toThrow('No report run with this id');
	});
});
