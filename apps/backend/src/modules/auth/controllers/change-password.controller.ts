import { wrap } from '@mikro-orm/core';

import { BadRequestException, Controller, UseGuards } from '@nestjs/common';

import { TypedBody, TypedRoute } from '@nestia/core';

import { ExceptionCodes } from 'exceptions';

import { OkResponse } from '../../../shared/interfaces/ok-response.interface.js';
import { AuthenticatedUserReference } from '../decorators/authenticated-user-reference.decorator.js';
import { ChangePasswordInputDto } from '../dto/change-password.input.dto.js';
import { User } from '../entities/user.entity.js';
import { AuthenticationGuard } from '../guards/authentication.guard.js';
import { UserRepository } from '../repositories/user.repository.js';
import { AccountNoticeService } from '../services/account-notice.service.js';
import { PasswordService } from '../services/password.service.js';

@Controller('auth/change-password')
export class ChangePasswordController {
	constructor(
		private userRepository: UserRepository,
		private passwordService: PasswordService,
		private accountNoticeService: AccountNoticeService,
	) {}

	@UseGuards(AuthenticationGuard)
	@TypedRoute.Post('/')
	async changePassword(
		@AuthenticatedUserReference() user: User,
		@TypedBody() body: ChangePasswordInputDto,
	): Promise<OkResponse> {
		await wrap(user).init();

		if (user.hashedPassword) {
			if (!body.oldPassword) {
				throw new BadRequestException(
					'Cannot change email without submitting current password',
				);
			}
			const matching = await this.passwordService.comparePassword(
				body.oldPassword,
				user.hashedPassword,
			);
			if (!matching) {
				throw new BadRequestException({ code: ExceptionCodes.INVALID_CREDENTIALS });
			}
		}

		user.passwordLastChangedAt = new Date();
		user.hashedPassword = await this.passwordService.hashPassword(body.newPassword);

		await this.userRepository.getEntityManager().flush();
		await this.accountNoticeService.passwordChanged(user);
		return { ok: true };
	}
}
