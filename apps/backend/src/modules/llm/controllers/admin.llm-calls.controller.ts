import { QueryOrder, wrap } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';

import { Controller, UseGuards } from '@nestjs/common';

import { TypedQuery, TypedRoute } from '@nestia/core';

import { UserRoleEnum } from 'src/modules/auth/constants/user-role.enum.constant.js';
import { Roles } from 'src/modules/auth/decorators/roles.decorator.js';
import { AuthenticationGuard } from 'src/modules/auth/guards/authentication.guard.js';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard.js';

import {
	AdminListLlmCallsInputDto,
	AdminLlmSpendInputDto,
} from '../dto/admin-llm-calls.input.dto.js';
import {
	AdminListLlmCallsOutputDto,
	AdminLlmCallOutputDto,
	AdminLlmSpendOutputDto,
	AdminLlmSpendRowOutputDto,
} from '../dto/admin-llm-calls.output.dto.js';
import { LlmCall } from '../entities/llm-call.entity.js';
import { LlmCallsService } from '../services/llm-calls.service.js';

const utcDay = (day: string): Date => new Date(`${day}T00:00:00.000Z`);

/** What the LLM calls cost: the ledger summed as asked, and the calls themselves. */
@Controller('/admin/llm')
@UseGuards(AuthenticationGuard, RolesGuard)
@Roles(UserRoleEnum.ADMIN)
export class AdminLlmCallsController {
	constructor(
		private readonly em: EntityManager,
		private readonly llmCallsService: LlmCallsService,
	) {}

	/** The LLM call ledger summed by agent, model, provider, day, city, purpose or workflow */
	@TypedRoute.Get('/spend')
	async llmSpend(@TypedQuery() query: AdminLlmSpendInputDto): Promise<AdminLlmSpendOutputDto> {
		const now = new Date();
		const from =
			query.from ?
				utcDay(query.from)
			:	new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
		const to =
			query.to ?
				utcDay(query.to)
			:	new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
		const rows = await this.llmCallsService.llmSpend(from, to, query.groupBy);
		const total = rows.reduce<AdminLlmSpendRowOutputDto>(
			(sum, row) => ({
				key: 'total',
				calls: sum.calls + row.calls,
				failed: sum.failed + row.failed,
				inputTokens: sum.inputTokens + row.inputTokens,
				outputTokens: sum.outputTokens + row.outputTokens,
				cachedInputTokens: sum.cachedInputTokens + row.cachedInputTokens,
				usd: sum.usd + row.usd,
			}),
			{
				key: 'total',
				calls: 0,
				failed: 0,
				inputTokens: 0,
				outputTokens: 0,
				cachedInputTokens: 0,
				usd: 0,
			},
		);
		return { from, to, groupBy: query.groupBy, rows, total };
	}

	/** The calls themselves, newest first */
	@TypedRoute.Get('/calls')
	async listLlmCalls(
		@TypedQuery() query: AdminListLlmCallsInputDto,
	): Promise<AdminListLlmCallsOutputDto> {
		const [items, totalItems] = await this.em.findAndCount(
			LlmCall,
			{
				...(query.agentId && { agentId: query.agentId }),
				...(query.workflowId && { workflowId: query.workflowId }),
				...(query.cityId && { city: query.cityId }),
				...(query.purpose && { purpose: query.purpose }),
				...(query.failed && { ok: false }),
			},
			{
				populate: ['city'],
				orderBy: { createdAt: QueryOrder.DESC },
				offset: (query.page - 1) * query.size,
				limit: query.size,
			},
		);
		return {
			items: items.map(
				call =>
					wrap(call).serialize({
						skipNull: true,
						forceObject: true,
						populate: ['city'],
					}) as unknown as AdminLlmCallOutputDto,
			),
			totalItems,
			page: query.page,
			pageSize: query.size,
		};
	}
}
