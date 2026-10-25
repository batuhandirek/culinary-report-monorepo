import { wrap } from '@mikro-orm/core';

import { Controller, UseGuards } from '@nestjs/common';

import { TypedRoute } from '@nestia/core';

import { UserRoleEnum } from 'src/modules/auth/constants/user-role.enum.constant.js';
import { Roles } from 'src/modules/auth/decorators/roles.decorator.js';
import { AuthenticationGuard } from 'src/modules/auth/guards/authentication.guard.js';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard.js';

import {
	AdminBacklogRunOutputDto,
	AdminLlmBacklogsOutputDto,
	AdminRunLlmBacklogsOutputDto,
} from '../dto/admin-llm-backlog.output.dto.js';
import { LlmBacklogService } from '../services/llm-backlog.service.js';

@Controller('/admin/llm-backlogs')
@UseGuards(AuthenticationGuard, RolesGuard)
@Roles(UserRoleEnum.ADMIN)
export class AdminLlmBacklogsController {
	constructor(private readonly llmBacklogService: LlmBacklogService) {}

	/** Every registered LLM backlog in run order: what is left, the last seven days, the newest run */
	@TypedRoute.Get('/')
	async listLlmBacklogs(): Promise<AdminLlmBacklogsOutputDto> {
		const status = await this.llmBacklogService.status();
		return {
			dailyTokens: status.dailyTokens,
			spentToday: status.spentToday,
			items: status.backlogs.map(backlog => ({
				key: backlog.key,
				label: backlog.label,
				priority: backlog.priority,
				remaining: backlog.remaining ?? undefined,
				doneLast7Days: backlog.doneLast7Days,
				tokensLast7Days: backlog.tokensLast7Days,
				lastMovedAt: backlog.lastMovedAt,
				lastRun:
					backlog.lastRun ?
						(wrap(backlog.lastRun).serialize({ skipNull: true }) as unknown as AdminBacklogRunOutputDto)
					:	undefined,
			})),
		};
	}

	/** Queues the daily drain now; it goes on within what is left of today's budget */
	@TypedRoute.Post('/run')
	async runLlmBacklogs(): Promise<AdminRunLlmBacklogsOutputDto> {
		await this.llmBacklogService.queue('admin');
		return { queued: true };
	}
}
