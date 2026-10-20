import { Injectable } from '@nestjs/common';

import { NotificationPreferenceTarget } from 'src/modules/notification-preferences/constants/notification-preferences.constant.js';
import { NotificationPreferenceService } from 'src/modules/notification-preferences/services/notification-preference.service.js';
import { PgBossService } from 'src/modules/pgboss/pgboss.service.js';

import { SendEmailInputDto } from '../dto/send-email.input.dto.js';
import { SendEmailJob } from '../jobs/send-email.job.js';

@Injectable()
export class EmailService {
	constructor(
		private pgBossService: PgBossService,
		private notificationPreferenceService: NotificationPreferenceService,
	) {}

	/**
	 * `preference` makes the mail answer to a topic switch on `/profil/izinler`: with that
	 * topic's e-mail off nothing is queued. Without it the mail always goes (codes,
	 * account and security notices).
	 */
	async queueEmail(
		opts: SendEmailInputDto,
		options?: { highPriority?: boolean; preference?: NotificationPreferenceTarget },
	) {
		// Not every account has an address (phone signups), and a job without one would
		// only fail and retry.
		if (!opts.to.email) return;
		const { preference } = options ?? {};
		if (
			preference &&
			!(await this.notificationPreferenceService.isOn(
				preference.userId,
				preference.topic,
				'email',
			))
		) {
			return;
		}
		await this.pgBossService.sendJob(
			SendEmailJob.jobName,
			new SendEmailJob(opts),
			options?.highPriority ? { priority: 99 } : { priority: 1 },
		);
	}
}
