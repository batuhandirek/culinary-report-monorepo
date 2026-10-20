import { Transform } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';

import { validateEnv } from 'src/shared/util/env.js';

export class EmailConfig {
	@IsBoolean()
	@IsOptional()
	@Transform(v => v.value === 'true')
	public EMAIL_IS_DISABLED: boolean = false;

	@IsBoolean()
	@IsOptional()
	@Transform(v => v.value === 'true')
	public EMAIL_IS_VERBOSE: boolean = false;

	@IsString()
	@IsNotEmpty()
	@ValidateIf((obj: EmailConfig) => !obj.EMAIL_IS_DISABLED)
	public EMAIL_SENDER_EMAIL: string;

	@IsString()
	@IsNotEmpty()
	@ValidateIf((obj: EmailConfig) => !obj.EMAIL_IS_DISABLED)
	public EMAIL_SENDER_NAME: string;

	@IsString()
	@IsNotEmpty()
	@ValidateIf((obj: EmailConfig) => !obj.EMAIL_IS_DISABLED)
	public BREVO_API_KEY: string;
}

const emailConfig = validateEnv(EmailConfig);
export { emailConfig };
