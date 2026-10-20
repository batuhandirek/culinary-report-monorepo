import { QueryOrder, SerializeOptions, wrap } from '@mikro-orm/core';

import { BadRequestException, Controller, NotFoundException, UseGuards } from '@nestjs/common';

import { TypedParam, TypedQuery, TypedRoute } from '@nestia/core';

import { OkResponse } from 'src/shared/interfaces/ok-response.interface.js';

import { AuthenticatedUserReference } from '../decorators/authenticated-user-reference.decorator.js';
import { AuthenticatedUserSessionId } from '../decorators/authenticated-user-session-id.decorator.js';
import { ListSessionsInputDto } from '../dto/list-sessions.input.dto.js';
import {
	ListSessionsOutputDto,
	RevokeOtherSessionsOutputDto,
} from '../dto/list-sessions.output.dto.js';
import { User } from '../entities/user.entity.js';
import { UserSession } from '../entities/user-session.entity.js';
import { AuthenticationGuard } from '../guards/authentication.guard.js';
import { UserSessionRepository } from '../repositories/user-session.repository.js';
import { UserSessionService } from '../services/user-session.service.js';

@Controller('auth/sessions')
export class SessionsController {
	constructor(
		private readonly userSessionRepository: UserSessionRepository,
		private readonly userSessionService: UserSessionService,
	) {}

	@UseGuards(AuthenticationGuard)
	@TypedRoute.Get('/')
	async listSessions(
		@AuthenticatedUserReference() user: User,
		@AuthenticatedUserSessionId() userSessionId: string,
		@TypedQuery() query: ListSessionsInputDto,
	): Promise<ListSessionsOutputDto> {
		const options = {
			offset: (query.page - 1) * query.size,
			limit: query.size,
			orderBy: { createdAt: QueryOrder.DESC },
		};

		const serializeOptions: SerializeOptions<UserSession> = {
			skipNull: true,
			forceObject: true,
		};

		const [items, totalItems] = await this.userSessionRepository.findAndCount(
			{
				user,
				expiresAt: { $gt: new Date() },
			},
			options,
		);
		const result = {
			items: items.map(i => ({
				...wrap(i).serialize(serializeOptions as any),
				isCurrent: i.id === userSessionId,
			})),
			totalItems,
			page: query.page,
			pageSize: query.size,
		} as ListSessionsOutputDto;

		return result;
	}

	/** Every other session: the one asking stays signed in. */
	@UseGuards(AuthenticationGuard)
	@TypedRoute.Delete('/')
	async revokeOtherSessions(
		@AuthenticatedUserReference() user: User,
		@AuthenticatedUserSessionId() userSessionId: string,
	): Promise<RevokeOtherSessionsOutputDto> {
		const revoked = await this.userSessionService.revokeOtherSessions(user.id, userSessionId);
		return { revoked };
	}

	@UseGuards(AuthenticationGuard)
	@TypedRoute.Delete('/:id')
	async revokeSession(
		@AuthenticatedUserReference() user: User,
		@AuthenticatedUserSessionId() userSessionId: string,
		@TypedParam('id') id: string,
	): Promise<OkResponse> {
		if (userSessionId === id) {
			throw new BadRequestException('Cant revoke your own session, use logout instead.');
		}

		const res = await this.userSessionRepository.nativeDelete({ id, user });
		if (res !== 1) {
			throw new NotFoundException();
		}

		return { ok: true };
	}
}
