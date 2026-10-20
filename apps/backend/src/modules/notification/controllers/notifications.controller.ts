import { FilterQuery, QueryOrder, SerializeOptions, wrap } from '@mikro-orm/core';

import { Controller, UseGuards } from '@nestjs/common';

import { TypedParam, TypedQuery, TypedRoute } from '@nestia/core';

import { AuthenticatedUserReference } from 'src/modules/auth/decorators/authenticated-user-reference.decorator.js';
import { User } from 'src/modules/auth/entities/user.entity.js';
import { AuthenticationGuard } from 'src/modules/auth/guards/authentication.guard.js';

import { OkResponse } from '../../../shared/interfaces/ok-response.interface.js';
import { UserRoleEnum } from '../../auth/constants/user-role.enum.constant.js';
import { Roles } from '../../auth/decorators/roles.decorator.js';
import { ListNotificationsInputDto } from '../dto/list-notifications.input.dto.js';
import { ListNotificationsOutputDto } from '../dto/list-notifications.output.dto.js';
import { Notification } from '../entities/notification.entity.js';
import { NotificationRepository } from '../repositories/notification.repository.js';

@UseGuards(AuthenticationGuard)
@Controller('/notifications')
export class NotificationsController {
	constructor(private readonly notificationRepository: NotificationRepository) {}

	@Roles(UserRoleEnum.ADMIN)
	@TypedRoute.Get('/')
	public async listNotifications(
		@AuthenticatedUserReference() user: User,
		@TypedQuery() query: ListNotificationsInputDto,
	): Promise<ListNotificationsOutputDto> {
		const filters: FilterQuery<Notification> = { user };
		if (query.unreadOnly) filters.readAt = { $exists: false };
		if (query.from) filters.createdAt = { $gt: new Date(query.from) };

		const options = {
			offset: (query.page - 1) * query.size,
			limit: query.size,
			orderBy: { createdAt: QueryOrder.DESC },
		};

		const serializeOptions: SerializeOptions<Notification> = {
			skipNull: true,
			forceObject: true,
		};

		const [items, totalItems] = await this.notificationRepository.findAndCount(
			filters,
			options,
		);
		const result = {
			items: items.map(i => wrap(i).serialize(serializeOptions as any)),
			totalItems,
			page: query.page,
			pageSize: query.size,
		};

		return result as any;
	}

	@TypedRoute.Put('/read')
	public async readAllNotifications(
		@AuthenticatedUserReference() user: User,
	): Promise<OkResponse> {
		await this.notificationRepository.nativeUpdate({ user }, { readAt: new Date() });
		return { ok: true };
	}

	@TypedRoute.Put('/:id/read')
	public async readNotification(
		@AuthenticatedUserReference() user: User,
		@TypedParam('id') id: string,
	): Promise<OkResponse> {
		const notification = await this.notificationRepository.findOneOrFail(
			{ id: { $eq: id }, user },
			{},
		);
		notification.readAt = new Date();
		await this.notificationRepository.getEntityManager().flush();
		return { ok: true };
	}

	@TypedRoute.Put('/:id/unread')
	public async unreadNotification(
		@AuthenticatedUserReference() user: User,
		@TypedParam('id') id: string,
	): Promise<OkResponse> {
		const notification = await this.notificationRepository.findOneOrFail(
			{ id: { $eq: id }, user },
			{},
		);
		notification.readAt = null;
		await this.notificationRepository.getEntityManager().flush();
		return { ok: true };
	}
}
