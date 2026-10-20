import { UnprocessableEntityException } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';

import { ExceptionCodes } from 'exceptions';

import { fail, getTestingModule } from 'src/tests/utils.js';

import { OtpService } from '../../../otp/services/otp.service.js';
import { UserRepository } from '../../repositories/user.repository.js';
import { JwtService } from '../../services/jwt.service.js';
import { VerificationService } from '../../services/verification.service.js';
import { credentialVerificationRequestFactory } from '../factories/credential-verification-request.factory.js';
import { userFactory } from '../factories/user.factory.js';

describe('VerificationService', () => {
	let module: TestingModule;
	let service: VerificationService;
	let jwtService: JwtService;
	let otpService: OtpService;
	let userRepository: UserRepository;

	beforeAll(async () => {
		module = await getTestingModule();
		service = module.get(VerificationService);
		jwtService = module.get(JwtService);
		otpService = module.get(OtpService);
		userRepository = module.get(UserRepository);
	});

	describe('validateAndCreateForMobileNumberSignup', () => {
		it('should reject if a user already exists with same mobile number', async () => {
			await userFactory.signedUpWithMobile('+905354589889', '12345678').create();
			try {
				await service.validateAndCreateForMobileNumberSignup(
					{
						firstName: 'FIRST',
						lastName: 'LAST',
						mobileNumber: '+905354589889',
						password: '12345678',
					},
					{},
				);
				fail();
			} catch (e) {
				expect(e).toBeInstanceOf(UnprocessableEntityException);
				expect(e.response.code).toBe(ExceptionCodes.USER_ALREADY_EXISTS);
			}
		});

		it('should not send OTP if there is already a non-expired verification request', async () => {
			const mobileNumber = '+905354589889';
			const password = '12345678';
			const firstName = 'firstName';
			const lastName = 'lastName';
			await credentialVerificationRequestFactory
				.mobileSignup(mobileNumber, password, { firstName, lastName })
				.create({ expiresAt: new Date(Date.now() + 10000) });

			const otpSpy = jest.spyOn(otpService, 'sendOtp');
			await service.validateAndCreateForMobileNumberSignup(
				{ mobileNumber, password, firstName, lastName },
				{},
			);
			expect(otpSpy).not.toHaveBeenCalled();
		});

		it('should create one and send OTP', async () => {
			const otpSpy = jest.spyOn(otpService, 'sendOtp');
			await service.validateAndCreateForMobileNumberSignup(
				{
					firstName: 'FIRST',
					lastName: 'LAST',
					mobileNumber: '+905354589889',
					password: '12345678',
				},
				{},
			);
			expect(otpSpy).toHaveBeenCalled();
		});
	});
});
