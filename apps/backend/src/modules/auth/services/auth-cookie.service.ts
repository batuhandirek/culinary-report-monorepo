import { Injectable } from '@nestjs/common';

import { CookieOptions, Response } from 'express';

import { mainConfig } from 'src/config/main.config.js';

import { authConfig } from '../config/auth.config.js';
import { COOKIE_ACCESS_TOKEN, COOKIE_REFRESH_TOKEN } from '../constants/auth-cookie.constant.js';
import { LoginOutputDto } from '../dto/login.output.dto.js';
import { RefreshTokenOutputDto } from '../dto/refresh-token.output.dto.js';

@Injectable()
export class AuthCookieService {
	private get baseCookieOptions(): CookieOptions {
		return {
			httpOnly: true,
			sameSite: 'lax',
			secure: mainConfig.NODE_ENV === 'production',
		};
	}

	setLoginCookies(res: Response, output: LoginOutputDto): void {
		res.cookie(COOKIE_ACCESS_TOKEN, output.accessToken, {
			...this.baseCookieOptions,
			path: '/',
			maxAge: authConfig.ACCESS_TOKEN_EXPIRES_IN_MINUTES * 60 * 1000,
		});

		const refreshMaxAgeMs = output.expiresAt.getTime() - Date.now();
		res.cookie(COOKIE_REFRESH_TOKEN, output.refreshToken, {
			...this.baseCookieOptions,
			path: '/api/auth',
			maxAge: refreshMaxAgeMs,
		});
	}

	setAccessTokenCookie(res: Response, output: RefreshTokenOutputDto): void {
		res.cookie(COOKIE_ACCESS_TOKEN, output.accessToken, {
			...this.baseCookieOptions,
			path: '/',
			maxAge: authConfig.ACCESS_TOKEN_EXPIRES_IN_MINUTES * 60 * 1000,
		});
	}

	clearAuthCookies(res: Response): void {
		res.clearCookie(COOKIE_ACCESS_TOKEN, { path: '/' });
		res.clearCookie(COOKIE_REFRESH_TOKEN, { path: '/api/auth' });
	}
}
