import { FilterQuery, SerializeOptions, wrap } from '@mikro-orm/core';

import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';

import { TypedBody, TypedParam, TypedQuery, TypedRoute } from '@nestia/core';
import type { Response } from 'express';

import { OkResponse } from 'client';

import { AdminUserOutputDto } from 'src/modules/auth/dto/admin.user.output.dto.js';
import { csvEscape } from 'src/shared/util/csv.js';

import { UserRoleEnum } from '../constants/user-role.enum.constant.js';
import { AuthenticatedUserId } from '../decorators/authenticated-user-id.decorator.js';
import { Roles } from '../decorators/roles.decorator.js';
import { AdminExportUsersCsvInputDto } from '../dto/admin-export-users-csv.input.dto.js';
import { AdminListUsersInputDto } from '../dto/admin-list-users.input.dto.js';
import { AdminListUsersOutputDto } from '../dto/admin-list-users.output.dto.js';
import { AdminUpdateUserRolesInputDto } from '../dto/admin-update-user-roles.input.dto.js';
import { User } from '../entities/user.entity.js';
import { AuthenticationGuard } from '../guards/authentication.guard.js';
import { RolesGuard } from '../guards/roles.guard.js';
import { UserRepository } from '../repositories/user.repository.js';
import { UserService } from '../services/user.service.js';

@Controller('/admin/users')
export class AdminUsersController {
	constructor(
		private readonly userRepository: UserRepository,
		private readonly userService: UserService,
	) {}

	@Get('/export/csv')
	@UseGuards(AuthenticationGuard, RolesGuard)
	@Roles(UserRoleEnum.ADMIN)
	async exportUsersCsv(
		@Query() query: AdminExportUsersCsvInputDto,
		@Res() res: Response,
	): Promise<void> {
		const filters: FilterQuery<User> = {};
		if (query.roles?.length) filters.roles = { $overlap: query.roles };

		const users = await this.userRepository.find(filters, {
			orderBy: { createdAt: 'asc' },
		});

		const header = ['firstName', 'lastName', 'mobileNumber', 'email', 'createdAt'].join(',');

		const rows = users.map(u =>
			[
				csvEscape(u.firstName),
				csvEscape(u.lastName),
				csvEscape(u.mobileNumber),
				csvEscape(u.email),
				csvEscape(u.createdAt.toISOString()),
			].join(','),
		);

		const csv = [header, ...rows].join('\n');

		res.setHeader('Content-Type', 'text/csv; charset=utf-8');
		res.setHeader('Content-Disposition', 'attachment; filename="users.csv"');
		res.send(csv);
	}

	@TypedRoute.Get('/:id')
	@UseGuards(AuthenticationGuard, RolesGuard)
	@Roles(UserRoleEnum.ADMIN)
	async getUser(@TypedParam('id') id: string): Promise<AdminUserOutputDto> {
		type PopulateKeys = 'profileImage';
		const options = {
			populate: ['profileImage'] as PopulateKeys[],
		};

		const serializeOptions: SerializeOptions<User, PopulateKeys> = {
			skipNull: true,
			populate: options.populate,
			forceObject: true,
		};

		const user = await this.userRepository.findOneOrFail({ id }, options);
		return wrap(user).serialize(serializeOptions) as AdminUserOutputDto;
	}

	@TypedRoute.Get('/')
	@UseGuards(AuthenticationGuard, RolesGuard)
	@Roles(UserRoleEnum.ADMIN)
	async listUsers(@TypedQuery() query: AdminListUsersInputDto): Promise<AdminListUsersOutputDto> {
		const filters: FilterQuery<User> = {};
		if (query.q) {
			filters.$or = [
				{ firstName: { $ilike: `%${query.q}%` } },
				{ lastName: { $ilike: `%${query.q}%` } },
				{ email: { $ilike: `%${query.q}%` } },
			];
		}
		if (query.isMarkedForDeletion) {
			filters.isMarkedForDeletion = { $eq: true };
		}

		type PopulateKeys = 'profileImage';
		const populate = ['profileImage'] as PopulateKeys[];

		const sort = query.sort ?? 'firstName:asc';
		const options = {
			offset: (query.page - 1) * query.size,
			limit: query.size,
			populate,
			orderBy: { [sort.split(':')[0]]: sort.split(':')[1] },
		};

		const serializeOptions: SerializeOptions<User, PopulateKeys> = {
			skipNull: true,
			populate: populate,
			forceObject: true,
		};
		const [items, totalItems] = await this.userRepository.findAndCount(filters, options);
		const result: AdminListUsersOutputDto = {
			items: items.map(i => wrap(i).serialize(serializeOptions as any)) as any,
			totalItems,
			page: query.page,
			pageSize: query.size,
		};

		return result;
	}

	/**
	 * Replaces a user's roles. `user` is always kept, `system` can never be handed out,
	 * and an admin cannot edit their own roles — see `UserService.updateUserRoles`.
	 */
	@TypedRoute.Put('/:id/roles')
	@UseGuards(AuthenticationGuard, RolesGuard)
	@Roles(UserRoleEnum.ADMIN)
	async updateUserRoles(
		@TypedParam('id') id: string,
		@TypedBody() body: AdminUpdateUserRolesInputDto,
		@AuthenticatedUserId() actingUserId: string,
	): Promise<OkResponse> {
		const user = await this.userRepository.findOneOrFail({ id });
		await this.userService.updateUserRoles(user, body.roles, actingUserId);
		return { ok: true };
	}

	@TypedRoute.Delete('/:id')
	@UseGuards(AuthenticationGuard, RolesGuard)
	@Roles(UserRoleEnum.ADMIN)
	async deleteUser(@TypedParam('id') id: string): Promise<OkResponse> {
		const user = await this.userRepository.findOneOrFail({ id });
		await this.userService.deleteUser(user);
		return { ok: true };
	}
}
