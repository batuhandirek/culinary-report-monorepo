import { Controller, Res, UseGuards } from '@nestjs/common';

import { TypedBody, TypedRoute } from '@nestia/core';
import { Response } from 'express';

import { LoginOutputDto } from 'src/modules/auth/dto/login.output.dto.js';
import { TurnstileGuard } from 'src/modules/turnstile/guards/turnstile.guard.js';
import { Platform } from 'src/shared/constants/platform.enum.const.js';
import { PlatformInfo } from 'src/shared/decorators/platform-info.decorator.js';

import { VisitorInfo } from '../decorators/visitor-info.decorator.js';
import { LoginCodeInputDto } from '../dto/login-code.input.dto.js';
import { LoginEmailInputDto } from '../dto/login-email.input.dto.js';
import { LoginMobileNumberInputDto } from '../dto/login-mobile-number.input.dto.js';
import { VerificationTokenOutputDto } from '../dto/verification-token.output.dto.js';
import { VerifyCredentialInputDto } from '../dto/verify-credential.input.dto.js';
import { Visitor } from '../interfaces/visitor.interface.js';
import { AuthCookieService } from '../services/auth-cookie.service.js';
import { LoginService } from '../services/login.service.js';
import { VerificationService } from '../services/verification.service.js';

@Controller('auth/login')
export class LoginController {
	constructor(
		private loginService: LoginService,
		private authCookieService: AuthCookieService,
		private verificationService: VerificationService,
	) {}

	/** Mails a sign-in code to an existing account; no password involved (the venue portal). */
	@TypedRoute.Post('/code')
	@UseGuards(TurnstileGuard)
	async requestLoginCode(
		@TypedBody() body: LoginCodeInputDto,
		@VisitorInfo() visitor: Visitor,
	): Promise<VerificationTokenOutputDto> {
		const { verificationToken } = await this.verificationService.createForEmailLogin(
			body.email,
			visitor,
		);
		return { verificationToken };
	}

	/** Trades the code for a session, and accepts the person's open venue invites. */
	@TypedRoute.Post('/code/verify')
	@UseGuards(TurnstileGuard)
	async loginWithCode(
		@TypedBody() body: VerifyCredentialInputDto,
		@VisitorInfo() visitor: Visitor,
		@PlatformInfo() platform: Platform,
		@Res({ passthrough: true }) res: Response,
	): Promise<LoginOutputDto> {
		const session = await this.loginService.loginWithCode(body, visitor, platform);
		this.authCookieService.setLoginCookies(res, session);
		return session;
	}

	@TypedRoute.Post('/email')
	@UseGuards(TurnstileGuard)
	async loginWithEmail(
		@TypedBody() loginBody: LoginEmailInputDto,
		@VisitorInfo() visitor: Visitor,
		@PlatformInfo() platform: Platform,
		@Res({ passthrough: true }) res: Response,
	): Promise<LoginOutputDto | VerificationTokenOutputDto> {
		const loginRes = await this.loginService.loginWithEmail(loginBody, visitor, platform);
		if ('accessToken' in loginRes) {
			this.authCookieService.setLoginCookies(res, loginRes);
			return loginRes;
		} else return { verificationToken: loginRes.verificationToken };
	}

	@TypedRoute.Post('/phone')
	@UseGuards(TurnstileGuard)
	async loginWithMobileNumber(
		@TypedBody() loginBody: LoginMobileNumberInputDto,
		@VisitorInfo() visitor: Visitor,
		@PlatformInfo() platform: Platform,
		@Res({ passthrough: true }) res: Response,
	): Promise<LoginOutputDto | VerificationTokenOutputDto> {
		const loginRes = await this.loginService.loginWithMobileNumber(
			loginBody,
			visitor,
			platform,
		);
		if ('accessToken' in loginRes) {
			this.authCookieService.setLoginCookies(res, loginRes);
			return loginRes;
		} else return { verificationToken: loginRes.verificationToken };
	}
}
