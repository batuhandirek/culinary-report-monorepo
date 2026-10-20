import { QueryOrder, wrap } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable, Logger } from '@nestjs/common';

import { APIFY_MONTHLY_CREDIT_USD } from 'src/modules/apify/constants/apify.constant.js';
import { OutreachService } from 'src/modules/outreach/services/outreach.service.js';
import { ProspectQueryService } from 'src/modules/outreach/services/prospect-query.service.js';
import { prospectItem, suggestedProspect } from 'src/modules/outreach/util/prospect-output.js';
import { PipelineStepEnum } from 'src/modules/pipeline/constants/pipeline.constant.js';
import type { AdminPipelineRunOutputDto } from 'src/modules/pipeline/dto/admin-pipeline.output.dto.js';
import { PipelineRun } from 'src/modules/pipeline/entities/pipeline-run.entity.js';
import { nextMonthlyRunAt } from 'src/modules/pipeline/util/monthly-schedule.js';
import { Report } from 'src/modules/reports/entities/report.entity.js';
import { Mention, MentionMatchMethodEnum } from 'src/modules/social/entities/mention.entity.js';
import { previousMonth } from 'src/modules/venues/util/month.js';

import type { AdminOverviewOutputDto } from '../dto/admin-overview.output.dto.js';

// How many due follow-ups and suggestions the overview lists
const LIST_SIZE = 5;

const serializeRun = (run: PipelineRun | null) =>
	run ?
		(wrap(run).serialize({
			skipNull: true,
			forceObject: true,
			populate: ['city'],
		}) as unknown as AdminPipelineRunOutputDto)
	:	null;

/** The figures `/admin` opens with, each read on its own so one failed query blanks only itself. */
@Injectable()
export class OverviewService {
	private readonly logger = new Logger(OverviewService.name);

	constructor(
		private readonly em: EntityManager,
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
		const lastRun = (em: EntityManager, step?: PipelineStepEnum) =>
			em
				.find(PipelineRun, step ? { step } : {}, {
					orderBy: { createdAt: QueryOrder.DESC },
					limit: 1,
					populate: ['city'],
				})
				.then(([run]) => serializeRun(run ?? null));

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
			settle('last monthly run', em => lastRun(em, PipelineStepEnum.MONTHLY)),
			settle('last run', em => lastRun(em)),
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
