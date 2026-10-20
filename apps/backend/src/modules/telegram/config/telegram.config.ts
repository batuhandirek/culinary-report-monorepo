import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

import { validateEnv } from 'src/shared/util/env.js';

export class TelegramConfig {
	@IsString()
	public TELEGRAM_BOT_TOKEN: string;

	@IsString()
	public TELEGRAM_CHAT_ID: string;

	@IsBoolean()
	@IsOptional()
	@Transform(v => v.value === 'true')
	public TELEGRAM_IS_DISABLED: boolean = false;
}

const telegramConfig = validateEnv(TelegramConfig);
export { telegramConfig };
