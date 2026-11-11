import { Controller, UseGuards } from '@nestjs/common';

import { TypedParam, TypedQuery, TypedRoute } from '@nestia/core';
import { tags } from 'typia';

import { UserRoleEnum } from 'src/modules/auth/constants/user-role.enum.constant.js';
import { Roles } from 'src/modules/auth/decorators/roles.decorator.js';
import { AuthenticationGuard } from 'src/modules/auth/guards/authentication.guard.js';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard.js';
import { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';
import { AccountWatchService } from 'src/modules/social/services/account-watch.service.js';
import { previousMonth } from 'src/modules/venues/util/month.js';

import { ReportBrandsService } from '../../shared/services/report-brands.service.js';
import {
	AdminCreatorScrapeOutputDto,
	AdminCreatorWatchInputDto,
	AdminCreatorWatchOutputDto,
} from '../dto/admin-creator-watch.dto.js';
import { CREATOR_SCRAPE_QUEUE } from '../queues/creator-watch.queue.js';
import { CreatorWatchWorkflow } from '../workflows/creator-watch.workflow.js';

/**
 * Why a creator's profiles are scraped (the creator page's "Watched" panel). In the pipeline
 * because the watch list depends on the month's report brands, which outreach's won prospects
 * decide and social cannot read.
 */
@Controller('/admin/creators')
@UseGuards(AuthenticationGuard, RolesGuard)
@Roles(UserRoleEnum.ADMIN)
export class AdminCreatorWatchController {
	constructor(
		private readonly reportBrands: ReportBrandsService,
		private readonly accountWatchService: AccountWatchService,
		private readonly durable: DurableWorkflowsService,
		private readonly workflow: CreatorWatchWorkflow,
	) {}

	@TypedRoute.Get('/:id/watch')
	async getCreatorWatch(
		@TypedParam('id') id: string & tags.Format<'uuid'>,
		@TypedQuery() query: AdminCreatorWatchInputDto,
	): Promise<AdminCreatorWatchOutputDto> {
		const month = query.month ?? previousMonth();
		const accounts = await this.accountWatchService.forCreator(id, month, city =>
			this.reportBrands.of(city, month),
		);
		return { month, accounts };
	}

	/**
	 * "Scrape now": their profiles read now (`creator-watch.creator`, a few cents; one in flight
	 * per creator), the run to follow. `high`: an admin waits on it, so its actor runs pass the
	 * pipeline's. A creator without a TikTok or Instagram profile has no run.
	 */
	@TypedRoute.Post('/:id/scrape')
	async scrapeCreator(
		@TypedParam('id') id: string & tags.Format<'uuid'>,
	): Promise<AdminCreatorScrapeOutputDto> {
		const found = await this.accountWatchService.creatorTargets(id);
		if (!found) return {};
		const handle = await this.durable.start(this.workflow.creator, [id], {
			queue: CREATOR_SCRAPE_QUEUE,
			dedupe: id,
			onDuplicate: 'return-existing',
			priority: 'high',
			attributes: { cityId: found.cityId, purpose: 'creator-watch' },
		});
		return { workflowId: handle.workflowID };
	}
}
