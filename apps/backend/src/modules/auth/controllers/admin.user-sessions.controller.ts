import { FilterQuery, QueryOrder, SerializeOptions, wrap } from '@mikro-orm/core';

import { Controller, NotFoundException, UseGuards } from '@nestjs/common';

import { TypedParam, TypedQuery, TypedRoute } from '@nestia/core';

import { OkResponse } from 'src/shared/interfaces/ok-response.interface.js';

import { UserRoleEnum } from '../constants/user-role.enum.constant.js';
import { Roles } from '../decorators/roles.decorator.js';
import { AdminListSessionsInputDto } from '../dto/admin-list-sessions.input.dto.js';
import { AdminListSessionsOutputDto } from '../dto/admin-list-sessions.output.dto.js';
import { UserSession } from '../entities/user-session.entity.js';
import { AuthenticationGuard } from '../guards/authentication.guard.js';
import { RolesGuard } from '../guards/roles.guard.js';
import { UserSessionRepository } from '../repositories/user-session.repository.js';

@Controller('/admin/user-sessions')
export class AdminUserSessionsController {
	constructor(private readonly userSessionRepository: UserSessionRepository) {}

	@TypedRoute.Get('/')
	@UseGuards(AuthenticationGuard, RolesGuard)
	@Roles(UserRoleEnum.ADMIN)
	async listUserSessions(
		@TypedQuery() query: AdminListSessionsInputDto,
	): Promise<AdminListSessionsOutputDto> {
		const filters: FilterQuery<UserSession> = {};
		if (query.userId) filters.user = query.userId;
		if (query.platform) filters.platform = query.platform;
		if (query.activeOnly) filters.expiresAt = { $gt: new Date() };

		const sort = query.sort ?? 'lastSeenAt:desc';
		const [sortField, sortOrder] = sort.split(':');
		// Keep sessions that have never been seen (null lastSeenAt) at the bottom,
		// rather than Postgres' default of NULLS FIRST on DESC.
		const orderDir =
			sortOrder === 'asc' ? QueryOrder.ASC_NULLS_LAST : QueryOrder.DESC_NULLS_LAST;

		type PopulateKeys = 'user' | 'user.profileImage';
		const populate = ['user', 'user.profileImage'] as PopulateKeys[];

		const serializeOptions: SerializeOptions<UserSession, PopulateKeys> = {
			skipNull: true,
			forceObject: true,
			populate,
		};

		const [items, totalItems] = await this.userSessionRepository.findAndCount(filters, {
			offset: (query.page - 1) * query.size,
			limit: query.size,
			populate,
			orderBy: { [sortField]: orderDir } as any,
		});

		return {
			items: items.map(i => wrap(i).serialize(serializeOptions as any)) as any,
			totalItems,
			page: query.page,
			pageSize: query.size,
		};
	}

	@TypedRoute.Delete('/:id')
	@UseGuards(AuthenticationGuard, RolesGuard)
	@Roles(UserRoleEnum.ADMIN)
	async deleteUserSession(@TypedParam('id') id: string): Promise<OkResponse> {
		const res = await this.userSessionRepository.nativeDelete({ id });
		if (res !== 1) throw new NotFoundException();
		return { ok: true };
	}
}
