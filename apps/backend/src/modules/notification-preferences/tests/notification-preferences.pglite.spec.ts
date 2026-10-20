import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { UserService } from 'src/modules/auth/services/user.service.js';
import { userFactory } from 'src/modules/auth/tests/factories/user.factory.js';
import { SendEmailJob } from 'src/modules/email/jobs/send-email.job.js';
import { EmailService } from 'src/modules/email/services/email.service.js';
import { PgBossService } from 'src/modules/pgboss/pgboss.service.js';
import { SendSmsJob } from 'src/modules/sms/jobs/send-sms.job.js';
import { SmsService } from 'src/modules/sms/services/sms.service.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { NotificationPreferenceService } from '../services/notification-preference.service.js';

/* What a user switched off on their profile is not queued, and a campaign only reaches
 * those who agreed to it. The senders are real here; only the queue is watched. */
describe('Notification preferences and promotional consent (pglite)', () => {
	let harness: PgliteTestingModule;
	let userService: UserService;
	let preferences: NotificationPreferenceService;
	let emailService: EmailService;
	let smsService: SmsService;
	const pgBossService = {
		sendJob: jest.fn<PgBossService['sendJob']>(async () => undefined as never),
	};
	const queuedJobs = (name: string) =>
		pgBossService.sendJob.mock.calls.filter(([jobName]) => jobName === name);

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				EmailService,
				SmsService,
				UserService,
				NotificationPreferenceService,
				{ provide: PgBossService, useValue: pgBossService },
			],
		});
		userService = harness.moduleRef.get(UserService);
		preferences = harness.moduleRef.get(NotificationPreferenceService);
		emailService = harness.moduleRef.get(EmailService);
		smsService = harness.moduleRef.get(SmsService);
		entityManagerManager.setEntityManager(harness.orm.em);
	});

	afterAll(async () => {
		await harness.stop();
	});

	beforeEach(() => {
		pgBossService.sendJob.mockClear();
	});

	it('reports every switch, all on by default', async () => {
		const user = await userFactory.create();

		expect(await preferences.getAll(user.id)).toEqual({
			reports: { email: true },
			alerts: { email: true, sms: true },
		});
	});

	it('changes only the switches a patch names', async () => {
		const user = await userFactory.create();
		await preferences.update(user.id, { alerts: { sms: false } });
		await harness.orm.em.flush();

		expect(await preferences.getAll(user.id)).toEqual({
			reports: { email: true },
			alerts: { email: true, sms: false },
		});
	});

	it('skips the mail of a topic whose mail is off, and leaves other topics alone', async () => {
		const user = await userFactory.create({ email: 'owner@test.com' });
		await preferences.update(user.id, { reports: { email: false } });
		await harness.orm.em.flush();

		const mail = { to: { email: user.email! }, subject: 'Report', html: '<p>Report</p>' };
		await emailService.queueEmail(mail as never, {
			preference: { userId: user.id, topic: 'reports' },
		});
		expect(queuedJobs(SendEmailJob.jobName)).toHaveLength(0);

		await emailService.queueEmail(mail as never, {
			preference: { userId: user.id, topic: 'alerts' },
		});
		// A mail that names no topic (codes, account notices) always goes.
		await emailService.queueEmail(mail as never);
		expect(queuedJobs(SendEmailJob.jobName)).toHaveLength(2);
	});

	it('skips the SMS of a topic whose SMS is off, and one for an account with no number', async () => {
		const user = await userFactory.create({ mobileNumber: '+4915112345678' });
		const alerts = { preference: { userId: user.id, topic: 'alerts' as const } };

		await smsService.queueSms(user.mobileNumber, 'New reviews need attention.', alerts);
		expect(queuedJobs(SendSmsJob.jobName)).toHaveLength(1);

		pgBossService.sendJob.mockClear();
		await preferences.update(user.id, { alerts: { sms: false } });
		await harness.orm.em.flush();
		await smsService.queueSms(user.mobileNumber, 'New reviews need attention.', alerts);
		// A code names no topic: it always goes.
		await smsService.queueSms(user.mobileNumber, 'Your code is 123456');
		await smsService.queueSms(null, 'New reviews need attention.');
		expect(queuedJobs(SendSmsJob.jobName)).toHaveLength(1);
		expect((queuedJobs(SendSmsJob.jobName)[0][1] as SendSmsJob).payload.message).toBe(
			'Your code is 123456',
		);
	});

	it('lets a campaign reach only users with the marketing consent and the channel consent', async () => {
		const agreed = userFactory.build({
			acceptedMarketing: true,
			acceptedEmailCommunications: true,
			acceptedSmsCommunications: false,
		});
		const noMarketing = userFactory.build({
			acceptedMarketing: false,
			acceptedEmailCommunications: true,
			acceptedSmsCommunications: true,
		});
		const noEmail = userFactory.build({
			acceptedMarketing: true,
			acceptedEmailCommunications: false,
			acceptedSmsCommunications: true,
		});
		await harness.orm.em.flush();
		harness.orm.em.clear();
		const ids = [agreed.id, noMarketing.id, noEmail.id];
		const reached = async (
			channel: Parameters<UserService['filterPromotionalRecipients']>[1],
		) => (await userService.filterPromotionalRecipients(ids, channel)).map(u => u.id).sort();

		expect(await reached('email')).toEqual([agreed.id]);
		expect(await reached('sms')).toEqual([noEmail.id]);
		expect(await reached('call')).toEqual([]);
	});
});
