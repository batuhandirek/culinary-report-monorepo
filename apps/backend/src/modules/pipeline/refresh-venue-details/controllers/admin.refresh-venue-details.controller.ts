import { Controller, UseGuards } from '@nestjs/common';

import { TypedParam, TypedRoute } from '@nestia/core';
import { tags } from 'typia';

import { UserRoleEnum } from 'src/modules/auth/constants/user-role.enum.constant.js';
import { Roles } from 'src/modules/auth/decorators/roles.decorator.js';
import { AuthenticationGuard } from 'src/modules/auth/guards/authentication.guard.js';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard.js';
import { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';
import { VenueScrapeService } from 'src/modules/venues/services/venue-scrape.service.js';

import { REFRESH_VENUE_DETAILS_MONTH } from '../constants/refresh-venue-details.constant.js';
import type { AdminVenueRefreshOutputDto } from '../dto/admin-venue-refresh.output.dto.js';
import { VENUE_DETAILS_REFRESH_QUEUE } from '../queues/refresh-venue-details.queue.js';
import { RefreshVenueDetailsWorkflow } from '../workflows/refresh-venue-details.workflow.js';

@Controller('/admin/venues')
@UseGuards(AuthenticationGuard, RolesGuard)
@Roles(UserRoleEnum.ADMIN)
export class AdminRefreshVenueDetailsController {
	constructor(
		private readonly durable: DurableWorkflowsService,
		private readonly venueScrapeService: VenueScrapeService,
		private readonly workflow: RefreshVenueDetailsWorkflow,
	) {}

	/**
	 * "Refresh from Google": starts the venue's detail-page run (`refresh-venue-details.venue`, under
	 * a cent and half a minute; one in flight per venue) and answers its run, which the page follows
	 * until it ends. `high`: an admin waits on it, so its actor run passes the pipeline's.
	 */
	@TypedRoute.Post('/:id/refresh')
	async refreshVenue(@TypedParam('id') id: string & tags.Format<'uuid'>): Promise<AdminVenueRefreshOutputDto> {
		const target = await this.venueScrapeService.detailsTarget(id);
		const handle = await this.durable.start(this.workflow.venue, [id], {
			queue: VENUE_DETAILS_REFRESH_QUEUE,
			dedupe: id,
			onDuplicate: 'return-existing',
			priority: 'high',
			attributes: { cityId: target.cityId, purpose: REFRESH_VENUE_DETAILS_MONTH.operation },
		});
		return { workflowId: handle.workflowID };
	}
}
