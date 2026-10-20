import {
	CanActivate,
	ExecutionContext,
	Injectable,
	Logger,
	UnauthorizedException,
} from '@nestjs/common';

import { UserRepository } from 'src/modules/auth/repositories/user.repository.js';

import { User } from '../entities/user.entity.js';
import { AccessTokenPayload } from '../interfaces/access-token-payload.interface.js';
import { JwtService } from '../services/jwt.service.js';

@Injectable()
export class WebsocketEventAuthenticationGuard implements CanActivate {
	private readonly logger = new Logger(WebsocketEventAuthenticationGuard.name);

	constructor(
		private userRepository: UserRepository,
		private jwtService: JwtService,
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const data = context.switchToWs().getData();
		const authToken = data?.token;

		if (!authToken) {
			throw new UnauthorizedException('No token provided');
		}

		try {
			const payload = this.jwtService.decode<AccessTokenPayload>(authToken);
			if (!payload) {
				return false;
			}

			const user = await this.userRepository
				.getEntityManager()
				.fork()
				.findOne(User, { id: { $eq: payload.userId } });

			if (!user) {
				return false;
			}

			const client = context.switchToWs().getClient();
			client.user = user;
			return true;
		} catch (e) {
			this.logger.warn('Token validation failed', e);
			return false;
		}
	}
}
