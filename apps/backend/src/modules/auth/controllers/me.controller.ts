import { wrap } from '@mikro-orm/core';

import { Controller, UseGuards } from '@nestjs/common';

import { TypedBody, TypedRoute } from '@nestia/core';

import { PasswordService } from 'src/modules/auth/services/password.service.js';
import { NotificationPreferenceService } from 'src/modules/notification-preferences/services/notification-preference.service.js';
import { Platform } from 'src/shared/constants/platform.enum.const.js';
import { PlatformInfo } from 'src/shared/decorators/platform-info.decorator.js';

import { AuthenticatedUserId } from '../decorators/authenticated-user-id.decorator.js';
import { AuthenticatedUserReference } from '../decorators/authenticated-user-reference.decorator.js';
import { AuthenticatedUserSessionId } from '../decorators/authenticated-user-session-id.decorator.js';
import { GetMeOutputDto } from '../dto/me.output.dto.js';
import { UpdateMeInputDto } from '../dto/update-me.input.dto.js';
import { BrandMembershipOutputDto } from '../dto/brand-membership.output.dto.js';
import { User } from '../entities/user.entity.js';
import { AuthenticationGuard } from '../guards/authentication.guard.js';
import { UserRepository } from '../repositories/user.repository.js';
import { AccountNoticeService } from '../services/account-notice.service.js';
import { UserService } from '../services/user.service.js';
import { UserSessionService } from '../services/user-session.service.js';
import { BrandMemberService } from '../services/brand-member.service.js';

@Controller('auth/me')
export class MeController {
	constructor(
		private readonly userRepository: UserRepository,
		private readonly userService: UserService,
		private readonly passwordService: PasswordService,
		private readonly userSessionService: UserSessionService,
		private readonly accountNoticeService: AccountNoticeService,
		private readonly notificationPreferenceService: NotificationPreferenceService,
		private readonly brandMemberService: BrandMemberService,
	) {}

	/**
	 * The response of every route here: the user's own row plus their topic switches and
	 * their brand memberships.
	 */
	private async serializeMe(
		me: User,
		populate: 'profileImage'[],
	): Promise<GetMeOutputDto> {
		return {
			...(wrap(me).serialize({ skipNull: true, populate, forceObject: true }) as Omit<
				GetMeOutputDto,
				'notificationPreferences' | 'brandMemberships'
			>),
			notificationPreferences: await this.notificationPreferenceService.getAll(me.id),
			brandMemberships: (await this.brandMemberService.membershipsOf(me.id)).map(
				member =>
					wrap(member).serialize({
						skipNull: true,
						populate: ['brand', 'brand.branches'],
						forceObject: true,
					}) as unknown as BrandMembershipOutputDto,
			),
		};
	}

	@UseGuards(AuthenticationGuard)
	@TypedRoute.Get('/')
	async getMe(
		@AuthenticatedUserId() userId: string,
		@AuthenticatedUserSessionId() sessionId: string,
		@PlatformInfo() platform?: Platform,
	): Promise<GetMeOutputDto> {
		const me = await this.userRepository.findOneOrFail(
			{ id: userId },
			{ populate: ['profileImage'] },
		);
		// Heartbeat: record activity + platform on the session.
		await this.userSessionService.touchSession(sessionId, { platform });
		return this.serializeMe(me, ['profileImage']);
	}

	@UseGuards(AuthenticationGuard)
	@TypedRoute.Patch('/')
	async updateMe(
		@AuthenticatedUserReference() user: User,
		@TypedBody() body: UpdateMeInputDto,
	): Promise<GetMeOutputDto> {
		await this.userService.updateMe(user, body);

		const me = await this.userRepository.findOneOrFail(
			{ id: user.id },
			{ populate: ['profileImage'] },
		);
		return this.serializeMe(me, ['profileImage']);
	}

	@UseGuards(AuthenticationGuard)
	@TypedRoute.Delete('/')
	async deleteMe(@AuthenticatedUserId() userId: string): Promise<GetMeOutputDto> {
		const me = (await this.userRepository.findOneOrFail({ id: userId }, {})) as any;

		me.markedForDeletionAt = new Date();
		me.isMarkedForDeletion = true;
		await this.userRepository.getEntityManager().flush();
		await this.accountNoticeService.deletionScheduled(me);
		return this.serializeMe(me, ['profileImage']);
	}
}
