import { Controller, UseGuards } from '@nestjs/common';

import { TypedQuery, TypedRoute } from '@nestia/core';

import { UserRoleEnum } from 'src/modules/auth/constants/user-role.enum.constant.js';
import { Roles } from 'src/modules/auth/decorators/roles.decorator.js';
import { AuthenticationGuard } from 'src/modules/auth/guards/authentication.guard.js';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard.js';

import { AdminGetTrendsInputDto, AdminTrendsOutputDto } from '../dto/admin-trends.dto.js';
import { TrendService } from '../services/trend.service.js';

@Controller('/admin/trends')
@UseGuards(AuthenticationGuard, RolesGuard)
@Roles(UserRoleEnum.ADMIN)
export class AdminTrendsController {
	constructor(private readonly trendService: TrendService) {}

	/** The city's cuisines, dishes, districts, creators and rising venues for a month, as shares. */
	@TypedRoute.Get('/')
	async getTrends(@TypedQuery() query: AdminGetTrendsInputDto): Promise<AdminTrendsOutputDto> {
		return this.trendService.month(query.month, query.cityId);
	}
}
