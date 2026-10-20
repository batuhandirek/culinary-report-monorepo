import { Controller, Res, UseGuards } from '@nestjs/common';

import { TypedRoute } from '@nestia/core';
import { Response } from 'express';

import { OkResponse } from 'src/shared/interfaces/ok-response.interface.js';

import { AuthenticatedUserSessionId } from '../decorators/authenticated-user-session-id.decorator.js';
import { AuthenticationGuard } from '../guards/authentication.guard.js';
import { UserSessionRepository } from '../repositories/user-session.repository.js';
import { AuthCookieService } from '../services/auth-cookie.service.js';

@Controller('auth/logout')
export class LogoutController {
	constructor(
		private readonly userSessionRepository: UserSessionRepository,
		private readonly authCookieService: AuthCookieService,
	) {}

	@TypedRoute.Get('/')
	@UseGuards(AuthenticationGuard)
	async logout(
		@AuthenticatedUserSessionId() id: string,
		@Res({ passthrough: true }) res: Response,
	): Promise<OkResponse> {
		await this.userSessionRepository.nativeDelete({ id });
		this.authCookieService.clearAuthCookies(res);
		return { ok: true };
	}
}
