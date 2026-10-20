import { Module } from '@nestjs/common';

import { TelegramService } from './services/telegram.service.js';

@Module({
	providers: [TelegramService],
	exports: [TelegramService],
})
export class TelegramModule {}
