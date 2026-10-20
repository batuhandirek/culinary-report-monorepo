import { QueryOrder, wrap } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';

import { Controller, UseGuards } from '@nestjs/common';

import { TypedBody, TypedQuery, TypedRoute } from '@nestia/core';

import { ApifyRun } from 'src/modules/apify/entities/apify-run.entity.js';
import { UserRoleEnum } from 'src/modules/auth/constants/user-role.enum.constant.js';
import { Roles } from 'src/modules/auth/decorators/roles.decorator.js';
import { AuthenticationGuard } from 'src/modules/auth/guards/authentication.guard.js';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard.js';

import {
	AdminApifyRunOutputDto,
	AdminFillCompetitorsInputDto,
	AdminFillCompetitorsOutputDto,
	AdminListApifyRunsInputDto,
	AdminListApifyRunsOutputDto,
	AdminListPipelineRunsInputDto,
	AdminListPipelineRunsOutputDto,
	AdminPipelineRunOutputDto,
	AdminStartPipelineRunInputDto,
} from '../dto/admin-pipeline.output.dto.js';
import { PipelineRun } from '../entities/pipeline-run.entity.js';
import { PipelineService } from '../services/pipeline.service.js';

const runDto = (run: PipelineRun) =>
	wrap(run).serialize({
		skipNull: true,
		forceObject: true,
		populate: ['city'],
	}) as unknown as AdminPipelineRunOutputDto;

@Controller('/admin')
@UseGuards(AuthenticationGuard, RolesGuard)
@Roles(UserRoleEnum.ADMIN)
export class AdminPipelineController {
	constructor(
		private readonly em: EntityManager,
		private readonly pipelineService: PipelineService,
	) {}

	@TypedRoute.Get('/pipeline-runs')
	async listPipelineRuns(
		@TypedQuery() query: AdminListPipelineRunsInputDto,
	): Promise<AdminListPipelineRunsOutputDto> {
		const [items, totalItems] = await this.em.findAndCount(
			PipelineRun,
			query.cityId ? { city: query.cityId } : {},
			{
				populate: ['city'],
				orderBy: { createdAt: QueryOrder.DESC },
				offset: (query.page - 1) * query.size,
				limit: query.size,
			},
		);
		return {
			items: items.map(run => runDto(run)),
			totalItems,
			page: query.page,
			pageSize: query.size,
		};
	}

	/** Queues a step (or the whole monthly run). It runs in the background, one run at a time. */
	@TypedRoute.Post('/pipeline-runs')
	async startPipelineRun(
		@TypedBody() body: AdminStartPipelineRunInputDto,
	): Promise<AdminPipelineRunOutputDto> {
		const run = await this.pipelineService.queue(body.cityId, body.step, body.month, {
			budgetUsd: body.budgetUsd,
			top: body.top,
			since: body.since,
			onlyMissing: body.onlyMissing,
		});
		return runDto(run);
	}

	/** Fills competitors for the month's report venues that have none. Free: SQL only. */
	@TypedRoute.Post('/pipeline/fill-competitors')
	async fillCompetitors(
		@TypedBody() body: AdminFillCompetitorsInputDto,
	): Promise<AdminFillCompetitorsOutputDto> {
		return this.pipelineService.fillCompetitors(body.cityId, body.month, body.top);
	}

	@TypedRoute.Get('/apify-runs')
	async listApifyRuns(
		@TypedQuery() query: AdminListApifyRunsInputDto,
	): Promise<AdminListApifyRunsOutputDto> {
		const [items, totalItems] = await this.em.findAndCount(
			ApifyRun,
			{},
			{
				orderBy: { createdAt: QueryOrder.DESC },
				offset: (query.page - 1) * query.size,
				limit: query.size,
			},
		);
		const [{ total }]: { total: string | null }[] = await this.em
			.getConnection()
			.execute(
				`select sum(cost_usd) as total from apify_runs where created_at >= date_trunc('month', now())`,
			);
		return {
			items: items.map(
				run =>
					wrap(run).serialize({
						skipNull: true,
						forceObject: true,
					}) as unknown as AdminApifyRunOutputDto,
			),
			totalItems,
			page: query.page,
			pageSize: query.size,
			monthCostUsd: Number(total ?? 0),
		};
	}
}
