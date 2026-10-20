import { describe, expect, it, jest } from '@jest/globals';

import { NotificationPreferenceService } from 'src/modules/notification-preferences/services/notification-preference.service.js';
import { PgBossService } from 'src/modules/pgboss/pgboss.service.js';

import { SendEmailJob } from '../jobs/send-email.job.js';
import { EmailService } from '../services/email.service.js';

describe('EmailService', () => {
	const sendJob = jest.fn<PgBossService['sendJob']>(async () => undefined as never);
	const isOn = jest.fn<NotificationPreferenceService['isOn']>(async () => true);
	const service = new EmailService(
		{ sendJob } as unknown as PgBossService,
		{ isOn } as unknown as NotificationPreferenceService,
	);
	const mail = { subject: 'Konu', html: '<p>Merhaba</p>', text: 'Merhaba' };

	it('queues a mail with both bodies', async () => {
		sendJob.mockClear();
		await service.queueEmail({ ...mail, to: { email: 'a@test.com' } });
		expect(sendJob).toHaveBeenCalledWith(
			SendEmailJob.jobName,
			expect.objectContaining({ payload: { ...mail, to: { email: 'a@test.com' } } }),
			{ priority: 1 },
		);
	});

	// An account opened with a phone number: a job for it could only fail and retry.
	it('queues nothing for a recipient with no address', async () => {
		sendJob.mockClear();
		await service.queueEmail({ ...mail, to: { email: null } });
		await service.queueEmail({ ...mail, to: {} });
		expect(sendJob).not.toHaveBeenCalled();
	});

	it('asks the topic switch only when the mail names one, and queues nothing while it is off', async () => {
		sendJob.mockClear();
		await service.queueEmail({ ...mail, to: { email: 'a@test.com' } });
		expect(isOn).not.toHaveBeenCalled();
		expect(sendJob).toHaveBeenCalledTimes(1);

		sendJob.mockClear();
		isOn.mockResolvedValueOnce(false);
		await service.queueEmail(
			{ ...mail, to: { email: 'a@test.com' } },
			{ preference: { userId: 'user-1', topic: 'reports' } },
		);
		expect(isOn).toHaveBeenCalledWith('user-1', 'reports', 'email');
		expect(sendJob).not.toHaveBeenCalled();
	});
});
