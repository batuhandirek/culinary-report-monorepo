import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable, NotFoundException } from '@nestjs/common';

import { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';
import type { LlmWait } from 'src/modules/llm/services/durable-llm.service.js';

import {
	REPORT_ANALYSE_WORKFLOW,
	REPORT_BUILD_WORKFLOW,
	REPORT_LLM_WAIT_EVENT,
	REPORT_RUN_WORKFLOWS,
} from '../constants/report-runs.constant.js';
import type { AdminReportRunOutputDto } from '../dto/admin-report-run.output.dto.js';
import { Report } from '../entities/report.entity.js';
import { REPORTS_QUEUE } from '../queues/reports.queue.js';
import {
	type ReportBuildRequest,
	ReportBuildWorkflow,
	type ReportRunResult,
} from '../workflows/report-build.workflow.js';

import { ReportService } from './report.service.js';

const errorText = (error: unknown): string =>
	error instanceof Error ? error.message
	: typeof error === 'string' ? error
	: JSON.stringify(error);

/**
 * An admin's report builds and analyses as background runs (`ReportBuildWorkflow`, the `reports`
 * queue): started here, and read back for the page that follows them, waiting included.
 */
@Injectable()
export class ReportRunsService {
	constructor(
		private readonly em: EntityManager,
		private readonly durable: DurableWorkflowsService,
		private readonly reportService: ReportService,
		private readonly workflow: ReportBuildWorkflow,
	) {}

	/**
	 * Starts a build, `high` (an admin waits on it): one in flight per brand, city, month and
	 * configuration, a second ask handed the run already going. 400 at once when the brand has no
	 * open branch to report on.
	 */
	async build(request: ReportBuildRequest): Promise<AdminReportRunOutputDto> {
		await this.reportService.assertBuildable(request.brandId, request.cityId);
		const { brandId, cityId, month, configId } = request;
		const handle = await this.durable.start(
			this.workflow.build,
			[brandId, cityId, month, configId],
			{
				queue: REPORTS_QUEUE,
				dedupe: `build:${brandId}:${cityId ?? 'all'}:${month}:${configId ?? 'all'}`,
				onDuplicate: 'return-existing',
				// An admin waits on it: it passes what waits on the queue
				priority: 'high',
				attributes: { brandId, ...(cityId && { cityId }), purpose: REPORT_BUILD_WORKFLOW },
			},
		);
		return this.get(handle.workflowID);
	}

	/** Starts "Analyse again" on a report, `high`: one in flight per report. 404 for an unknown one. */
	async analyse(reportId: string): Promise<AdminReportRunOutputDto> {
		const report = await this.em.findOne(Report, { id: reportId });
		if (!report) throw new NotFoundException('No report with this id');
		const cityId = report.city?.id ?? null;
		const handle = await this.durable.start(this.workflow.analyse, [report.id], {
			queue: REPORTS_QUEUE,
			dedupe: `analyse:${report.id}`,
			onDuplicate: 'return-existing',
			// An admin waits on it: it passes what waits on the queue
			priority: 'high',
			attributes: {
				brandId: report.brand.id,
				...(cityId && { cityId }),
				purpose: REPORT_ANALYSE_WORKFLOW,
			},
		});
		return this.get(handle.workflowID);
	}

	/** Where a report run is; 404 for a run that is no report build or analysis */
	async get(workflowId: string): Promise<AdminReportRunOutputDto> {
		const status = await this.durable.get(workflowId);
		if (!status || !REPORT_RUN_WORKFLOWS.includes(status.workflowName))
			throw new NotFoundException('No report run with this id');
		switch (status.status) {
			case 'ENQUEUED':
			case 'DELAYED':
				return { workflowId, state: 'queued' };
			case 'PENDING': {
				const wait = await this.durable.getEvent<LlmWait | null>(
					workflowId,
					REPORT_LLM_WAIT_EVENT,
				);
				if (!wait) return { workflowId, state: 'running' };
				return {
					workflowId,
					state: 'waiting',
					wait: {
						agentId: wait.agentId,
						reason: wait.reason,
						...(wait.until && { until: new Date(wait.until) }),
						wakeAt: new Date(wait.wakeAt),
					},
				};
			}
			case 'SUCCESS':
				return {
					workflowId,
					state: 'done',
					reportIds: (status.output as ReportRunResult | undefined)?.reportIds ?? [],
				};
			default:
				return {
					workflowId,
					state: 'failed',
					error:
						status.error !== undefined && status.error !== null ?
							errorText(status.error)
						:	`The run ended ${status.status.toLowerCase()}`,
				};
		}
	}
}
