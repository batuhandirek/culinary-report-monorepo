import { wrap } from '@mikro-orm/core';

import { BadRequestException, Controller, UseGuards } from '@nestjs/common';

import { TypedBody, TypedParam, TypedQuery, TypedRoute } from '@nestia/core';

import { UserRoleEnum } from 'src/modules/auth/constants/user-role.enum.constant.js';
import { Roles } from 'src/modules/auth/decorators/roles.decorator.js';
import { AuthenticationGuard } from 'src/modules/auth/guards/authentication.guard.js';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard.js';

import {
	AdminDishNamesOutputDto,
	AdminGetDishNamesInputDto,
	AdminUpdatedDishNameOutputDto,
	AdminUpdateDishNameInputDto,
} from '../dto/admin-dish-names.dto.js';
import { DishNameService } from '../services/dish-name.service.js';

const LIMIT = 50;

@Controller('/admin/dish-names')
@UseGuards(AuthenticationGuard, RolesGuard)
@Roles(UserRoleEnum.ADMIN)
export class AdminDishNamesController {
	constructor(private readonly dishNameService: DishNameService) {}

	/**
	 * The city's dish names with the food topic each points at, who decided it, and the agent's
	 * suggested topics for those without one (the Trends "Dish names" tab)
	 */
	@TypedRoute.Get('/')
	async getDishNames(
		@TypedQuery() query: AdminGetDishNamesInputDto,
	): Promise<AdminDishNamesOutputDto> {
		return this.dishNameService.list(query.cityId, {
			status: query.status,
			q: query.q,
			topicKey: query.topicKey,
			suggestion: query.suggestion,
			offset: query.offset ?? 0,
			limit: query.limit ?? LIMIT,
		});
	}

	/** An admin's topic for a name (or none, or back to automatic); its feedback rows follow at once */
	@TypedRoute.Patch('/:id')
	async updateDishName(
		@TypedParam('id') id: number,
		@TypedBody() body: AdminUpdateDishNameInputDto,
	): Promise<AdminUpdatedDishNameOutputDto> {
		if (body.auto && body.topicKey !== undefined)
			throw new BadRequestException('Give a topic or auto, not both');
		if (!body.auto && body.topicKey === undefined)
			throw new BadRequestException('Give a topic (null for none) or auto');
		const name = await this.dishNameService.change(
			id,
			body.auto ? { auto: true } : { topicKey: body.topicKey ?? null },
		);
		return wrap(name).serialize({
			skipNull: true,
			populate: ['foodTopic'],
			forceObject: true,
		}) as unknown as AdminUpdatedDishNameOutputDto;
	}
}
