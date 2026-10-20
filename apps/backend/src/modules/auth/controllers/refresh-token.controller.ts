import { Controller, Logger, Req, Res, UnauthorizedException } from '@nestjs/common';

import { TypedBody, TypedRoute } from '@nestia/core';
import dayjs from 'dayjs';
import { Request, Response } from 'express';

import { ExceptionCodes } from 'exceptions';

import { RefreshTokenInputDto } from 'src/modules/auth/dto/refresh-token.input.dto.js';
import { RefreshTokenOutputDto } from 'src/modules/auth/dto/refresh-token.output.dto.js';
import { RefreshTokenPayload } from 'src/modules/auth/interfaces/refresh-token-payload.interface.js';
import { UserSessionRepository } from 'src/modules/auth/repositories/user-session.repository.js';
import { JwtService } from 'src/modules/auth/services/jwt.service.js';
import { Platform } from 'src/shared/constants/platform.enum.const.js';
import { PlatformInfo } from 'src/shared/decorators/platform-info.decorator.js';

import { COOKIE_REFRESH_TOKEN } from '../constants/auth-cookie.constant.js';
import { AuthCookieService } from '../services/auth-cookie.service.js';

@Controller('auth/refresh-token')
export class RefreshTokenController {
	private logger = new Logger(RefreshTokenController.name);
	constructor(
		private readonly userSessionRepository: UserSessionRepository,
		private readonly jwtService: JwtService,
		private readonly authCookieService: AuthCookieService,
	) {}

	@TypedRoute.Post('/')
	async refreshToken(
		@TypedBody() body: RefreshTokenInputDto,
		@Req() req: Request,
		@Res({ passthrough: true }) res: Response,
		@PlatformInfo() platform?: Platform,
	): Promise<RefreshTokenOutputDto> {
		// Body first, cookie second — the same precedence the guards use. The cookie covers a
		// browser that has the session but no token in reach, which is what keeps an SSR
		// render signed in across an access-token expiry.
		const refreshToken = body.refreshToken ?? req.cookies?.[COOKIE_REFRESH_TOKEN];
		if (!refreshToken) {
			throw new UnauthorizedException({ code: ExceptionCodes.SESSION_NOT_FOUND });
		}

		try {
			const jwtPayload = this.jwtService.decode<RefreshTokenPayload>(refreshToken);
			const session = await this.userSessionRepository.findOneOrFail(
				{ id: jwtPayload.sessionId },
				{ populate: ['user'] },
			);

			if (session && dayjs().isAfter(dayjs(session.expiresAt))) {
				throw new UnauthorizedException({ code: ExceptionCodes.SESSION_NOT_FOUND });
			}

			// Heartbeat: the SPA refreshes the access token throughout a long session
			// (getMe only fires at app init), so this keeps lastSeenAt current and
			// backfills platform for sessions that were created without it.
			session.lastSeenAt = new Date();
			if (platform) session.platform = platform;
			await this.userSessionRepository.getEntityManager().flush();

			const accessToken = await this.jwtService.createAccessToken({
				userId: session.user.id,
				sessionId: session.id,
				roles: session.user.roles,
			});

			this.authCookieService.setAccessTokenCookie(res, accessToken);

			return accessToken;
		} catch (e) {
			this.logger.error('refresh-token failed', e);
			throw new UnauthorizedException({ code: ExceptionCodes.SESSION_NOT_FOUND });
		}
	}
}
