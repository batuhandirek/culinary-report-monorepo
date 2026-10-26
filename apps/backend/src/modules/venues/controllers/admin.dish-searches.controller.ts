import { Controller, UseGuards } from '@nestjs/common';

import { TypedParam, TypedQuery, TypedRoute } from '@nestia/core';
import { tags } from 'typia';

import { UserRoleEnum } from 'src/modules/auth/constants/user-role.enum.constant.js';
import { Roles } from 'src/modules/auth/decorators/roles.decorator.js';
import { AuthenticationGuard } from 'src/modules/auth/guards/authentication.guard.js';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard.js';

import {
	AdminDishSearchesOutputDto,
	AdminGetDishSearchesInputDto,
	AdminVenueDishSearchesOutputDto,
} from '../dto/admin-dish-searches.dto.js';
import { DishSearchService } from '../services/dish-search.service.js';

@Controller('/admin')
@UseGuards(AuthenticationGuard, RolesGuard)
@Roles(UserRoleEnum.ADMIN)
export class AdminDishSearchesController {
	constructor(private readonly dishSearchService: DishSearchService) {}

	/** A dish's Google Maps top ten in each district of the city in one snapshot (`TRACK_DISH_SEARCHES`), the newest by default. */
	@TypedRoute.Get('/dish-searches')
	async getDishSearches(
		@TypedQuery() query: AdminGetDishSearchesInputDto,
	): Promise<AdminDishSearchesOutputDto> {
		return this.dishSearchService.forTopic(query.cityId, query.topicKey, query.searchedOn);
	}

	/** The dish searches a venue was in the top ten of, over its city's last six snapshots. */
	@TypedRoute.Get('/venues/:id/dish-searches')
	async getVenueDishSearches(
		@TypedParam('id') id: string & tags.Format<'uuid'>,
	): Promise<AdminVenueDishSearchesOutputDto> {
		return this.dishSearchService.forVenue(id);
	}
}
