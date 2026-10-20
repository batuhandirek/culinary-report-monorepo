import { Injectable, Logger } from '@nestjs/common';

import dayjs from 'dayjs';
import {
	AccountDeletedEmail,
	AccountDeletionScheduledEmail,
	EmailChangedEmail,
	PasswordChangedEmail,
} from 'emails';

import { EmailService } from 'src/modules/email/services/email.service.js';
import { renderEmail } from 'src/modules/email/util/render-email.js';

import { ACCOUNT_DELETION_GRACE_PERIOD_DAYS } from '../constants/account-deletion.constant.js';
import { User } from '../entities/user.entity.js';

type Mail = Awaited<ReturnType<typeof renderEmail>>;

/**
 * Mails that tell an account's owner something was done to it: a credential changed, a
 * deletion was asked for or carried out. The owner may not be who did it, which is the
 * point of telling them. Never throws: a notice that can't be queued must not undo what
 * it reports.
 */
@Injectable()
export class AccountNoticeService {
	private readonly logger = new Logger(AccountNoticeService.name);

	constructor(private readonly emailService: EmailService) {}

	async passwordChanged(user: Pick<User, 'email'>) {
		await this.send(user.email, 'Şifren değişti', () =>
			renderEmail(PasswordChangedEmail, { changedAt: new Date() }),
		);
	}

	/** To the address the account left; the new one confirmed the change itself. */
	async emailChanged(oldEmail: string | null | undefined, newEmail: string) {
		if (oldEmail === newEmail) return;
		await this.send(oldEmail, 'E-posta adresin değişti', () =>
			renderEmail(EmailChangedEmail, { newEmail: this.mask(newEmail) }),
		);
	}

	async deletionScheduled(user: Pick<User, 'email' | 'firstName' | 'markedForDeletionAt'>) {
		await this.send(user.email, 'Hesap silme isteğini aldık', () =>
			renderEmail(AccountDeletionScheduledEmail, {
				user: { firstName: user.firstName },
				deletionDate: dayjs(user.markedForDeletionAt)
					.add(ACCOUNT_DELETION_GRACE_PERIOD_DAYS, 'days')
					.toDate(),
			}),
		);
	}

	/** After the account is gone: pass what it was called, read before the delete. */
	async deleted(account: { email?: string | null; firstName: string }) {
		await this.send(account.email, 'Hesabın silindi', () =>
			renderEmail(AccountDeletedEmail, { user: { firstName: account.firstName } }),
		);
	}

	private async send(
		to: string | null | undefined,
		subject: string,
		render: () => Promise<Mail>,
	) {
		try {
			await this.emailService.queueEmail({ to: { email: to }, subject, ...(await render()) });
		} catch (e) {
			this.logger.warn(`Failed to queue "${subject}" notice: ${(e as Error).message}`);
		}
	}

	// The old address learns that a new one exists, not what it is.
	private mask(email: string) {
		const [local, domain] = email.split('@');
		return `${local[0]}•••@${domain}`;
	}
}
