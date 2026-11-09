import { Controller, UseGuards } from '@nestjs/common';

import { TypedBody, TypedRoute } from '@nestia/core';

import { UserRoleEnum } from 'src/modules/auth/constants/user-role.enum.constant.js';
import { Roles } from 'src/modules/auth/decorators/roles.decorator.js';
import { AuthenticationGuard } from 'src/modules/auth/guards/authentication.guard.js';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard.js';
import { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';

import {
	AdminBackfillReviewsInputDto,
	AdminBackfillReviewsOutputDto,
} from '../dto/admin-backfill-reviews.dto.js';
import { BACKFILL_REVIEWS_QUEUE } from '../queues/backfill-reviews.queue.js';
import { BackfillReviewsWorkflow } from '../workflows/backfill-reviews.workflow.js';

/**
 * Starts a city-wide review backfill: one run per city and start day (`backfill-reviews.run-<city>-<since>`),
 * so asking again hands back the same run; a stopped one is resumed on `/admin/workflows`.
 */
@Controller('/admin/backfill-reviews')
@UseGuards(AuthenticationGuard, RolesGuard)
@Roles(UserRoleEnum.ADMIN)
export class AdminBackfillReviewsController {
	constructor(
		private readonly durable: DurableWorkflowsService,
		private readonly workflow: BackfillReviewsWorkflow,
	) {}

	@TypedRoute.Post()
	async startBackfill(
		@TypedBody() body: AdminBackfillReviewsInputDto,
	): Promise<AdminBackfillReviewsOutputDto> {
		const since = body.since ?? `${new Date().toISOString().slice(0, 7)}-01`;
		const workflowId = `backfill-reviews.run-${body.cityId}-${since}`;
		await this.durable.start(
			this.workflow.run,
			[body.cityId, { since, talkedDays: body.talkedDays ?? 90, budgetUsd: body.budgetUsd }],
			{
				queue: BACKFILL_REVIEWS_QUEUE,
				workflowId,
				attributes: { cityId: body.cityId, purpose: 'backfill-reviews', period: since },
			},
		);
		return { workflowId };
	}
}
