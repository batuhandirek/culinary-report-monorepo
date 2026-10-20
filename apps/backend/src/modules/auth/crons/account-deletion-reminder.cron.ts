import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable, Logger } from '@nestjs/common';

import { AccountDeletionReminderEmail } from 'emails';
import moment from 'moment-timezone';

import { EmailService } from 'src/modules/email/services/email.service.js';
import { renderEmail } from 'src/modules/email/util/render-email.js';
import { CronExpression } from 'src/modules/pgboss/constants/cron-expression.constant.js';
import { OnCron } from 'src/modules/pgboss/decorators/on-cron.decorator.js';

import { ACCOUNT_DELETION_GRACE_PERIOD_DAYS } from '../constants/account-deletion.constant.js';
import { UserRepository } from '../repositories/user.repository.js';

@Injectable()
export class AccountDeletionReminderCron {
	private readonly logger = new Logger(AccountDeletionReminderCron.name);

	constructor(
		private readonly orm: MikroORM,
		private userRepository: UserRepository,
		private emailService: EmailService,
	) {}

	// Runs every morning. Reminds users whose account will be permanently deleted
	// tomorrow (i.e. their grace period ends within the next day).
	@OnCron('account-deletion-reminder', CronExpression.EVERY_DAY_AT_11AM)
	@EnsureRequestContext()
	async handleCron() {
		// Deletion happens GRACE days after the request, and the reminder goes out
		// the day before. We match on the calendar day the reminder is due (not an
		// exact timestamp) so the account is caught regardless of what time of day
		// this cron runs.
		const reminderDay = moment().subtract(ACCOUNT_DELETION_GRACE_PERIOD_DAYS - 1, 'days');
		const users = await this.userRepository.find({
			isMarkedForDeletion: true,
			markedForDeletionAt: {
				$gte: reminderDay.clone().startOf('day').toDate(),
				$lte: reminderDay.clone().endOf('day').toDate(),
			},
		});

		for (const user of users) {
			if (!user.email) continue;

			await this.emailService
				.queueEmail({
					to: { email: user.email },
					subject: 'Hesabın yarın siliniyor',
					...(await renderEmail(AccountDeletionReminderEmail, {
						user: { firstName: user.firstName },
					})),
				})
				.catch(() => {
					this.logger.warn(
						`Failed to queue account deletion reminder email for user ${user.id}`,
					);
				});
		}
	}
}
