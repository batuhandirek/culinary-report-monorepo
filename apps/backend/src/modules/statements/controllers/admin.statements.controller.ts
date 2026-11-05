import { wrap } from '@mikro-orm/core';

import { Controller, UseGuards } from '@nestjs/common';

import { TypedQuery, TypedRoute } from '@nestia/core';

import { UserRoleEnum } from 'src/modules/auth/constants/user-role.enum.constant.js';
import { Roles } from 'src/modules/auth/decorators/roles.decorator.js';
import { AuthenticationGuard } from 'src/modules/auth/guards/authentication.guard.js';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard.js';

import {
	AdminStatementRowOutputDto,
	AdminStatementsInputDto,
	AdminStatementsOutputDto,
	AdminStatementsScopeInputDto,
	AdminStatementsSummaryOutputDto,
	AdminWaitComplaintsInputDto,
	AdminWaitComplaintsOutputDto,
} from '../dto/admin-statements.dto.js';
import { STATEMENT_SOURCE_POPULATE, StatementService } from '../services/statement.service.js';
import { STATEMENT_PARTS_POPULATE } from '../util/statement-populate.js';

@Controller('/admin/statements')
@UseGuards(AuthenticationGuard, RolesGuard)
@Roles(UserRoleEnum.ADMIN)
export class AdminStatementsController {
	constructor(private readonly statementService: StatementService) {}

	/** A page of a scope's claims (a city's month, a brand's, a branch's), filtered, newest first or closest to `like`: the Claims tables */
	@TypedRoute.Get()
	async listStatements(
		@TypedQuery() query: AdminStatementsInputDto,
	): Promise<AdminStatementsOutputDto> {
		const { page, size, ...filters } = query;
		const { total, items, notEmbedded } = await this.statementService.list({
			...filters,
			offset: (page - 1) * size,
			limit: size,
		});
		const populate = [...STATEMENT_PARTS_POPULATE, ...STATEMENT_SOURCE_POPULATE] as const;
		return {
			totalItems: total,
			page,
			pageSize: size,
			notEmbedded,
			items: items.map(
				statement =>
					wrap(statement).serialize({
						skipNull: true,
						forceObject: true,
						populate: [...populate],
						exclude: [
							'review.venue.brand',
							'mention.brand.branches',
							'mention.venue.brand',
							'mention.post',
							'post.account.creator',
						],
					}) as unknown as AdminStatementRowOutputDto,
			),
		};
	}

	/** How a scope's claims (a city's, a brand's, a branch's; a month or all) were split and read: the Claims tables' figures */
	@TypedRoute.Get('/summary')
	async getStatementsSummary(
		@TypedQuery() query: AdminStatementsScopeInputDto,
	): Promise<AdminStatementsSummaryOutputDto> {
		return this.statementService.summary(query);
	}

	/** How many venues had a waiting complaint in the city's month, and how long the stated waits were */
	@TypedRoute.Get('/wait-complaints')
	async getWaitComplaints(
		@TypedQuery() query: AdminWaitComplaintsInputDto,
	): Promise<AdminWaitComplaintsOutputDto> {
		return this.statementService.waitComplaints(query.cityId, query.month);
	}
}
