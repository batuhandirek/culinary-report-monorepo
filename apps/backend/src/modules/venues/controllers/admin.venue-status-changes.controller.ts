import { Controller, UseGuards } from '@nestjs/common';

import { TypedQuery, TypedRoute } from '@nestia/core';

import { UserRoleEnum } from 'src/modules/auth/constants/user-role.enum.constant.js';
import { Roles } from 'src/modules/auth/decorators/roles.decorator.js';
import { AuthenticationGuard } from 'src/modules/auth/guards/authentication.guard.js';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard.js';

import {
	AdminGetVenueStatusChangesInputDto,
	AdminVenueStatusChangesOutputDto,
} from '../dto/admin-venue-status-changes.output.dto.js';
import { VenueStatusChangeService } from '../services/venue-status-change.service.js';

@Controller('/admin/venue-status-changes')
@UseGuards(AuthenticationGuard, RolesGuard)
@Roles(UserRoleEnum.ADMIN)
export class AdminVenueStatusChangesController {
	constructor(private readonly venueStatusChangeService: VenueStatusChangeService) {}

	/** The city's openings and closures in the three months ending with `month`, by district and food. */
	@TypedRoute.Get('/')
	async getVenueStatusChanges(
		@TypedQuery() query: AdminGetVenueStatusChangesInputDto,
	): Promise<AdminVenueStatusChangesOutputDto> {
		return this.venueStatusChangeService.quarter(query.cityId, query.month);
	}
}
