import { Injectable } from '@nestjs/common';

import { NotificationPreferenceTarget } from 'src/modules/notification-preferences/constants/notification-preferences.constant.js';
import { NotificationPreferenceService } from 'src/modules/notification-preferences/services/notification-preference.service.js';
import { PgBossService } from 'src/modules/pgboss/pgboss.service.js';

import { SendSmsJob } from '../jobs/send-sms.job.js';

@Injectable()
export class SmsService {
	constructor(
		private pgBossService: PgBossService,
		private notificationPreferenceService: NotificationPreferenceService,
	) {}

	/**
	 * `preference` makes the SMS answer to a topic switch on `/profil/izinler`: with that
	 * topic's SMS off nothing is queued. Without it the SMS always goes (codes).
	 */
	async queueSms(
		to: string | null | undefined,
		message: string,
		options?: { preference?: NotificationPreferenceTarget },
	): Promise<void> {
		// Not every account has a number (e-mail signups).
		if (!to) return;
		const { preference } = options ?? {};
		if (
			preference &&
			!(await this.notificationPreferenceService.isOn(
				preference.userId,
				preference.topic,
				'sms',
			))
		) {
			return;
		}
		await this.pgBossService.sendJob(SendSmsJob.jobName, new SendSmsJob({ to, message }));
	}
}
