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

import { SCRAPE_DELIVERY_MONTH } from '../constants/scrape-delivery.constant.js';
import type { AdminSearchBrandMenusInputDto } from '../dto/admin-brand-menu-search.input.dto.js';
import type { AdminBrandMenuSearchOutputDto } from '../dto/admin-brand-menu-search.output.dto.js';
import { SCRAPE_DELIVERY_BRAND_QUEUE } from '../queues/scrape-delivery.queue.js';
import { ScrapeDeliveryWorkflow } from '../workflows/scrape-delivery.workflow.js';

@Controller('/admin/brands')
@UseGuards(AuthenticationGuard, RolesGuard)
@Roles(UserRoleEnum.ADMIN)
export class AdminScrapeDeliveryController {
	constructor(
		private readonly durable: DurableWorkflowsService,
		private readonly brandService: BrandService,
		private readonly cityService: CityService,
		private readonly workflow: ScrapeDeliveryWorkflow,
	) {}

	/**
	 * "Find menus": starts the search and read of the brand's pages on the delivery platforms in the
	 * city (`scrape-delivery.brand`, a few cents and a minute or two; one in flight per brand and
	 * city) and answers its run, which the page follows until it ends. `high`: an admin waits on it,
	 * so its actor runs pass the pipeline's on the `apify` queue.
	 */
	@TypedRoute.Post('/:id/menu-searches')
	async searchBrandMenus(
		@TypedParam('id') id: string & tags.Format<'uuid'>,
		@TypedBody() body: AdminSearchBrandMenusInputDto,
	): Promise<AdminBrandMenuSearchOutputDto> {
		await this.brandService.get(id);
		await this.cityService.getById(body.cityId);
		const handle = await this.durable.start(this.workflow.brand, [id, body.cityId], {
			queue: SCRAPE_DELIVERY_BRAND_QUEUE,
			dedupe: `${id}:${body.cityId}`,
			onDuplicate: 'return-existing',
			priority: 'high',
			attributes: { cityId: body.cityId, purpose: SCRAPE_DELIVERY_MONTH.operation },
		});
		return { workflowId: handle.workflowID };
	}
}
