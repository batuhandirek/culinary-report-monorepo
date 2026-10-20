import { Module } from '@nestjs/common';

import { NotificationPreferencesModule } from 'src/modules/notification-preferences/notification-preferences.module.js';

import { SmsService } from './services/sms.service.js';
import { SendSmsWorker } from './workers/send-sms.worker.js';

@Module({
	imports: [NotificationPreferencesModule],
	providers: [SmsService, SendSmsWorker],
	exports: [SmsService],
})
export class SmsModule {}
