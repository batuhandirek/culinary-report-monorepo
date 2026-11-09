import { Controller, UseGuards } from '@nestjs/common';

import { TypedBody, TypedParam, TypedRoute } from '@nestia/core';
import { tags } from 'typia';

import { UserRoleEnum } from 'src/modules/auth/constants/user-role.enum.constant.js';
import { Roles } from 'src/modules/auth/decorators/roles.decorator.js';
import { AuthenticationGuard } from 'src/modules/auth/guards/authentication.guard.js';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard.js';
import { CityService } from 'src/modules/cities/services/city.service.js';
import { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';
import { BrandService } from 'src/modules/venues/services/brand.service.js';

import { BRAND_BRANCH_SEARCH_MONTH } from '../constants/brand-branch-search.constant.js';
import type { AdminSearchBrandInputDto } from '../dto/admin-brand-branch-search.input.dto.js';
import { BRAND_BRANCH_SEARCH_QUEUE } from '../queues/brand-branch-search.queue.js';
import { BrandBranchSearchWorkflow } from '../workflows/brand-branch-search.workflow.js';

@Controller('/admin/brands')
@UseGuards(AuthenticationGuard, RolesGuard)
@Roles(UserRoleEnum.ADMIN)
export class AdminBrandBranchSearchController {
	constructor(
		private readonly durable: DurableWorkflowsService,
		private readonly brandService: BrandService,
		private readonly cityService: CityService,
		private readonly workflow: BrandBranchSearchWorkflow,
	) {}

	/**
	 * "Find branches": starts the brand's search in the city (`brand-branch-search.brand`, about
	 * $0.20 and half a minute; one in flight per brand and city); `branchesSearchedAt` moves when
	 * it is done, which the page polls for. `high`: an admin waits on it, so its actor run passes
	 * the pipeline's on the `apify` queue.
	 */
	@TypedRoute.Post('/:id/searches')
	async searchBrandBranches(
		@TypedParam('id') id: string & tags.Format<'uuid'>,
		@TypedBody() body: AdminSearchBrandInputDto,
	): Promise<void> {
		await this.brandService.get(id);
		await this.cityService.getById(body.cityId);
		await this.durable.start(this.workflow.brand, [id, body.cityId], {
			queue: BRAND_BRANCH_SEARCH_QUEUE,
			dedupe: `${id}:${body.cityId}`,
			onDuplicate: 'return-existing',
			priority: 'high',
			attributes: { cityId: body.cityId, purpose: BRAND_BRANCH_SEARCH_MONTH.operation },
		});
	}
}
