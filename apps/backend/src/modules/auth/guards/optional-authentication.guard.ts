import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { UserRepository } from 'src/modules/auth/repositories/user.repository.js';
import { UserSessionRepository } from 'src/modules/auth/repositories/user-session.repository.js';

import { COOKIE_ACCESS_TOKEN } from '../constants/auth-cookie.constant.js';
import { AccessTokenPayload } from '../interfaces/access-token-payload.interface.js';
import { JwtService } from '../services/jwt.service.js';

@Injectable()
export class OptionalAuthenticationGuard implements CanActivate {
	private logger = new Logger(OptionalAuthenticationGuard.name);
	constructor(
		private reflector: Reflector,
		private userRepository: UserRepository,
		private userSessionRepository: UserSessionRepository,
		private jwtService: JwtService,
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest();

		// Same precedence as `AuthenticationGuard` — header first, cookie second.
		const authToken =
			request.headers['authorization']?.split(' ')[1] ??
			request.cookies?.[COOKIE_ACCESS_TOKEN];
		if (!authToken) {
			return true;
		}

		try {
			const payload = this.jwtService.decode<AccessTokenPayload>(authToken);
			if (!payload) return false;

			request.userId = payload.userId;
			request.userRef = this.userRepository.getReference(payload.userId);
			request.userRoles = payload.roles;
			return true;
		} catch (e) {
			return true;
		}
	}
}
