import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable, Logger } from '@nestjs/common';

import type { WorkflowStatus } from '@dbos-inc/dbos-sdk';

import { APIFY_MONTHLY_CREDIT_USD } from 'src/modules/apify/constants/apify.constant.js';
import { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';
import { OutreachService } from 'src/modules/outreach/services/outreach.service.js';
import { ProspectQueryService } from 'src/modules/outreach/services/prospect-query.service.js';
import { prospectItem, suggestedProspect } from 'src/modules/outreach/util/prospect-output.js';
import { Report } from 'src/modules/reports/entities/report.entity.js';
import { Mention, MentionMatchMethodEnum } from 'src/modules/social/entities/mention.entity.js';
import { previousMonth } from 'src/modules/venues/util/month.js';

import type {
	AdminOverviewOutputDto,
	AdminWorkflowRunOutputDto,
} from '../dto/admin-overview.output.dto.js';
import { nextMonthlyRunAt } from '../util/monthly-schedule.js';
import { errorText } from '../util/workflow-runs.js';

import { PIPELINE_WORKFLOWS } from './data-coverage.service.js';

// How many due follow-ups and suggestions the overview lists
const LIST_SIZE = 5;

/** A run as the overview names it */
export const workflowRunDto = (run: WorkflowStatus): AdminWorkflowRunOutputDto => {
	const error = errorText(run.error);
	return {
		workflowId: run.workflowID,
		workflow: run.workflowName,
		status: run.status,
		...(typeof run.attributes?.cityId === 'string' && { cityId: run.attributes.cityId }),
		...(typeof run.attributes?.period === 'string' && { period: run.attributes.period }),
		createdAt: new Date(run.createdAt),
		...(run.updatedAt && { updatedAt: new Date(run.updatedAt) }),
		...(error && { error }),
	};
};

// The month operations' workflows (`scrape-reviews.month`)
const MONTH_WORKFLOWS = PIPELINE_WORKFLOWS.filter(name => name.endsWith('.month'));

/** The figures `/admin` opens with, each read on its own so one failed query blanks only itself. */
@Injectable()
export class OverviewService {
	private readonly logger = new Logger(OverviewService.name);

	constructor(
		private readonly em: EntityManager,
		private readonly durable: DurableWorkflowsService,
		private readonly outreachService: OutreachService,
		private readonly prospectQueryService: ProspectQueryService,
	) {}

	async get(now = new Date()): Promise<AdminOverviewOutputDto> {
		const reportMonth = previousMonth(now);
		// Each on a fork: a failed query must not leave the shared entity manager in a bad state
		const settle = async <T>(name: string, read: (em: EntityManager) => Promise<T>) => {
			try {
				return await read(this.em.fork());
			} catch (e) {
				this.logger.warn(`Overview: ${name} failed: ${(e as Error).message}`);
				return null;
			}
		};
		// The newest run of these workflows, from DBOS
		const lastRun = async (workflowName: string[]) => {
			if (!this.durable.isLaunched()) return null;
			const [run] = await this.durable.list({ workflowName, sortDesc: true, limit: 1 });
			return run ? workflowRunDto(run) : null;
		};

		const [
			lastMonthlyRun,
			anyRun,
			apifyMonthCostUsd,
			reportsBuilt,
			unmatchedMentions,
			outreach,
			dueFollowUps,
			suggestedProspects,
		] = await Promise.all([
			settle('last monthly run', () => lastRun(MONTH_WORKFLOWS)),
			settle('last run', () => lastRun(PIPELINE_WORKFLOWS)),
			settle('Apify spend', async em => {
				const [{ total }]: { total: string | null }[] = await em
					.getConnection()
					.execute(
						`select sum(cost_usd) as total from apify_runs where created_at >= date_trunc('month', now() at time zone 'utc') at time zone 'utc'`,
					);
				return Number(total ?? 0);
			}),
			settle('reports built', em => em.count(Report, { month: reportMonth })),
			settle('unmatched mentions', em =>
				em.count(Mention, { matchMethod: MentionMatchMethodEnum.NONE }),
			),
			settle('outreach summary', () => this.outreachService.summary(now)),
			settle('due follow-ups', async () =>
				(await this.prospectQueryService.due(LIST_SIZE, now)).map(prospectItem),
			),
			settle('suggested prospects', async () =>
				(await this.prospectQueryService.suggested(LIST_SIZE)).map(suggestedProspect),
			),
		]);

		return {
			reportMonth,
			lastMonthlyRun,
			lastRun: anyRun,
			nextMonthlyRunAt: nextMonthlyRunAt(now),
			apifyMonthCostUsd,
			apifyMonthlyCreditUsd: APIFY_MONTHLY_CREDIT_USD,
			reportsBuilt,
			unmatchedMentions,
			outreach,
			dueFollowUps,
			suggestedProspects,
		};
	}
}
