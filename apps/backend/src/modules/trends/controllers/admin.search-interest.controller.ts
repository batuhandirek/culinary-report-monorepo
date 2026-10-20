import { Controller, UseGuards } from '@nestjs/common';

import { TypedQuery, TypedRoute } from '@nestia/core';

import { UserRoleEnum } from 'src/modules/auth/constants/user-role.enum.constant.js';
import { Roles } from 'src/modules/auth/decorators/roles.decorator.js';
import { AuthenticationGuard } from 'src/modules/auth/guards/authentication.guard.js';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard.js';

import {
	AdminGetSearchInterestInputDto,
	AdminSearchInterestOutputDto,
} from '../dto/admin-search-interest.dto.js';
import { SearchInterestService } from '../services/search-interest.service.js';

@Controller('/admin/trends/search-interest')
@UseGuards(AuthenticationGuard, RolesGuard)
@Roles(UserRoleEnum.ADMIN)
export class AdminSearchInterestController {
	constructor(private readonly searchInterestService: SearchInterestService) {}

	/**
	 * Google search interest per food topic over the twelve months up to `month`, next to its share
	 * of mentions, and per won venue: what the last `SEARCH_INTEREST` pull stored.
	 */
	@TypedRoute.Get('/')
	async getSearchInterest(
		@TypedQuery() query: AdminGetSearchInterestInputDto,
	): Promise<AdminSearchInterestOutputDto> {
		return this.searchInterestService.table(query.cityId, query.month);
	}
}
