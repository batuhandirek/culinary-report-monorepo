import { Injectable, Logger } from '@nestjs/common';

import { turnstileConfig } from '../config/turnstile.config.js';

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const SITEVERIFY_TIMEOUT_MS = 5000;

export interface TurnstileVerdict {
	/** 'unavailable' = siteverify itself errored/timed out — callers fail open */
	outcome: 'pass' | 'fail' | 'unavailable';
	errorCodes: string[];
}

/**
 * Verifies Cloudflare Turnstile tokens against the siteverify API. Tokens are
 * single-use and expire after 5 minutes, so every protected request needs a
 * fresh one (the frontend TurnstileStore handles that).
 */
@Injectable()
export class TurnstileService {
	private logger = new Logger(TurnstileService.name);

	/** False when TURNSTILE_SECRET_KEY is unset (dev/tests) — the guard no-ops. */
	get isEnabled(): boolean {
		return !!turnstileConfig.TURNSTILE_SECRET_KEY;
	}

	async verifyToken(token: string, remoteIp?: string): Promise<TurnstileVerdict> {
		try {
			const response = await fetch(SITEVERIFY_URL, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					secret: turnstileConfig.TURNSTILE_SECRET_KEY,
					response: token,
					...(remoteIp ? { remoteip: remoteIp } : {}),
				}),
				signal: AbortSignal.timeout(SITEVERIFY_TIMEOUT_MS),
			});
			if (!response.ok) {
				this.logger.error(`Turnstile siteverify returned HTTP ${response.status}`);
				return { outcome: 'unavailable', errorCodes: [`http-${response.status}`] };
			}
			const data = (await response.json()) as {
				success?: boolean;
				'error-codes'?: string[];
			};
			return {
				outcome: data.success === true ? 'pass' : 'fail',
				errorCodes: data['error-codes'] ?? [],
			};
		} catch (e) {
			this.logger.error(`Turnstile siteverify unreachable: ${(e as Error).message}`);
			return { outcome: 'unavailable', errorCodes: ['siteverify-unreachable'] };
		}
	}
}
