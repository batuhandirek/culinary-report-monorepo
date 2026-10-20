import { Injectable, Logger } from '@nestjs/common';

import { Telegraf } from 'telegraf';

import { telegramConfig } from '../config/telegram.config.js';

@Injectable()
export class TelegramService {
	private readonly logger = new Logger(TelegramService.name);
	private readonly bot: Telegraf;
	constructor() {
		this.bot = new Telegraf(telegramConfig.TELEGRAM_BOT_TOKEN);
	}

	async trySendMessage(text: string): Promise<void> {
		if (telegramConfig.TELEGRAM_IS_DISABLED) {
			this.logger.warn(
				'Telegram notifications are disabled. Skipping sending message: ' + text,
			);
			return;
		}

		try {
			await this.bot.telegram.sendMessage(telegramConfig.TELEGRAM_CHAT_ID, text);
		} catch (error) {
			this.logger.error(`Failed to send Telegram message: ${error.message}`);
		}
	}
}
