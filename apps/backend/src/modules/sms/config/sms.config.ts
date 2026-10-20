import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

import { validateEnv } from 'src/shared/util/env.js';

export class SmsConfig {
	@IsBoolean()
	@IsOptional()
	@Transform(v => v.value === 'true')
	public SMS_IS_DISABLED: boolean = false;

	@IsString()
	public VERIMOR_USERNAME: string;

	@IsString()
	public VERIMOR_PASSWORD: string;

	@IsString()
	public VERIMOR_API_KEY: string;
}

const smsConfig = validateEnv(SmsConfig);
export { smsConfig };
