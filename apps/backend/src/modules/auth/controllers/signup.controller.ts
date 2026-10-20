import { Controller, UseGuards } from '@nestjs/common';

import { TypedBody, TypedRoute } from '@nestia/core';

import { TurnstileGuard } from 'src/modules/turnstile/guards/turnstile.guard.js';
import { OkResponse } from 'src/shared/interfaces/ok-response.interface.js';

import { VisitorInfo } from '../decorators/visitor-info.decorator.js';
import { SignupEmailInputDto } from '../dto/signup-email.input.dto.js';
import { SignupMobileInputDto } from '../dto/signup-mobile.input.dto.js';
import { VerificationTokenOutputDto } from '../dto/verification-token.output.dto.js';
import { VerifyCredentialInputDto } from '../dto/verify-credential.input.dto.js';
import { Visitor } from '../interfaces/visitor.interface.js';
import { VerificationService } from '../services/verification.service.js';

@Controller('auth/signup')
export class SignupController {
	constructor(private verificationService: VerificationService) {}

	@TypedRoute.Post('/email')
	@UseGuards(TurnstileGuard)
	async signupWithEmail(
		@TypedBody() signupBody: SignupEmailInputDto,
		@VisitorInfo() visitorInfo: Visitor,
	): Promise<VerificationTokenOutputDto> {
		const { verificationToken } =
			await this.verificationService.validateAndCreateForEmailSignup(signupBody, visitorInfo);
		return { verificationToken };
	}

	@TypedRoute.Post('/phone')
	@UseGuards(TurnstileGuard)
	async signupWithPhone(
		@TypedBody() signupBody: SignupMobileInputDto,
		@VisitorInfo() visitorInfo: Visitor,
	): Promise<VerificationTokenOutputDto> {
		const { verificationToken } =
			await this.verificationService.validateAndCreateForMobileNumberSignup(
				signupBody,
				visitorInfo,
			);
		return { verificationToken };
	}

	@TypedRoute.Post('/verify')
	@UseGuards(TurnstileGuard)
	async verifySignup(@TypedBody() body: VerifyCredentialInputDto): Promise<OkResponse> {
		await this.verificationService.verifyAndHandle(body);
		return { ok: true };
	}
}
