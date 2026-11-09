import { Controller, UseGuards } from '@nestjs/common';

import { TypedParam, TypedQuery, TypedRoute } from '@nestia/core';
import { tags } from 'typia';

import { UserRoleEnum } from 'src/modules/auth/constants/user-role.enum.constant.js';
import { Roles } from 'src/modules/auth/decorators/roles.decorator.js';
import { AuthenticationGuard } from 'src/modules/auth/guards/authentication.guard.js';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard.js';
import { AccountWatchService } from 'src/modules/social/services/account-watch.service.js';
import { previousMonth } from 'src/modules/venues/util/month.js';

import { ReportBrandsService } from '../../shared/services/report-brands.service.js';
import {
	AdminCreatorWatchInputDto,
	AdminCreatorWatchOutputDto,
} from '../dto/admin-creator-watch.dto.js';

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
}
