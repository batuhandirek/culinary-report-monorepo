import { BadRequestException } from '@nestjs/common';

import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { ExceptionCodes } from 'exceptions';

import { EmailService } from 'src/modules/email/services/email.service.js';
import { OtpService } from 'src/modules/otp/services/otp.service.js';
import { Platform } from 'src/shared/constants/platform.enum.const.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { CredentialVerificationRequest } from '../entities/credential-verification-request.entity.js';
import { User } from '../entities/user.entity.js';
import { JwtService } from '../services/jwt.service.js';
import { LoginService } from '../services/login.service.js';
import { PasswordService } from '../services/password.service.js';
import { UserService } from '../services/user.service.js';
import { VerificationService } from '../services/verification.service.js';

/* Verifying a signup creates the account, and the row that created it has to point at that
 * account. Unlinked, it survives the account's deletion still holding the password hash and
 * name — and `checkForEmailLogin` would rebuild the account from it. */

describe('signup verification account linkage (pglite)', () => {
	let harness: PgliteTestingModule;
	let verificationService: VerificationService;
	let loginService: LoginService;
	let userService: UserService;

	const otpService = { sendOtp: jest.fn<OtpService['sendOtp']>(async () => undefined) };
	const emailService = {
		queueEmail: jest.fn<EmailService['queueEmail']>(async () => undefined),
	};

	const email = 'silinecek@test.com';
	const password = 'sifre12345';

	const signUpAndVerify = async () => {
		const { verificationToken, verificationRequest } =
			await verificationService.validateAndCreateForEmailSignup(
				{
					email,
					password,
					firstName: 'Ada',
					lastName: 'Yilmaz',
					acceptedTerms: true,
					acceptedMarketing: false,
				},
				{},
			);
		await verificationService.verifyAndHandle({
			token: verificationToken,
			code: verificationRequest.code,
		});
		return verificationRequest;
	};

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				VerificationService,
				LoginService,
				UserService,
				PasswordService,
				JwtService,
				{ provide: OtpService, useValue: otpService },
				{ provide: EmailService, useValue: emailService },
			],
		});
		verificationService = harness.moduleRef.get(VerificationService);
		loginService = harness.moduleRef.get(LoginService);
		userService = harness.moduleRef.get(UserService);
		entityManagerManager.setEntityManager(harness.orm.em);
	});

	afterAll(async () => {
		await harness.stop();
	});

	beforeEach(async () => {
		otpService.sendOtp.mockClear();
		emailService.queueEmail.mockClear();
		const em = harness.orm.em.fork();
		await em.nativeDelete(CredentialVerificationRequest, {});
		await em.nativeDelete(User, {});
		harness.orm.em.clear();
	});

	it('points the verified request at the account it created', async () => {
		const request = await signUpAndVerify();

		const em = harness.orm.em.fork();
		const stored = await em.findOneOrFail(
			CredentialVerificationRequest,
			{ id: request.id },
			{ populate: ['user'] },
		);
		const user = await em.findOneOrFail(User, { email });
		expect(stored.user?.id).toBe(user.id);
	});

	it('takes the signup request with the account when the account is deleted', async () => {
		await signUpAndVerify();

		const em = harness.orm.em.fork();
		await userService.deleteUser(await em.findOneOrFail(User, { email }));

		const fresh = harness.orm.em.fork();
		expect(await fresh.count(CredentialVerificationRequest, { email })).toBe(0);
	});

	it('will not rebuild a deleted account from a leftover verified request', async () => {
		await signUpAndVerify();
		// The pre-fix orphan: an account gone, its verified signup row left behind.
		const em = harness.orm.em.fork();
		const request = await em.findOneOrFail(CredentialVerificationRequest, { email });
		request.user = undefined;
		await em.flush();
		await em.nativeDelete(User, { email });
		emailService.queueEmail.mockClear();

		await expect(
			loginService.loginWithEmail({ email, password }, {}, Platform.WEB),
		).rejects.toThrow(BadRequestException);
		await expect(
			loginService.loginWithEmail({ email, password }, {}, Platform.WEB),
		).rejects.toMatchObject({ response: { code: ExceptionCodes.INVALID_CREDENTIALS } });
		// No code went out, and no account came back.
		expect(emailService.queueEmail).not.toHaveBeenCalled();
		const fresh = harness.orm.em.fork();
		expect(await fresh.count(User, { email })).toBe(0);
	});

	it('still resends for a signup that was never verified', async () => {
		await verificationService.validateAndCreateForEmailSignup(
			{
				email,
				password,
				firstName: 'Ada',
				lastName: 'Yilmaz',
				acceptedTerms: true,
				acceptedMarketing: false,
			},
			{},
		);
		// Age it past the cooldown so a login attempt is allowed to deliver again.
		const em = harness.orm.em.fork();
		const request = await em.findOneOrFail(CredentialVerificationRequest, { email });
		request.lastSentAt = new Date(Date.now() - 5 * 60 * 1000);
		await em.flush();
		emailService.queueEmail.mockClear();

		const result = await loginService.loginWithEmail({ email, password }, {}, Platform.WEB);

		expect('verificationToken' in result).toBe(true);
	});
});
