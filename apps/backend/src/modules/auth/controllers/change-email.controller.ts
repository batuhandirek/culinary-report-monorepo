import { Controller, UseGuards } from '@nestjs/common';

import { TypedBody, TypedRoute } from '@nestia/core';

import { TurnstileGuard } from 'src/modules/turnstile/guards/turnstile.guard.js';

import { OkResponse } from '../../../shared/interfaces/ok-response.interface.js';
import { AuthenticatedUserReference } from '../decorators/authenticated-user-reference.decorator.js';
import { VisitorInfo } from '../decorators/visitor-info.decorator.js';
import { ChangeEmailInputDto } from '../dto/change-email.input.dto.js';
import { VerificationTokenOutputDto } from '../dto/verification-token.output.dto.js';
import { VerifyCredentialInputDto } from '../dto/verify-credential.input.dto.js';
import { User } from '../entities/user.entity.js';
import { AuthenticationGuard } from '../guards/authentication.guard.js';
import { Visitor } from '../interfaces/visitor.interface.js';
import { VerificationService } from '../services/verification.service.js';

@Controller('auth/change-email')
export class ChangeEmailController {
	constructor(private verificationService: VerificationService) {}

	@UseGuards(AuthenticationGuard, TurnstileGuard)
	@TypedRoute.Post('/')
	async changeEmail(
		@AuthenticatedUserReference() user: User,
		@TypedBody() body: ChangeEmailInputDto,
		@VisitorInfo() visitor: Visitor,
	): Promise<VerificationTokenOutputDto> {
		const created = await this.verificationService.validateAndCreateForEmailChange(
			user,
			body,
			visitor,
		);
		return { verificationToken: created.verificationToken };
	}

	@UseGuards(AuthenticationGuard, TurnstileGuard)
	@TypedRoute.Post('/verify')
	async verifyChangeEmail(@TypedBody() body: VerifyCredentialInputDto): Promise<OkResponse> {
		await this.verificationService.verifyAndHandle(body);
		return { ok: true };
	}
}
