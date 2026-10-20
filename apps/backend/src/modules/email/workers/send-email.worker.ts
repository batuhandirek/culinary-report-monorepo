import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable, Logger } from '@nestjs/common';

import { BrevoClient } from '@getbrevo/brevo';
import { JobWithMetadata } from 'pg-boss';

import { EmailRecipient } from 'src/modules/email/interfaces/email-recipient.interface.js';
import { SendEmailJob, SendEmailJobPayload } from 'src/modules/email/jobs/send-email.job.js';
import { OnJob } from 'src/modules/pgboss/decorators/on-job.decorator.js';

import { emailConfig } from '../config/email.config.js';

@Injectable()
export class SendEmailWorker {
	private readonly logger = new Logger(SendEmailWorker.name);
	private sender: EmailRecipient;
	private replyTo: EmailRecipient;
	constructor(
		private readonly orm: MikroORM,
		private brevo: BrevoClient,
	) {
		this.sender = {
			email: emailConfig.EMAIL_SENDER_EMAIL,
			name: emailConfig.EMAIL_SENDER_NAME,
		};
		this.replyTo = {
			email: emailConfig.EMAIL_SENDER_EMAIL,
			name: emailConfig.EMAIL_SENDER_EMAIL,
		};
	}

	@OnJob(SendEmailJob.jobName, { retryLimit: 20, localConcurrency: 10 })
	@EnsureRequestContext()
	async onSendEmailJob(job: JobWithMetadata<SendEmailJobPayload>) {
		const { data } = job;
		this.log(`Sending email "${data.subject}" - ${data.to.email}`);
		if (emailConfig.EMAIL_IS_DISABLED) {
			this.log('Send email is invoked, but is disabled.');
			return;
		}

		try {
			await this.brevo.transactionalEmails.sendTransacEmail({
				subject: data.subject,
				htmlContent: data.html,
				textContent: data.text,
				sender: this.sender,
				to: [{ email: data.to.email!, name: data.to.name }],
			});
		} catch (e) {
			const error = e as Error;
			this.logger.warn(`Failed to send an email: ${error.message}`);
			throw new Error(`Failed to send an email: ${error.message}`);
		}
	}

	private log(msg: string) {
		if (emailConfig.EMAIL_IS_VERBOSE) {
			this.logger.log(msg);
		}
	}
}
