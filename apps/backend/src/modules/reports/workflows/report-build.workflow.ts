import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import { DurableStep } from 'src/modules/durable-workflows/decorators/durable-step.decorator.js';
import { DurableWorkflow } from 'src/modules/durable-workflows/decorators/durable-workflow.decorator.js';
import { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';
import { DurableLlmService, type LlmServed } from 'src/modules/llm/services/durable-llm.service.js';

import { ReportAnalysisAgent } from '../agents/report-analysis.agent.js';
import { ReportEditorAgent } from '../agents/report-editor.agent.js';
import {
	REPORT_ANALYSE_WORKFLOW,
	REPORT_BUILD_WORKFLOW,
	REPORT_LLM_WAIT_EVENT,
} from '../constants/report-runs.constant.js';
import { ReportService } from '../services/report.service.js';

/** What a report run wrote: the reports' ids, the first the one to open */
export interface ReportRunResult {
	reportIds: string[];
}

/** A build as an admin asks for it: `cityId` null is the report across the brand's cities, `configId` null every active configuration */
export interface ReportBuildRequest {
	brandId: string;
	cityId: string | null;
	month: string;
	configId: string | null;
}

/**
 * An admin's report build and "Analyse again" as durable workflows, on the `reports` queue: each
 * waits first until an LLM account can serve its agents (`DurableLlmService.untilServed`, a
 * durable sleep, the wait published as `REPORT_LLM_WAIT_EVENT` for the page), then runs the
 * service in one step. The agents take in-memory tools, so their calls run inline in that step,
 * each waiting for an account again should one run out meanwhile (`whenServed`); the step's
 * result is the reports' ids, the data stays on the rows. A restart resumes the wait, or runs the
 * step again; the report mail goes out once whatever the repeats (`ReportDeliveryService.deliverBuilt`
 * skips a report already sent).
 */
@Injectable()
export class ReportBuildWorkflow {
	constructor(
		private readonly orm: MikroORM,
		private readonly durable: DurableWorkflowsService,
		private readonly durableLlm: DurableLlmService,
		private readonly reportService: ReportService,
		private readonly reportAnalysisAgent: ReportAnalysisAgent,
		private readonly reportEditorAgent: ReportEditorAgent,
	) {}

	@DurableWorkflow({ name: REPORT_BUILD_WORKFLOW })
	@EnsureRequestContext()
	async build(
		brandId: string,
		cityId: string | null,
		month: string,
		configId: string | null,
	): Promise<ReportRunResult> {
		await this.waitForAccounts([this.reportAnalysisAgent, this.reportEditorAgent]);
		return { reportIds: await this.buildReports(brandId, cityId, month, configId) };
	}

	@DurableWorkflow({ name: REPORT_ANALYSE_WORKFLOW })
	@EnsureRequestContext()
	async analyse(reportId: string): Promise<ReportRunResult> {
		await this.waitForAccounts([this.reportAnalysisAgent]);
		await this.analyseReport(reportId);
		return { reportIds: [reportId] };
	}

	@DurableStep({ name: 'build reports' })
	private async buildReports(
		brandId: string,
		cityId: string | null,
		month: string,
		configId: string | null,
	): Promise<string[]> {
		const reports = await this.reportService.buildAll(brandId, cityId, month, {
			...(configId && { configId }),
		});
		return reports.map(report => report.id);
	}

	@DurableStep({ name: 'analyse report' })
	private async analyseReport(reportId: string): Promise<null> {
		await this.reportService.analyseAgain(reportId);
		return null;
	}

	private waitForAccounts(agents: LlmServed[]): Promise<void> {
		return this.durableLlm.untilServed(agents, wait =>
			this.durable.setEvent(REPORT_LLM_WAIT_EVENT, wait),
		);
	}
}
