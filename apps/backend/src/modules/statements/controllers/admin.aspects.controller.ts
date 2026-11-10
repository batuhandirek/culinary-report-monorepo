import { wrap } from '@mikro-orm/core';

import { Controller, UseGuards } from '@nestjs/common';

import { TypedQuery, TypedRoute } from '@nestia/core';

import { UserRoleEnum } from 'src/modules/auth/constants/user-role.enum.constant.js';
import { Roles } from 'src/modules/auth/decorators/roles.decorator.js';
import { AuthenticationGuard } from 'src/modules/auth/guards/authentication.guard.js';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard.js';

import type {
	AdminAspectOutputDto,
	AdminAspectsInputDto,
	AdminAspectsOutputDto,
} from '../dto/admin-aspects.dto.js';
import { AspectOverviewService } from '../services/aspect-overview.service.js';

/**
 * The aspects (what a claim is about at a place) with the city's claims under each: the Aspects
 * pages. Creating, editing and deleting one is `/admin/topics` (`TopicService`, the one writer).
 */
@Controller('/admin/aspects')
@UseGuards(AuthenticationGuard, RolesGuard)
@Roles(UserRoleEnum.ADMIN)
export class AdminAspectsController {
	constructor(private readonly aspectOverviewService: AspectOverviewService) {}

	/** Every aspect with its claims in the city: all time, per month of a twelve-month window, at itself */
	@TypedRoute.Get('/')
	async getAspects(@TypedQuery() query: AdminAspectsInputDto): Promise<AdminAspectsOutputDto> {
		const overview = await this.aspectOverviewService.overview(query.cityId, query.month);
		return {
			...overview,
			aspects: overview.aspects.map(({ topic, ...counts }) => ({
				...(wrap(topic).serialize({
					skipNull: true,
					forceObject: true,
				}) as unknown as AdminAspectOutputDto),
				...counts,
			})),
		};
	}
}
