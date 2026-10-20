import { Injectable, Logger } from '@nestjs/common';

import dayjs from 'dayjs';

import { LoginOutputDto } from 'src/modules/auth/dto/login.output.dto.js';
import { Platform } from 'src/shared/constants/platform.enum.const.js';

import { authConfig } from '../config/auth.config.js';
import { User } from '../entities/user.entity.js';
import { UserSession } from '../entities/user-session.entity.js';
import { Visitor } from '../interfaces/visitor.interface.js';
import { UserSessionRepository } from '../repositories/user-session.repository.js';

import { JwtService } from './jwt.service.js';

@Injectable()
export class UserSessionService {
	private readonly logger = new Logger(UserSessionService.name);
	constructor(
		private userSessionRepository: UserSessionRepository,
		private jwtService: JwtService,
	) {}

	public async createSessionForUser(
		user: User,
		visitorInfo: Visitor,
		platformInfo: Platform,
	): Promise<LoginOutputDto> {
		const refreshTokenExpiresInDays =
			platformInfo === Platform.WEB ?
				authConfig.REFRESH_TOKEN_EXPIRES_IN_DAYS
			:	authConfig.REFRESH_TOKEN_EXPIRES_IN_DAYS_ON_MOBILE;
		const accessTokenExpiresInMinutes = authConfig.ACCESS_TOKEN_EXPIRES_IN_MINUTES;
		const expiresAt = dayjs().add(refreshTokenExpiresInDays, 'day').toDate();
		const userSession = this.userSessionRepository.create({
			expiresAt,
			user,
			visitorInfo,
			platform: platformInfo,
			lastSeenAt: new Date(),
		});
		const sessionId = await this.userSessionRepository.insert(userSession);
		const [accessToken, refreshToken] = await Promise.all([
			this.jwtService.createAccessToken(
				{ userId: user.id, roles: user.roles, sessionId },
				accessTokenExpiresInMinutes,
			),
			this.jwtService.createRefreshToken(
				{ sessionId, userId: user.id },
				refreshTokenExpiresInDays,
			),
		]);
		return {
			refreshToken,
			expiresAt,
			...accessToken,
		};
	}

	/**
	 * "Diğer tüm oturumları kapat": ends every session of the user but the one asking.
	 * Returns how many it ended.
	 */
	public async revokeOtherSessions(userId: string, currentSessionId: string): Promise<number> {
		return this.userSessionRepository.nativeDelete({
			user: userId,
			id: { $ne: currentSessionId },
		});
	}

	/**
	 * Records activity on a session: bumps lastSeenAt and, when provided, the platform.
	 * A direct UPDATE so it stays cheap on the hot getMe path.
	 */
	public async touchSession(sessionId: string, info: { platform?: Platform }): Promise<void> {
		const payload: Partial<UserSession> = { lastSeenAt: new Date() };
		if (info.platform) payload.platform = info.platform;
		await this.userSessionRepository.nativeUpdate({ id: sessionId }, payload);
	}
}
