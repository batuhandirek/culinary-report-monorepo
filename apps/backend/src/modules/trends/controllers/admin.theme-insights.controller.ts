import { Controller, UseGuards } from '@nestjs/common';

import { TypedParam, TypedQuery, TypedRoute } from '@nestia/core';

import { UserRoleEnum } from 'src/modules/auth/constants/user-role.enum.constant.js';
import { Roles } from 'src/modules/auth/decorators/roles.decorator.js';
import { AuthenticationGuard } from 'src/modules/auth/guards/authentication.guard.js';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard.js';

import {
	AdminGetThemeInsightInputDto,
	AdminGetThemeInsightsInputDto,
	AdminThemeInsightOutputDto,
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
	async getThemeInsights(
		@TypedQuery() query: AdminGetThemeInsightsInputDto,
	): Promise<AdminThemeInsightsOutputDto> {
		return this.themeInsightService.city(query.cityId, query.month, query.food);
	}

	/**
	 * One feedback theme in the city's month: its complaints, praise and noticed changes, the picked
	 * side over six months, where it came up, by dish and by kind of food, the numbers its points
	 * state, and the sentences filed under it with their review or post, narrowed by the filters.
	 */
	@TypedRoute.Get('/:theme')
	async getThemeInsight(
		@TypedParam('theme') theme: string,
		@TypedQuery() query: AdminGetThemeInsightInputDto,
	): Promise<AdminThemeInsightOutputDto> {
		const insight = await this.themeInsightService.theme(query.cityId, query.month, theme, {
			side: query.side ?? 'complaints',
			kind: query.kind,
			brandId: query.brandId,
			dish: query.dish,
			food: query.food,
			offset: query.offset ?? 0,
			limit: query.limit ?? 50,
		});
		return insight as AdminThemeInsightOutputDto;
	}
}
