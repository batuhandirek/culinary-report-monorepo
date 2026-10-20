import {
	CanActivate,
	ExecutionContext,
	ForbiddenException,
	Injectable,
	Logger,
} from '@nestjs/common';

import { ExceptionCodes } from 'exceptions';

import { Platform } from 'src/shared/constants/platform.enum.const.js';

import { turnstileConfig } from '../config/turnstile.config.js';
import { TurnstileService } from '../services/turnstile.service.js';

export const TURNSTILE_TOKEN_HEADER = 'culinary-report-turnstile-token';

/**
 * Every client stamps its platform (`web`/`ios`/`android`) on this header via
 * the frontend's `getPlatformHeaders` — the same value the `PlatformInfo`
 * decorator reads. Anything other than `web` is a native client.
 */
const PLATFORM_HEADER = 'culinary-report-sent-by';

/**
 * Verifies a Cloudflare Turnstile token on bot-sensitive public routes
 * (signup/login/verification/forgot-password). Apply with
 * `@UseGuards(TurnstileGuard)` — works from any module (TurnstileModule is
 * global); the frontend sends the token in the `culinary-report-turnstile-token`
 * header via `turnstileStore.getHeaders()`.
 *
 * With `TURNSTILE_ENFORCE` unset/false, missing or failed tokens are logged but
 * allowed. A siteverify outage also fails open even when enforcing — a Cloudflare
 * incident must not lock users out of login. With no `TURNSTILE_SECRET_KEY`
 * configured the guard is a no-op (dev/tests).
 *
 * Native clients are always exempt: the Capacitor webview's `capacitor://`
 * origin fails Turnstile's hostname validation, so the frontend store is
 * web-only and native requests never carry a token (see the frontend
 * `TurnstileStore`). Enforcing on them would lock the app out of login, so we
 * skip the check whenever `CULINARY-REPORT-SENT-BY` is a native platform.
 */
@Injectable()
export class TurnstileGuard implements CanActivate {
	private logger = new Logger(TurnstileGuard.name);

	constructor(private readonly turnstileService: TurnstileService) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		if (!this.turnstileService.isEnabled) return true;

		const request = context.switchToHttp().getRequest();

		// Native clients can't produce Turnstile tokens; never gate them.
		const platform = request.headers[PLATFORM_HEADER];
		if (platform && platform !== Platform.WEB) return true;

		const token = request.headers[TURNSTILE_TOKEN_HEADER];
		if (!token || typeof token !== 'string') {
			return this.reject('missing-token', request);
		}

		// Same client-IP resolution as the VisitorInfo decorator.
		const remoteIp = request.headers['cf-connecting-ip'] ?? request.headers['x-forwarded-for'];
		const verdict = await this.turnstileService.verifyToken(token, remoteIp);
		if (verdict.outcome === 'fail') {
			return this.reject(verdict.errorCodes.join(',') || 'failed', request);
		}
		return true;
	}

	private reject(reason: string, request: { method?: string; url?: string }): boolean {
		this.logger.warn(
			`Turnstile rejected (${reason}) for ${request.method} ${request.url}` +
				(turnstileConfig.TURNSTILE_ENFORCE ? '' : ' — enforcement off, allowing'),
		);
		if (turnstileConfig.TURNSTILE_ENFORCE) {
			throw new ForbiddenException({
				code: ExceptionCodes.TURNSTILE_VERIFICATION_FAILED,
			});
		}
		return true;
	}
}
