import { BadRequestException, Controller, UseGuards } from '@nestjs/common';

import { TypedBody, TypedRoute } from '@nestia/core';

import { TurnstileGuard } from 'src/modules/turnstile/guards/turnstile.guard.js';
import { OkResponse } from 'src/shared/interfaces/ok-response.interface.js';

import { VisitorInfo } from '../decorators/visitor-info.decorator.js';
import { ChangeForgottenPasswordInputDto } from '../dto/change-forgotten-password.input.dto.js';
import { ForgotPasswordInputDto } from '../dto/forgot-password.input.dto.js';
import { VerificationTokenOutputDto } from '../dto/verification-token.output.dto.js';
import { VerifyCredentialInputDto } from '../dto/verify-credential.input.dto.js';
import { ForgotPasswordTokenPayload } from '../interfaces/forgot-password-token-payload.interface.js';
import { Visitor } from '../interfaces/visitor.interface.js';
import { UserRepository } from '../repositories/user.repository.js';
import { AccountNoticeService } from '../services/account-notice.service.js';
import { JwtService } from '../services/jwt.service.js';
import { PasswordService } from '../services/password.service.js';
import { VerificationService } from '../services/verification.service.js';

@Controller('auth/forgot-password')
export class ForgotPasswordController {
	constructor(
		private verificationService: VerificationService,
		private userRepository: UserRepository,
		private jwtService: JwtService,
		private passwordService: PasswordService,
		private accountNoticeService: AccountNoticeService,
	) {}

	@TypedRoute.Post('/')
	@UseGuards(TurnstileGuard)
	async forgotPassword(
		@TypedBody() body: ForgotPasswordInputDto,
		@VisitorInfo() visitor: Visitor,
	): Promise<VerificationTokenOutputDto> {
		if (!body.email && !body.mobileNumber) {
			throw new BadRequestException('Need one of email or mobile number');
		}

		const created = await this.verificationService.createForForgotPassword(body, visitor);
		return { verificationToken: created.verificationToken };
	}

	@TypedRoute.Post('/verify')
	@UseGuards(TurnstileGuard)
	async verifyForgotPassword(
		@TypedBody() body: VerifyCredentialInputDto,
	): Promise<VerificationTokenOutputDto> {
		const verificationRequest = await this.verificationService.verifyAndHandle(body);
		const jwt = await this.jwtService.createForgotPasswordToken({
			userId: verificationRequest.user!.id,
		});
		return { verificationToken: jwt };
	}

	@TypedRoute.Post('/change')
	async changeForgottenPassword(
		@TypedBody() body: ChangeForgottenPasswordInputDto,
	): Promise<OkResponse> {
		const payload = this.jwtService.decode<ForgotPasswordTokenPayload>(body.token);
		const hashedPassword = await this.passwordService.hashPassword(body.password);
		await this.userRepository.nativeUpdate(
			{ id: payload.userId },
			{
				passwordLastChangedAt: new Date(),
				hashedPassword,
			},
		);
		const user = await this.userRepository.findOne({ id: payload.userId });
		if (user) await this.accountNoticeService.passwordChanged(user);
		return { ok: true };
	}
}
