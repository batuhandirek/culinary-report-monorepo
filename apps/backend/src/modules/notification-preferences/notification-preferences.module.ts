import { MikroOrmModule } from '@mikro-orm/nestjs';

import { Module } from '@nestjs/common';

import { NotificationPreference } from './entities/notification-preference.entity.js';
import { NotificationPreferenceService } from './services/notification-preference.service.js';

// Depends on nothing but the ORM, so the sender modules (push, email, sms) and auth can
// all import it without a cycle.
@Module({
	imports: [MikroOrmModule.forFeature([NotificationPreference])],
	providers: [NotificationPreferenceService],
	exports: [NotificationPreferenceService],
})
export class NotificationPreferencesModule {}
