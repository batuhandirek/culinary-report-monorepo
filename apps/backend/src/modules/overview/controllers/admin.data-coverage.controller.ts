import { Controller, UseGuards } from '@nestjs/common';

import { TypedQuery, TypedRoute } from '@nestia/core';

import { UserRoleEnum } from 'src/modules/auth/constants/user-role.enum.constant.js';
import { Roles } from 'src/modules/auth/decorators/roles.decorator.js';
import { AuthenticationGuard } from 'src/modules/auth/guards/authentication.guard.js';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard.js';

import { AdminDataCoverageOutputDto, AdminGetDataCoverageInputDto } from '../dto/admin-data-coverage.dto.js';
import { DataCoverageService } from '../services/data-coverage.service.js';

@Controller('/admin/data-coverage')
@UseGuards(AuthenticationGuard, RolesGuard)
@Roles(UserRoleEnum.ADMIN)
export class AdminDataCoverageController {
	constructor(private readonly dataCoverageService: DataCoverageService) {}

	/** Each month of a city: what every monthly step did and what is stored, newest first. */
	@TypedRoute.Get()
	async getDataCoverage(@TypedQuery() query: AdminGetDataCoverageInputDto): Promise<AdminDataCoverageOutputDto> {
		return this.dataCoverageService.coverage(query.cityId, query.months ?? 6);
	}
}
