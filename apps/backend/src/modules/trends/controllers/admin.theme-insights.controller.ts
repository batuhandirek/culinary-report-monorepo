import { Controller, UseGuards } from '@nestjs/common';

import { TypedQuery, TypedRoute } from '@nestia/core';

import { UserRoleEnum } from 'src/modules/auth/constants/user-role.enum.constant.js';
import { Roles } from 'src/modules/auth/decorators/roles.decorator.js';
import { AuthenticationGuard } from 'src/modules/auth/guards/authentication.guard.js';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard.js';

import {
	AdminGetThemeInsightsInputDto,
	AdminThemeInsightsOutputDto,
} from '../dto/admin-theme-insights.dto.js';
import { ThemeInsightService } from '../services/theme-insight.service.js';

@Controller('/admin/theme-insights')
@UseGuards(AuthenticationGuard, RolesGuard)
@Roles(UserRoleEnum.ADMIN)
export class AdminThemeInsightsController {
	constructor(private readonly themeInsightService: ThemeInsightService) {}

	/**
	 * What the city's reviews and posts praise and criticise this month, per feedback theme, across
	 * every venue, by kind of food; `food` narrows it to the brands of one.
	 */
	@TypedRoute.Get('/')
	async getThemeInsights(@TypedQuery() query: AdminGetThemeInsightsInputDto): Promise<AdminThemeInsightsOutputDto> {
		return this.themeInsightService.city(query.cityId, query.month, query.food);
	}
}
