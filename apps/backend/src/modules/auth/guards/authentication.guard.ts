import {
	CanActivate,
	ExecutionContext,
	Injectable,
	Logger,
	UnauthorizedException,
} from '@nestjs/common';

import { UserRepository } from 'src/modules/auth/repositories/user.repository.js';

import { COOKIE_ACCESS_TOKEN } from '../constants/auth-cookie.constant.js';
import { AccessTokenPayload } from '../interfaces/access-token-payload.interface.js';
import { JwtService } from '../services/jwt.service.js';

@Injectable()
export class AuthenticationGuard implements CanActivate {
	private logger = new Logger(AuthenticationGuard.name);
	constructor(
		private userRepository: UserRepository,
		private jwtService: JwtService,
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest();

		// Header first, cookie second — see `auth-cookie.constant.ts`. Native clients only ever
		// send the header; the cookie is what lets SvelteKit's SSR `fetch` call the API as the
		// signed-in user, since a server render has no access to the SPA's token storage.
		const authToken =
			request.headers['authorization']?.split(' ')[1] ??
			request.cookies?.[COOKIE_ACCESS_TOKEN];
		if (!authToken) {
			throw new UnauthorizedException();
		}

		try {
			const payload = this.jwtService.decode<AccessTokenPayload>(authToken);
			if (!payload) return false;

			// Session related
			request.sessionId = payload.sessionId;

			// User related
			request.userId = payload.userId;
			request.userRef = this.userRepository.getReference(payload.userId);
			request.userRoles = payload.roles;

			return true;
		} catch (e) {
			return false;
		}
	}
}
