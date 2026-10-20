import { HttpException } from '@nestjs/common';

import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { ExceptionCodes } from 'exceptions';

import { EmailService } from 'src/modules/email/services/email.service.js';
import { OtpService } from 'src/modules/otp/services/otp.service.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { CredentialVerificationRequestTypeEnum } from '../constants/credential-verification-request-type.enum.constant.js';
import {
	VERIFICATION_MAX_SENDS_PER_WINDOW,
	VERIFICATION_RESEND_COOLDOWN_SECONDS,
	VERIFICATION_SEND_WINDOW_MINUTES,
} from '../constants/verification-throttle.constant.js';
import { CredentialVerificationRequest } from '../entities/credential-verification-request.entity.js';
import { User } from '../entities/user.entity.js';
import { JwtService } from '../services/jwt.service.js';
import { PasswordService } from '../services/password.service.js';
import { VerificationService } from '../services/verification.service.js';

import { userFactory } from './factories/user.factory.js';

/* The resend path, which used to delete the pending request and mint a fresh code on every
 * call — so two taps left the user holding a code the server had already thrown away, and
 * nothing capped the SMS bill. */

describe('VerificationService resend throttling (pglite)', () => {
	let harness: PgliteTestingModule;
	let service: VerificationService;

	const otpService = {
		sendOtp: jest.fn<OtpService['sendOtp']>(async () => undefined),
	};
	const emailService = {
		queueEmail: jest.fn<EmailService['queueEmail']>(async () => undefined),
	};

	const mobileNumber = '+905322934269';
	const password = 'sifre12345';
	const signup = { firstName: 'Ada', lastName: 'Yilmaz', acceptedMarketing: false };

	const requestSignup = (overrides: { password?: string } = {}) =>
		service.validateAndCreateForMobileNumberSignup(
			{ mobileNumber, password: overrides.password ?? password, ...signup },
			{},
		);

	const pendingRequest = async (): Promise<CredentialVerificationRequest> =>
		harness.orm.em.fork().findOneOrFail(CredentialVerificationRequest, {
			mobileNumber,
			verifiedAt: { $eq: null },
		});

	/** Rewinds the row's clock so the next call lands past the cooldown / window. */
	const ageLastSentBy = async (minutes: number) => {
		const em = harness.orm.em.fork();
		const request = await em.findOneOrFail(CredentialVerificationRequest, {
			mobileNumber,
			verifiedAt: { $eq: null },
		});
		request.lastSentAt = new Date(Date.now() - minutes * 60 * 1000);
		await em.flush();
	};

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				VerificationService,
				PasswordService,
				JwtService,
				{ provide: OtpService, useValue: otpService },
				{ provide: EmailService, useValue: emailService },
			],
		});
		service = harness.moduleRef.get(VerificationService);
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

	it('sends one code for the first request', async () => {
		await requestSignup();

		expect(otpService.sendOtp).toHaveBeenCalledTimes(1);
		const request = await pendingRequest();
		expect(request.sendCount).toBe(1);
	});

	it('returns the in-flight code without sending again while inside the cooldown', async () => {
		const first = await requestSignup();
		const firstCode = first.verificationRequest.code;
		otpService.sendOtp.mockClear();

		const second = await requestSignup();
		const third = await requestSignup();

		expect(otpService.sendOtp).not.toHaveBeenCalled();
		// The code the first SMS carried is still the live one — this is what stopped users
		// from ever entering a valid code.
		expect(second.verificationRequest.code).toBe(firstCode);
		expect(third.verificationRequest.code).toBe(firstCode);
		const request = await pendingRequest();
		expect(request.sendCount).toBe(1);
	});

	it('resends the same code once the cooldown has passed, so an earlier SMS stays valid', async () => {
		const first = await requestSignup();
		const firstCode = first.verificationRequest.code;
		const firstIdentifier = first.verificationRequest.identifier;
		otpService.sendOtp.mockClear();

		await ageLastSentBy(VERIFICATION_RESEND_COOLDOWN_SECONDS / 60 + 1);
		const second = await requestSignup();

		expect(otpService.sendOtp).toHaveBeenCalledTimes(1);
		expect(otpService.sendOtp.mock.calls[0][0].code).toBe(firstCode);
		expect(second.verificationRequest.code).toBe(firstCode);
		expect(second.verificationRequest.identifier).toBe(firstIdentifier);
		const request = await pendingRequest();
		expect(request.sendCount).toBe(2);
	});

	it('refuses to send once the budget for the window is spent', async () => {
		await requestSignup();
		for (let i = 1; i < VERIFICATION_MAX_SENDS_PER_WINDOW; i++) {
			await ageLastSentBy(VERIFICATION_RESEND_COOLDOWN_SECONDS / 60 + 1);
			await requestSignup();
		}
		expect(otpService.sendOtp).toHaveBeenCalledTimes(VERIFICATION_MAX_SENDS_PER_WINDOW);
		otpService.sendOtp.mockClear();

		await ageLastSentBy(VERIFICATION_RESEND_COOLDOWN_SECONDS / 60 + 1);
		await expect(requestSignup()).rejects.toMatchObject({
			response: { code: ExceptionCodes.TOO_MANY_VERIFICATION_REQUESTS },
		});
		await expect(requestSignup()).rejects.toBeInstanceOf(HttpException);
		expect(otpService.sendOtp).not.toHaveBeenCalled();
	});

	it('lets the budget recover after the window goes idle', async () => {
		await requestSignup();
		for (let i = 1; i < VERIFICATION_MAX_SENDS_PER_WINDOW; i++) {
			await ageLastSentBy(VERIFICATION_RESEND_COOLDOWN_SECONDS / 60 + 1);
			await requestSignup();
		}
		otpService.sendOtp.mockClear();

		await ageLastSentBy(VERIFICATION_SEND_WINDOW_MINUTES + 1);
		await requestSignup();

		expect(otpService.sendOtp).toHaveBeenCalledTimes(1);
		const request = await pendingRequest();
		expect(request.sendCount).toBe(1);
	});

	it('reissues the code when the same number signs up under a different password, and charges the budget for it', async () => {
		const first = await requestSignup();
		// Snapshot: the reissue mutates this very row, so reading it back after the call would
		// show the new values on both sides of the comparison.
		const { code: firstCode, identifier: firstIdentifier } = { ...first.verificationRequest };
		await ageLastSentBy(VERIFICATION_RESEND_COOLDOWN_SECONDS / 60 + 1);
		otpService.sendOtp.mockClear();

		const second = await requestSignup({ password: 'bambaskabirsifre' });

		expect(otpService.sendOtp).toHaveBeenCalledTimes(1);
		expect(second.verificationRequest.code).not.toBe(firstCode);
		expect(second.verificationRequest.identifier).not.toBe(firstIdentifier);
		// One row, not two: a second password must not multiply pending requests.
		const em = harness.orm.em.fork();
		expect(await em.count(CredentialVerificationRequest, { mobileNumber })).toBe(1);
		const request = await pendingRequest();
		expect(request.sendCount).toBe(2);
	});

	it('a password the caller cannot match still cannot outspend the budget', async () => {
		await requestSignup();
		for (let i = 1; i < VERIFICATION_MAX_SENDS_PER_WINDOW; i++) {
			await ageLastSentBy(VERIFICATION_RESEND_COOLDOWN_SECONDS / 60 + 1);
			await requestSignup();
		}
		otpService.sendOtp.mockClear();

		await ageLastSentBy(VERIFICATION_RESEND_COOLDOWN_SECONDS / 60 + 1);
		await expect(requestSignup({ password: 'yepyenibirsifre' })).rejects.toMatchObject({
			response: { code: ExceptionCodes.TOO_MANY_VERIFICATION_REQUESTS },
		});
		expect(otpService.sendOtp).not.toHaveBeenCalled();
	});

	it('reissues an expired request instead of leaving the caller with a dead code', async () => {
		const first = await requestSignup();
		const firstCode = `${first.verificationRequest.code}`;
		const em = harness.orm.em.fork();
		const request = await em.findOneOrFail(CredentialVerificationRequest, {
			mobileNumber,
			verifiedAt: { $eq: null },
		});
		request.expiresAt = new Date(Date.now() - 1000);
		request.lastSentAt = new Date(Date.now() - 10 * 60 * 1000);
		await em.flush();
		otpService.sendOtp.mockClear();

		const second = await requestSignup();

		expect(otpService.sendOtp).toHaveBeenCalledTimes(1);
		expect(second.verificationRequest.code).not.toBe(firstCode);
		expect(second.verificationRequest.expiresAt.getTime()).toBeGreaterThan(Date.now());
	});

	it('keeps two accounts changing to the same number on separate requests', async () => {
		const [alice, bob] = [
			userFactory.build({ email: 'alice@test.com' }),
			userFactory.build({ email: 'bob@test.com' }),
		];
		await harness.orm.em.flush();

		const aliceRequest = await service.validateAndCreateForMobileNumberChange(
			alice,
			{ mobileNumber },
			{},
		);
		const bobRequest = await service.validateAndCreateForMobileNumberChange(
			bob,
			{ mobileNumber },
			{},
		);

		// Bob must not be handed Alice's row: verifying it would move the number onto her account.
		expect(bobRequest.verificationRequest.id).not.toBe(aliceRequest.verificationRequest.id);
		expect(otpService.sendOtp).toHaveBeenCalledTimes(2);

		// Alice verifies first and takes the number; Bob's code is now unusable, but as a
		// handled error rather than a unique-constraint 500.
		await service.verifyAndHandle({
			token: aliceRequest.verificationToken,
			code: aliceRequest.verificationRequest.code,
		});
		await expect(
			service.verifyAndHandle({
				token: bobRequest.verificationToken,
				code: bobRequest.verificationRequest.code,
			}),
		).rejects.toMatchObject({ response: { code: ExceptionCodes.USER_ALREADY_EXISTS } });

		const fresh = harness.orm.em.fork();
		expect((await fresh.findOneOrFail(User, alice.id)).mobileNumber).toBe(mobileNumber);
		expect((await fresh.findOneOrFail(User, bob.id)).mobileNumber).toBeNull();
	});

	it('throttles a change-mobile-number request, which carries no password to compare', async () => {
		const user = userFactory.build({ email: 'carol@test.com' });
		await harness.orm.em.flush();

		const first = await service.validateAndCreateForMobileNumberChange(
			user,
			{ mobileNumber },
			{},
		);
		otpService.sendOtp.mockClear();

		const second = await service.validateAndCreateForMobileNumberChange(
			user,
			{ mobileNumber },
			{},
		);

		expect(otpService.sendOtp).not.toHaveBeenCalled();
		expect(second.verificationRequest.code).toBe(first.verificationRequest.code);
	});

	it('marks the verification type on the row it reuses', async () => {
		await requestSignup();
		const request = await pendingRequest();
		expect(request.type).toBe(CredentialVerificationRequestTypeEnum.SIGNUP_MOBILE_NUMBER);
	});
});
