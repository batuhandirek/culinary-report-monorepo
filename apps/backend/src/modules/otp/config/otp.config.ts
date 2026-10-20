import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

import { validateEnv } from 'src/shared/util/env.js';

export class OtpConfig {
	@IsBoolean()
	@IsOptional()
	@Transform(v => v.value === 'true')
	public OTP_IS_DISABLED: boolean = false;

	@IsBoolean()
	@IsOptional()
	@Transform(v => v.value === 'true')
	public OTP_IS_VERBOSE: boolean = false;
}

const otpConfig = validateEnv(OtpConfig);
export { otpConfig };
