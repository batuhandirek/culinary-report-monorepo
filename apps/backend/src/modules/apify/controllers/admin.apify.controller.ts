import { QueryOrder, wrap } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';

import { Controller, UseGuards } from '@nestjs/common';

import { TypedQuery, TypedRoute } from '@nestia/core';

import { UserRoleEnum } from 'src/modules/auth/constants/user-role.enum.constant.js';
import { Roles } from 'src/modules/auth/decorators/roles.decorator.js';
import { AuthenticationGuard } from 'src/modules/auth/guards/authentication.guard.js';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard.js';

import {
	AdminApifyCreditOutputDto,
	AdminApifyCreditWakeOutputDto,
	AdminApifyRunOutputDto,
	AdminListApifyRunsInputDto,
	AdminListApifyRunsOutputDto,
} from '../dto/admin-apify-run.dto.js';
import { ApifyRun } from '../entities/apify-run.entity.js';
import { ApifyService } from '../services/apify.service.js';

/** Every paid actor run, newest first (the Data page's Apify costs), and the account as Apify reports it now (the Money page) */
@Controller('/admin')
@UseGuards(AuthenticationGuard, RolesGuard)
@Roles(UserRoleEnum.ADMIN)
export class AdminApifyController {
	constructor(
		private readonly em: EntityManager,
		private readonly apifyService: ApifyService,
	) {}

	/** The account now: read from Apify's API on every call, our running runs' caps counted as spent, and the runs waiting for credit */
	@TypedRoute.Get('/apify-credit')
	async getApifyCredit(): Promise<AdminApifyCreditOutputDto> {
		const [credit, waiters] = await Promise.all([
			this.apifyService.credit(),
			this.apifyService.creditWaiters(),
		]);
		return {
			...credit,
			waiting: waiters
				.sort((a, b) => a.since.localeCompare(b.since))
				.map(w => ({
					workflowId: w.workflowId,
					needUsd: w.needUsd,
					purpose: w.purpose,
					since: new Date(w.since),
				})),
		};
	}

	/** After buying credit or raising the limit: wakes the waiting runs the account covers now */
	@TypedRoute.Post('/apify-credit/wake')
	async wakeApifyCreditWaiters(): Promise<AdminApifyCreditWakeOutputDto> {
		return this.apifyService.wakeCreditWaiters();
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
