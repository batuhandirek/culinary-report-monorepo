import { Controller, UseGuards } from '@nestjs/common';

import { TypedRoute } from '@nestia/core';

import { UserRoleEnum } from 'src/modules/auth/constants/user-role.enum.constant.js';
import { Roles } from 'src/modules/auth/decorators/roles.decorator.js';
import { AuthenticationGuard } from 'src/modules/auth/guards/authentication.guard.js';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard.js';

import { AdminOverviewOutputDto } from '../dto/admin-overview.output.dto.js';
import { AdminTodayOutputDto } from '../dto/admin-today.dto.js';
import { OverviewService } from '../services/overview.service.js';
import { TodayService } from '../services/today.service.js';

@Controller('/admin/overview')
@UseGuards(AuthenticationGuard, RolesGuard)
@Roles(UserRoleEnum.ADMIN)
export class AdminOverviewController {
	constructor(
		private readonly overviewService: OverviewService,
		private readonly todayService: TodayService,
	) {}

	/** The last run, the month's spend and reports, and who to write to today. */
	@TypedRoute.Get()
	async getAdminOverview(): Promise<AdminOverviewOutputDto> {
		return this.overviewService.get();
	}

	/** What is waiting on an admin, counted, each with the page where it is done. */
	@TypedRoute.Get('/today')
	async getAdminToday(): Promise<AdminTodayOutputDto> {
		return this.todayService.today();
	}
}
