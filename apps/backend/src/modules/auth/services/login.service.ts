import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';

import { parsePhoneNumberWithError } from 'libphonenumber-js';

import { ExceptionCodes } from 'exceptions';

import { LoginOutputDto } from 'src/modules/auth/dto/login.output.dto.js';
import { UserSessionService } from 'src/modules/auth/services/user-session.service.js';
import { Platform } from 'src/shared/constants/platform.enum.const.js';

import { CredentialVerificationRequestTypeEnum } from '../constants/credential-verification-request-type.enum.constant.js';
import { LoginEmailInputDto } from '../dto/login-email.input.dto.js';
import { LoginMobileNumberInputDto } from '../dto/login-mobile-number.input.dto.js';
import { VerifyCredentialInputDto } from '../dto/verify-credential.input.dto.js';
import { CredentialVerificationRequest } from '../entities/credential-verification-request.entity.js';
import { User } from '../entities/user.entity.js';
import { Visitor } from '../interfaces/visitor.interface.js';
import { UserRepository } from '../repositories/user.repository.js';

import { PasswordService } from './password.service.js';
import { BrandMemberService } from './brand-member.service.js';
import { VerificationService } from './verification.service.js';

@Injectable()
export class LoginService {
	private readonly logger = new Logger(LoginService.name);
	constructor(
		private userRepository: UserRepository,
		private userSessionService: UserSessionService,
		private verificationService: VerificationService,
		private passwordService: PasswordService,
		private brandMemberService: BrandMemberService,
	) {}

	/**
	 * The second step of the passwordless login: a code from `POST /auth/login/code` opens a
	 * session. It is also what accepts the person's portal invites.
	 */
	public async loginWithCode(
		input: VerifyCredentialInputDto,
		visitor: Visitor,
		platformInfo: Platform,
	): Promise<LoginOutputDto> {
		const request = await this.verificationService.verifyAndHandle(
			input,
			CredentialVerificationRequestTypeEnum.LOGIN_EMAIL,
		);
		const user = request.user!;
		await this.brandMemberService.acceptInvites(user);
		return this.userSessionService.createSessionForUser(user, visitor, platformInfo);
	}

	public async loginWithEmail(
		input: LoginEmailInputDto,
		visitor: Visitor,
		platformInfo: Platform,
	): Promise<
		| LoginOutputDto
		| { verificationToken: string; verificationRequest: CredentialVerificationRequest }
	> {
		input.email = input.email.toLowerCase().trim();
		const user = await this.userRepository.findOne({ email: { $eq: input.email as string } });
		if (user) {
			if (!user.hashedPassword) {
				throw new UnauthorizedException({ code: ExceptionCodes.USER_HAS_NO_PASSWORD });
			}
			const matching = await this.passwordService.comparePassword(
				input.password,
				user.hashedPassword,
			);
			if (!matching)
				throw new UnauthorizedException({ code: ExceptionCodes.INVALID_CREDENTIALS });
			return this.userSessionService.createSessionForUser(user, visitor, platformInfo);
		}
		// Check if tried to sign up but havent finished verification yet
		else {
			return this.verificationService.checkForEmailLogin(input, visitor);
		}
	}

	public async loginWithMobileNumber(
		input: LoginMobileNumberInputDto,
		visitor: Visitor,
		platformInfo: Platform,
	): Promise<
		| LoginOutputDto
		| { verificationToken: string; verificationRequest: CredentialVerificationRequest }
	> {
		const parsedPhoneNumber = parsePhoneNumberWithError(input.mobileNumber, {
			defaultCountry: 'TR',
		});
		if (!parsedPhoneNumber.isValid()) {
			throw new BadRequestException({ code: ExceptionCodes.MOBILE_INVALID });
		}
		input.mobileNumber = parsedPhoneNumber.number;

		const user = await this.userRepository.findOne({
			mobileNumber: { $eq: input.mobileNumber as string },
		});
		if (user) {
			if (!user.hashedPassword) {
				throw new UnauthorizedException({ code: ExceptionCodes.USER_HAS_NO_PASSWORD });
			}
			const matching = await this.passwordService.comparePassword(
				input.password,
				user.hashedPassword,
			);
			if (!matching)
				throw new UnauthorizedException({ code: ExceptionCodes.INVALID_CREDENTIALS });
			return this.userSessionService.createSessionForUser(user, visitor, platformInfo);
		}
		// Check if tried to sign up but havent finished verification yet
		else {
			return this.verificationService.checkForMobileLogin(input, visitor);
		}
	}
}
