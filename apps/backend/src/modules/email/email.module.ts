import { Module } from '@nestjs/common';

import { NotificationPreferencesModule } from 'src/modules/notification-preferences/notification-preferences.module.js';

import { brevoProvider } from './providers/brevo.provider.js';
import { EmailService } from './services/email.service.js';
import { SendEmailWorker } from './workers/send-email.worker.js';

@Module({
	imports: [NotificationPreferencesModule],
	providers: [EmailService, brevoProvider, SendEmailWorker],
	exports: [EmailService],
})
export class EmailModule {}
