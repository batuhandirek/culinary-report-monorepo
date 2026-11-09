import { Controller, UseGuards } from '@nestjs/common';

import { TypedBody, TypedRoute } from '@nestia/core';

import { UserRoleEnum } from 'src/modules/auth/constants/user-role.enum.constant.js';
import { Roles } from 'src/modules/auth/decorators/roles.decorator.js';
import { AuthenticationGuard } from 'src/modules/auth/guards/authentication.guard.js';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard.js';
import { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';

import { AdminReflagOpeningsInputDto } from '../dto/admin-opening-flags.input.dto.js';
import { AdminReflagOpeningsOutputDto } from '../dto/admin-opening-flags.output.dto.js';
import { ReflagOpeningsWorkflow } from '../workflows/reflag-openings.workflow.js';

const DEFAULT_LIMIT = 100;

@Controller('/admin/mentions')
@UseGuards(AuthenticationGuard, RolesGuard)
@Roles(UserRoleEnum.ADMIN)
export class AdminReflagOpeningsController {
	constructor(
		private readonly durable: DurableWorkflowsService,
		private readonly workflow: ReflagOpeningsWorkflow,
	) {}

	/**
	 * Reads a month's stored posts again for the "just opened" flag only
	 * (`ReflagOpeningsWorkflow.reflagPage`, a workflow it awaits): sets `isNewOpening` on the
	 * mentions already stored, adds none, and leaves matches and admins' corrections as they are.
	 * Most viewed first, `limit` posts a call (LLM allowance, ~3,000 tokens a post); call again
	 * with `nextOffset` until `remaining` is zero. `high`: the admin waits on the request, so the
	 * page's agent calls pass the pipeline's on the `llm` queue.
	 */
	@TypedRoute.Post('/reflag-openings')
	async reflagOpenings(
		@TypedBody() body: AdminReflagOpeningsInputDto,
	): Promise<AdminReflagOpeningsOutputDto> {
		const offset = body.offset ?? 0;
		const page = {
			month: body.month,
			cityId: body.cityId,
			analysedBefore: body.analysedBefore,
			onlyFlagged: body.onlyFlagged,
			limit: body.limit ?? DEFAULT_LIMIT,
			offset,
		};
		const res =
			this.durable.isLaunched() ?
				await (
					await this.durable.start(this.workflow.reflagPage, [page], {
						priority: 'high',
						attributes: { purpose: 'reflag-openings' },
					})
				).getResult()
			:	await this.workflow.reflagPage(page);
		const nextOffset = offset + res.posts;
		return {
			read: res.read,
			failed: res.failed,
			flaggedMentions: res.flaggedMentions,
			flaggedPosts: res.flaggedPosts,
			cleared: res.cleared,
			unpaired: res.unpaired,
			tokens: res.tokens,
			nextOffset,
			remaining: Math.max(0, res.total - nextOffset),
		};
	}
}
