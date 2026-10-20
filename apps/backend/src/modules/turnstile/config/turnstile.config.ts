import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

import { validateEnv } from 'src/shared/util/env.js';

export class TurnstileConfig {
	/**
	 * Cloudflare Turnstile secret key. Unset => token verification is skipped
	 * entirely (local dev, unit tests, integration runs).
	 */
	@IsString()
	@IsOptional()
	public TURNSTILE_SECRET_KEY?: string;

	/**
	 * When false (default), missing/failed tokens are logged but allowed.
	 */
	@IsBoolean()
	@IsOptional()
	@Transform(v => v.value === 'true')
	public TURNSTILE_ENFORCE: boolean = false;
}

const turnstileConfig = validateEnv(TurnstileConfig);
export { turnstileConfig };
