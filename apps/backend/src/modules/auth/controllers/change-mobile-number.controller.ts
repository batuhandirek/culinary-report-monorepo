import { Controller, UseGuards } from '@nestjs/common';

import { TypedBody, TypedRoute } from '@nestia/core';

import { AuthenticatedUserReference } from 'src/modules/auth/decorators/authenticated-user-reference.decorator.js';
import { TurnstileGuard } from 'src/modules/turnstile/guards/turnstile.guard.js';

import { OkResponse } from '../../../shared/interfaces/ok-response.interface.js';
import { VisitorInfo } from '../decorators/visitor-info.decorator.js';
import { ChangeMobileNumberInputDto } from '../dto/change-mobile-number.input.dto.js';
import { VerificationTokenOutputDto } from '../dto/verification-token.output.dto.js';
import { VerifyCredentialInputDto } from '../dto/verify-credential.input.dto.js';
import { User } from '../entities/user.entity.js';
import { AuthenticationGuard } from '../guards/authentication.guard.js';
import { Visitor } from '../interfaces/visitor.interface.js';
import { UserRepository } from '../repositories/user.repository.js';
import { JwtService } from '../services/jwt.service.js';
import { PasswordService } from '../services/password.service.js';
import { VerificationService } from '../services/verification.service.js';

@Controller('auth/change-mobile-number')
export class ChangeMobileNumberController {
	constructor(
		private verificationService: VerificationService,
		private userRepository: UserRepository,
		private jwtService: JwtService,
		private passwordService: PasswordService,
	) {}

	@UseGuards(AuthenticationGuard, TurnstileGuard)
	@TypedRoute.Post('/')
	async changeMobileNumber(
		@AuthenticatedUserReference() user: User,
		@TypedBody() body: ChangeMobileNumberInputDto,
		@VisitorInfo() visitor: Visitor,
	): Promise<VerificationTokenOutputDto> {
		const created = await this.verificationService.validateAndCreateForMobileNumberChange(
			user,
			body,
			visitor,
		);
		return { verificationToken: created.verificationToken };
	}

	@UseGuards(AuthenticationGuard, TurnstileGuard)
	@TypedRoute.Post('/verify')
	async verifyChangeMobileNumber(
		@TypedBody() body: VerifyCredentialInputDto,
		@VisitorInfo() visitor: Visitor,
	): Promise<OkResponse> {
		await this.verificationService.verifyAndHandle(body);
		return { ok: true };
	}
}
