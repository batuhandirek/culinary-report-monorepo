import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import dayjs from 'dayjs';

import { EmailService } from 'src/modules/email/services/email.service.js';
import { OtpService } from 'src/modules/otp/services/otp.service.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { ACCOUNT_DELETION_GRACE_PERIOD_DAYS } from '../constants/account-deletion.constant.js';
import { DeleteAccountsCron } from '../crons/delete-accounts.cron.js';
import { User } from '../entities/user.entity.js';
import { AccountNoticeService } from '../services/account-notice.service.js';
import { JwtService } from '../services/jwt.service.js';
import { PasswordService } from '../services/password.service.js';
import { UserService } from '../services/user.service.js';
import { VerificationService } from '../services/verification.service.js';

import { userFactory } from './factories/user.factory.js';

/* What is done to an account is mailed to its owner, who may not be the one who did it. */
describe('account notices (pglite)', () => {
	let harness: PgliteTestingModule;
	let notices: AccountNoticeService;
	let verificationService: VerificationService;
	let deleteAccounts: DeleteAccountsCron;

	const emailService = {
		queueEmail: jest.fn<EmailService['queueEmail']>(async () => undefined),
	};
	const otpService = { sendOtp: jest.fn<OtpService['sendOtp']>(async () => undefined) };
	const mails = () => emailService.queueEmail.mock.calls.map(([mail]) => mail);

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				AccountNoticeService,
				VerificationService,
				DeleteAccountsCron,
				UserService,
				PasswordService,
				JwtService,
				{ provide: OtpService, useValue: otpService },
				{ provide: EmailService, useValue: emailService },
			],
		});
		notices = harness.moduleRef.get(AccountNoticeService);
		verificationService = harness.moduleRef.get(VerificationService);
		deleteAccounts = harness.moduleRef.get(DeleteAccountsCron);
		entityManagerManager.setEntityManager(harness.orm.em);
	});

	afterAll(async () => {
		await harness.stop();
	});

	beforeEach(() => {
		emailService.queueEmail.mockClear();
	});

	it('a changed e-mail address is told to the address the account left', async () => {
		const user = await userFactory.create({ email: 'eski@test.com' });
		const { verificationToken, verificationRequest } =
			await verificationService.validateAndCreateForEmailChange(
				user,
				{ email: 'yeni@test.com' },
				{},
			);
		emailService.queueEmail.mockClear(); // the code, to the new address

		await verificationService.verifyAndHandle({
			token: verificationToken,
			code: verificationRequest.code,
		});

		expect((await harness.orm.em.fork().findOneOrFail(User, user.id)).email).toBe(
			'yeni@test.com',
		);
		const [notice] = mails();
		expect(notice.to).toEqual({ email: 'eski@test.com' });
		expect(notice.subject).toBe('E-posta adresin değişti');
		// The old address learns that a new one exists, not what it is.
		expect(notice.html).toContain('y•••@test.com');
		expect(notice.html).not.toContain('yeni@test.com');
	});

	it('a changed password is told to the account', async () => {
		await notices.passwordChanged({ email: 'sahip@test.com' });

		const [notice] = mails();
		expect(notice.to).toEqual({ email: 'sahip@test.com' });
		expect(notice.subject).toBe('Şifren değişti');
		expect(notice.html).toContain('/auth/forgot-password');
	});

	it('a deletion request is confirmed with the day the account goes', async () => {
		await notices.deletionScheduled({
			email: 'giden@test.com',
			firstName: 'Ada',
			markedForDeletionAt: new Date('2026-10-06T09:00:00Z'),
		});

		const [notice] = mails();
		expect(notice.subject).toBe('Hesap silme isteğini aldık');
		expect(ACCOUNT_DELETION_GRACE_PERIOD_DAYS).toBe(8);
		expect(notice.html).toContain('14 Ekim 2026');
		expect(notice.html).toContain('/profil/guvenlik');
	});

	it('an account past its grace period is deleted, and told so at its old address', async () => {
		const gone = await userFactory.create({
			email: 'silinen@test.com',
			firstName: 'Ada',
			isMarkedForDeletion: true,
			markedForDeletionAt: dayjs()
				.subtract(ACCOUNT_DELETION_GRACE_PERIOD_DAYS + 1, 'days')
				.toDate(),
		});
		const waiting = await userFactory.create({
			email: 'bekleyen@test.com',
			isMarkedForDeletion: true,
			markedForDeletionAt: new Date(),
		});

		await deleteAccounts.handleCron();

		const em = harness.orm.em.fork();
		expect(await em.findOne(User, gone.id)).toBeNull();
		expect(await em.findOne(User, waiting.id)).not.toBeNull();
		expect(mails()).toHaveLength(1);
		const [notice] = mails();
		expect(notice.to).toEqual({ email: 'silinen@test.com' });
		expect(notice.subject).toBe('Hesabın silindi');
		expect(notice.text).toContain('Merhaba Ada,');
	});

	it('a notice that cannot be queued does not fail what it reports', async () => {
		emailService.queueEmail.mockRejectedValueOnce(new Error('queue down'));
		await expect(notices.passwordChanged({ email: 'sahip@test.com' })).resolves.toBeUndefined();
	});
});
