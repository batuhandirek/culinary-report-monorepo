import { Transform } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

import { validateEnv } from 'src/shared/util/env.js';

export class AuthConfig {
	@IsString()
	@IsNotEmpty()
	public JWT_SECRET: string;

	@IsNumber()
	@Transform(v => Number(v.value))
	public REFRESH_TOKEN_EXPIRES_IN_DAYS: number;

	@IsNumber()
	@Transform(v => Number(v.value))
	public REFRESH_TOKEN_EXPIRES_IN_DAYS_ON_MOBILE: number;

	@IsNumber()
	@Transform(v => Number(v.value))
	public ACCESS_TOKEN_EXPIRES_IN_MINUTES: number;

	@IsNumber()
	@Transform(v => Number(v.value))
	public VERIFICATION_TOKEN_EXPIRES_IN_MINUTES: number;

	@IsString()
	@IsOptional()
	public VERIFICATION_DEFAULT_CODE?: string;

	@IsNumber()
	@Transform(v => Number(v.value))
	public FORGOT_PASSWORD_TOKEN_EXPIRES_IN_MINUTES: number;
}

const authConfig = validateEnv(AuthConfig);
export { authConfig };
