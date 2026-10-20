import { FilterQuery } from '@mikro-orm/core';

import {
	BadRequestException,
	ConflictException,
	HttpException,
	HttpStatus,
	Injectable,
	InternalServerErrorException,
	Logger,
	UnauthorizedException,
	UnprocessableEntityException,
} from '@nestjs/common';

import crypto from 'crypto';
import dayjs from 'dayjs';
import jwt from 'jsonwebtoken';
import { parsePhoneNumberWithError } from 'libphonenumber-js';

import { ExceptionCodes } from 'exceptions';

import { EmailService } from 'src/modules/email/services/email.service.js';
import { renderEmail } from 'src/modules/email/util/render-email.js';
import { OtpService } from 'src/modules/otp/services/otp.service.js';

import { authConfig } from '../config/auth.config.js';
import { CredentialVerificationRequestTypeEnum } from '../constants/credential-verification-request-type.enum.constant.js';
import { UserRoleEnum } from '../constants/user-role.enum.constant.js';
import {
	VERIFICATION_MAX_SENDS_PER_WINDOW,
	VERIFICATION_RESEND_COOLDOWN_SECONDS,
	VERIFICATION_SEND_WINDOW_MINUTES,
} from '../constants/verification-throttle.constant.js';
import { VERIFICATION_TYPE_TO_EMAIL } from '../constants/verification-type-to-email.constant.js';
import { ChangeEmailInputDto } from '../dto/change-email.input.dto.js';
import { ChangeMobileNumberInputDto } from '../dto/change-mobile-number.input.dto.js';
import { ForgotPasswordInputDto } from '../dto/forgot-password.input.dto.js';
import { LoginEmailInputDto } from '../dto/login-email.input.dto.js';
import { LoginMobileNumberInputDto } from '../dto/login-mobile-number.input.dto.js';
import { SignupEmailInputDto } from '../dto/signup-email.input.dto.js';
import { SignupMobileInputDto } from '../dto/signup-mobile.input.dto.js';
import { VerifyCredentialInputDto } from '../dto/verify-credential.input.dto.js';
import { CredentialVerificationRequest } from '../entities/credential-verification-request.entity.js';
import { User } from '../entities/user.entity.js';
import { VerificationTokenPayload } from '../interfaces/verification-token-payload.interface.js';
import { Visitor } from '../interfaces/visitor.interface.js';
import { CredentialVerificationRequestRepository } from '../repositories/credential-verification-request.repository.js';
import { UserRepository } from '../repositories/user.repository.js';

import { AccountNoticeService } from './account-notice.service.js';
import { JwtService } from './jwt.service.js';
import { PasswordService } from './password.service.js';

/**
 * What a caller knows about the credential being verified. Deliberately not
 * `RequiredEntityData<CredentialVerificationRequest>`: that type admits raw SQL fragments and
 * nulls for every column, which none of these code paths can handle.
 */
interface VerificationRequestData {
	type: CredentialVerificationRequestTypeEnum;
	visitorInfo: Visitor;
	email?: string;
	mobileNumber?: string;
	user?: User;
	signupInfo?: CredentialVerificationRequest['signupInfo'];
}

@Injectable()
export class VerificationService {
	private readonly logger = new Logger(VerificationService.name);
	constructor(
		private credentialVerificationRequestRepository: CredentialVerificationRequestRepository,
		private userRepository: UserRepository,
		private emailService: EmailService,
		private jwtService: JwtService,
		private passwordService: PasswordService,
		private otpService: OtpService,
		private accountNoticeService: AccountNoticeService,
	) {}

	/**
	 * Checks a code against its token and applies what the request was for. `expectedType`
	 * makes a route accept only its own kind of request: the code login must not turn a
	 * signup's token into a session.
	 */
	public async verifyAndHandle(
		input: VerifyCredentialInputDto,
		expectedType?: CredentialVerificationRequestTypeEnum,
	): Promise<CredentialVerificationRequest> {
		let payload: VerificationTokenPayload;
		try {
			payload = this.jwtService.decode<VerificationTokenPayload>(input.token);
		} catch (e) {
			this.logger.error('Failed to decode the JWT', e);
			if (e instanceof jwt.JsonWebTokenError) throw new UnauthorizedException();
			else if (e instanceof jwt.TokenExpiredError) throw new UnauthorizedException();
			throw new InternalServerErrorException();
		}

		this.logger.log('Should verify', payload);

		const verificationRequest = await this.credentialVerificationRequestRepository.findOne(
			{
				verifiedAt: { $eq: null },
				identifier: payload.verificationIdentifier,
				code: input.code,
			},
			{ populate: ['user'] },
		);
		if (!verificationRequest || (expectedType && verificationRequest.type !== expectedType)) {
			throw new UnauthorizedException({ code: ExceptionCodes.INVALID_CREDENTIALS });
		}

		verificationRequest.verifiedAt = new Date();
		// The address a CHANGE_EMAIL moves the account off: it is told once the change commits.
		let changedFromEmail: string | null | undefined;
		if (
			verificationRequest.type === CredentialVerificationRequestTypeEnum.SIGNUP_MOBILE_NUMBER
		) {
			// Link the row to the account it just created, or it outlives that account: the FK
			// cascade has nothing to cascade from, and the orphan keeps the old password hash
			// and name on file for `checkForMobileLogin` to resurrect.
			verificationRequest.user = this.userRepository.create({
				roles: [UserRoleEnum.USER],
				mobileNumber: verificationRequest.mobileNumber,
				mobileNumberVerifiedAt: new Date(),
				hashedPassword: verificationRequest.hashedPassword!,
				passwordLastChangedAt: new Date(),
				...verificationRequest.signupInfo!,
			});
		} else if (
			verificationRequest.type === CredentialVerificationRequestTypeEnum.SIGNUP_EMAIL
		) {
			verificationRequest.user = this.userRepository.create({
				roles: [UserRoleEnum.USER],
				email: verificationRequest.email,
				emailVerifiedAt: new Date(),
				hashedPassword: verificationRequest.hashedPassword!,
				passwordLastChangedAt: new Date(),
				...verificationRequest.signupInfo!,
			});
		} else if (
			verificationRequest.type === CredentialVerificationRequestTypeEnum.FORGOT_PASSWORD
		) {
		} else if (verificationRequest.type === CredentialVerificationRequestTypeEnum.LOGIN_EMAIL) {
			const user = verificationRequest.user!;
			// The account moved to another address after the code went out: the code proves the
			// old one, which is no longer theirs.
			if (user.email !== verificationRequest.email) {
				throw new UnauthorizedException({ code: ExceptionCodes.INVALID_CREDENTIALS });
			}
			// An invited account starts unverified; typing the code proves the address.
			user.emailVerifiedAt ??= new Date();
		} else if (
			verificationRequest.type === CredentialVerificationRequestTypeEnum.CHANGE_MOBILE_NUMBER
		) {
			await this.assertCredentialIsStillFree(verificationRequest, {
				mobileNumber: verificationRequest.mobileNumber,
			});
			verificationRequest.user!.mobileNumber = verificationRequest.mobileNumber;
			verificationRequest.user!.mobileNumberVerifiedAt = new Date();
		} else if (
			verificationRequest.type === CredentialVerificationRequestTypeEnum.CHANGE_EMAIL
		) {
			await this.assertCredentialIsStillFree(verificationRequest, {
				email: verificationRequest.email,
			});
			changedFromEmail = verificationRequest.user!.email;
			verificationRequest.user!.email = verificationRequest.email;
			verificationRequest.user!.emailVerifiedAt = new Date();
		} else {
			this.logger.error(`Unknown verification type ${verificationRequest.type}`);
			throw new InternalServerErrorException();
		}

		await this.userRepository.getEntityManager().flush();
		if (changedFromEmail) {
			await this.accountNoticeService.emailChanged(
				changedFromEmail,
				verificationRequest.email!,
			);
		}
		return verificationRequest;
	}

	public async validateAndCreateForEmailSignup(
		input: SignupEmailInputDto,
		visitorInfo: Visitor,
	): Promise<{
		verificationRequest: CredentialVerificationRequest;
		verificationToken: string;
	}> {
		input.email = input.email.toLowerCase().trim();
		const existingUser = await this.userRepository.findOne({ email: input.email as string });
		if (existingUser) {
			throw new UnprocessableEntityException({ code: ExceptionCodes.USER_ALREADY_EXISTS });
		}
		return this.createForEmailSignup(input, visitorInfo);
	}

	public async validateAndCreateForMobileNumberSignup(
		input: SignupMobileInputDto,
		visitorInfo: Visitor,
	): Promise<{
		verificationRequest: CredentialVerificationRequest;
		verificationToken: string;
	}> {
		input.mobileNumber = this.validateMobileNumber(input.mobileNumber);
		const existingUser = await this.userRepository.findOne({
			mobileNumber: input.mobileNumber as string,
		});
		if (existingUser) {
			throw new UnprocessableEntityException({ code: ExceptionCodes.USER_ALREADY_EXISTS });
		}
		return this.createForMobileNumberSignup(input, visitorInfo);
	}

	public async createForForgotPassword(
		input: ForgotPasswordInputDto,
		visitorInfo: Visitor,
	): Promise<{
		verificationRequest: CredentialVerificationRequest;
		verificationToken: string;
	}> {
		if (input.mobileNumber) {
			input.mobileNumber = this.validateMobileNumber(input.mobileNumber);
		} else {
			input.email = input.email!.toLowerCase().trim();
		}
		const filter: FilterQuery<User> =
			input.email ? { email: input.email } : { mobileNumber: input.mobileNumber };
		const user = await this.userRepository.findOne(filter);
		if (!user) {
			throw new BadRequestException({ code: ExceptionCodes.USER_DOES_NOT_EXIST });
		} else if (!user.hashedPassword) {
			throw new ConflictException({ code: ExceptionCodes.USER_HAS_NO_PASSWORD });
		}

		return this.createOrResend({
			type: CredentialVerificationRequestTypeEnum.FORGOT_PASSWORD,
			visitorInfo,
			user,
			...input,
		});
	}

	/**
	 * Sends a sign-in code to an existing account's e-mail (the passwordless login of the
	 * venue portal). There is no signup through here: an account comes from an invite.
	 */
	public async createForEmailLogin(
		email: string,
		visitorInfo: Visitor,
	): Promise<{
		verificationRequest: CredentialVerificationRequest;
		verificationToken: string;
	}> {
		email = email.toLowerCase().trim();
		const user = await this.userRepository.findOne({ email });
		if (!user) {
			throw new BadRequestException({ code: ExceptionCodes.USER_DOES_NOT_EXIST });
		}
		return this.createOrResend({
			type: CredentialVerificationRequestTypeEnum.LOGIN_EMAIL,
			email,
			visitorInfo,
			user,
		});
	}

	public async checkForMobileLogin(
		input: LoginMobileNumberInputDto,
		visitorInfo: Visitor,
	): Promise<{
		verificationRequest: CredentialVerificationRequest;
		verificationToken: string;
	}> {
		// Only a signup that never completed: a verified row means the account it created is
		// gone, and reviving it here would rebuild that account from its stored name and
		// password hash — through the login endpoint, at that.
		const verificationRequest = await this.credentialVerificationRequestRepository.findOne({
			type: CredentialVerificationRequestTypeEnum.SIGNUP_MOBILE_NUMBER,
			mobileNumber: input.mobileNumber,
			verifiedAt: { $eq: null },
		});

		if (!verificationRequest) {
			throw new BadRequestException({ code: ExceptionCodes.INVALID_CREDENTIALS });
		}

		const passwordMatching = await this.passwordService.comparePassword(
			input.password,
			verificationRequest.hashedPassword!,
		);
		// There was a Signup request with this number, but not with this password, throw an error
		// Note: If they try to sign up again using the same mobile number, we dont check the password but send another OTP
		if (!passwordMatching) {
			throw new BadRequestException({ code: ExceptionCodes.INVALID_CREDENTIALS });
		}

		// Expired but matching, send another one
		if (dayjs(verificationRequest.expiresAt).isBefore(dayjs())) {
			return this.createForMobileNumberSignup(
				{ ...input, ...verificationRequest.signupInfo! },
				visitorInfo,
			);
		} else {
			const verificationToken = await this.createJwtForVerification(verificationRequest);
			return { verificationToken, verificationRequest };
		}
	}

	public async checkForEmailLogin(
		input: LoginEmailInputDto,
		visitorInfo: Visitor,
	): Promise<{
		verificationRequest: CredentialVerificationRequest;
		verificationToken: string;
	}> {
		input.email = input.email!.toLowerCase().trim();
		// Unverified only — see the note in `checkForMobileLogin`.
		const verificationRequest = await this.credentialVerificationRequestRepository.findOne({
			type: CredentialVerificationRequestTypeEnum.SIGNUP_EMAIL,
			email: input.email,
			verifiedAt: { $eq: null },
		});
		if (!verificationRequest) {
			throw new BadRequestException({ code: ExceptionCodes.INVALID_CREDENTIALS });
		}

		const passwordMatching = await this.passwordService.comparePassword(
			input.password,
			verificationRequest.hashedPassword!,
		);
		// There was a Signup request with this email, but not with this password, throw an error
		// Note: If they try to sign up again using the same email, we dont check the password but send another verification request
		if (!passwordMatching) {
			throw new BadRequestException({ code: ExceptionCodes.INVALID_CREDENTIALS });
		}

		// Expired but matching, send another one
		if (dayjs(verificationRequest.expiresAt).isBefore(dayjs())) {
			return this.createForEmailSignup(
				{ ...input, ...verificationRequest.signupInfo! },
				visitorInfo,
			);
		} else {
			const verificationToken = await this.createJwtForVerification(verificationRequest);
			return { verificationToken, verificationRequest };
		}
	}

	public async validateAndCreateForMobileNumberChange(
		user: User,
		input: ChangeMobileNumberInputDto,
		visitorInfo: Visitor,
	): Promise<{
		verificationRequest: CredentialVerificationRequest;
		verificationToken: string;
	}> {
		input.mobileNumber = this.validateMobileNumber(input.mobileNumber);
		const existingUser = await this.userRepository.findOne({
			mobileNumber: input.mobileNumber as string,
		});
		if (existingUser) {
			throw new UnprocessableEntityException({ code: ExceptionCodes.USER_ALREADY_EXISTS });
		}

		return this.createOrResend({
			type: CredentialVerificationRequestTypeEnum.CHANGE_MOBILE_NUMBER,
			mobileNumber: input.mobileNumber,
			visitorInfo,
			user,
		});
	}

	public async validateAndCreateForEmailChange(
		user: User,
		input: ChangeEmailInputDto,
		visitorInfo: Visitor,
	): Promise<{
		verificationRequest: CredentialVerificationRequest;
		verificationToken: string;
	}> {
		input.email = input.email.toLowerCase().trim();
		const existingUser = await this.userRepository.findOne({ email: input.email });
		if (existingUser) {
			throw new UnprocessableEntityException({ code: ExceptionCodes.USER_ALREADY_EXISTS });
		}

		return this.createOrResend({
			type: CredentialVerificationRequestTypeEnum.CHANGE_EMAIL,
			email: input.email,
			visitorInfo,
			user,
		});
	}

	private async createForMobileNumberSignup(input: SignupMobileInputDto, visitorInfo: Visitor) {
		input.mobileNumber = this.validateMobileNumber(input.mobileNumber);

		return this.createOrResend({
			type: CredentialVerificationRequestTypeEnum.SIGNUP_MOBILE_NUMBER,
			mobileNumber: input.mobileNumber,
			plainPassword: input.password,
			visitorInfo,
			signupInfo: {
				firstName: input.firstName,
				lastName: input.lastName,
				acceptedMarketing: input.acceptedMarketing,
			},
		});
	}

	/**
	 * The one path by which a verification code reaches someone.
	 *
	 * It keeps the pending row for (type, identifier, account) and mutates it in place instead
	 * of deleting and recreating it, which is what makes repeat taps safe. A tap inside the
	 * resend cooldown hands back the token for the code already in flight and sends nothing; a
	 * later tap resends the *same* code, so an SMS that arrives out of order is still one the
	 * user can type. Deliveries past the budget are refused. Before this, every tap minted a
	 * fresh code and killed the previous one, so anyone tapping twice could never enter a valid
	 * code — and kept tapping (24 SMS to one number in one sitting).
	 *
	 * A row is only ever reused for the account that created it: `verifyAndHandle` writes the
	 * credential onto `verificationRequest.user`, so handing someone else's pending row back
	 * would move a phone number onto the wrong account.
	 */
	private async createOrResend(
		opts: VerificationRequestData & { plainPassword?: string },
	): Promise<{
		verificationToken: string;
		verificationRequest: CredentialVerificationRequest;
	}> {
		const { plainPassword, ...data } = opts;
		const pending = await this.findPendingRequest(data);
		if (!pending) {
			return this.createAndSend({
				...data,
				hashedPassword:
					plainPassword ?
						await this.passwordService.hashPassword(plainPassword)
					:	undefined,
			});
		}

		const now = new Date();
		const isExpired = pending.expiresAt <= now;
		// No password to check (the CHANGE_* and FORGOT_PASSWORD flows) means the caller is
		// already authenticated as this row's owner, so the row is theirs to reuse.
		const isSameCredential =
			plainPassword === undefined ||
			(!!pending.hashedPassword &&
				(await this.passwordService.comparePassword(
					plainPassword,
					pending.hashedPassword,
				)));

		if (!isExpired && isSameCredential) {
			this.applyLatestRequestData(pending, data);
			if (this.isWithinResendCooldown(pending, now)) {
				this.logger.debug(
					`A code for ${this.identifierOf(data)} is still in flight; returning it without sending again.`,
				);
				await this.credentialVerificationRequestRepository.getEntityManager().flush();
				return {
					verificationToken: await this.createJwtForVerification(pending),
					verificationRequest: pending,
				};
			}
			this.assertSendBudget(pending, now);
			this.chargeSend(pending, now);
			await this.credentialVerificationRequestRepository.getEntityManager().flush();
			this.logger.debug(`Resending the existing code for ${this.identifierOf(data)}.`);
			await this.deliver(pending);
			return {
				verificationToken: await this.createJwtForVerification(pending),
				verificationRequest: pending,
			};
		}

		// Expired, or the same identifier signing up again under a different password: the old
		// code is dead either way. Reissue onto the same row so the budget carries over — a
		// burst must not be able to reset itself by varying the password.
		this.assertSendBudget(pending, now);
		this.applyLatestRequestData(pending, data);
		Object.assign(pending, this.createVerificationDetails());
		if (plainPassword) {
			pending.hashedPassword = await this.passwordService.hashPassword(plainPassword);
		}
		this.chargeSend(pending, now);
		await this.credentialVerificationRequestRepository.getEntityManager().flush();
		this.logger.debug(
			`Reissued the verification request for ${this.identifierOf(data)} (${isExpired ? 'expired' : 'different password'}).`,
		);
		await this.deliver(pending);
		return {
			verificationToken: await this.createJwtForVerification(pending),
			verificationRequest: pending,
		};
	}

	private async findPendingRequest(
		data: VerificationRequestData,
	): Promise<CredentialVerificationRequest | null> {
		return this.credentialVerificationRequestRepository.findOne({
			...(data.mobileNumber ? { mobileNumber: data.mobileNumber } : { email: data.email }),
			// Only the CHANGE_* / FORGOT_PASSWORD rows carry an account; scoping to it keeps two
			// people asking about the same address on separate rows.
			...(data.user ? { user: data.user } : {}),
			verifiedAt: { $eq: null },
			type: { $eq: data.type },
		});
	}

	/** Carries over what the caller may have edited between attempts (name, device info). */
	private applyLatestRequestData(
		request: CredentialVerificationRequest,
		data: VerificationRequestData,
	): void {
		if (data.visitorInfo) request.visitorInfo = data.visitorInfo;
		if (data.signupInfo) request.signupInfo = data.signupInfo;
	}

	private identifierOf(data: { email?: string; mobileNumber?: string }): string {
		return data.mobileNumber ?? data.email ?? 'unknown';
	}

	private isWithinResendCooldown(request: CredentialVerificationRequest, now: Date): boolean {
		return (
			now.getTime() - request.lastSentAt.getTime() <
			VERIFICATION_RESEND_COOLDOWN_SECONDS * 1000
		);
	}

	private isWithinSendWindow(request: CredentialVerificationRequest, now: Date): boolean {
		return (
			now.getTime() - request.lastSentAt.getTime() <
			VERIFICATION_SEND_WINDOW_MINUTES * 60 * 1000
		);
	}

	private assertSendBudget(request: CredentialVerificationRequest, now: Date): void {
		if (
			this.isWithinSendWindow(request, now) &&
			request.sendCount >= VERIFICATION_MAX_SENDS_PER_WINDOW
		) {
			this.logger.warn(
				`Refusing a verification send: ${request.sendCount} already sent to ${this.identifierOf(request)} inside the window.`,
			);
			throw new HttpException(
				{ code: ExceptionCodes.TOO_MANY_VERIFICATION_REQUESTS },
				HttpStatus.TOO_MANY_REQUESTS,
			);
		}
	}

	private chargeSend(request: CredentialVerificationRequest, now: Date): void {
		request.sendCount = this.isWithinSendWindow(request, now) ? request.sendCount + 1 : 1;
		request.lastSentAt = now;
	}

	/**
	 * `users.mobile_number` and `users.email` are unique, and two accounts can hold a pending
	 * request for the same address at once — without this the second one to verify would hit a
	 * constraint violation and surface as a 500.
	 */
	private async assertCredentialIsStillFree(
		request: CredentialVerificationRequest,
		filter: FilterQuery<User>,
	): Promise<void> {
		const owner = await this.userRepository.findOne({
			$and: [filter, { id: { $ne: request.user!.id } }],
		});
		if (owner) {
			throw new UnprocessableEntityException({ code: ExceptionCodes.USER_ALREADY_EXISTS });
		}
	}

	private validateMobileNumber(input: string) {
		try {
			const parsedPhoneNumber = parsePhoneNumberWithError(input, 'TR');
			if (!parsedPhoneNumber.isValid()) {
				throw new BadRequestException({ code: ExceptionCodes.MOBILE_INVALID });
			}
			return parsedPhoneNumber.number;
		} catch (e) {
			throw new BadRequestException({ code: ExceptionCodes.MOBILE_INVALID });
		}
	}

	private async createForEmailSignup(input: SignupEmailInputDto, visitorInfo: Visitor) {
		input.email = input.email.toLowerCase().trim();
		return this.createOrResend({
			type: CredentialVerificationRequestTypeEnum.SIGNUP_EMAIL,
			email: input.email,
			plainPassword: input.password,
			visitorInfo,
			signupInfo: {
				firstName: input.firstName,
				lastName: input.lastName,
				acceptedMarketing: input.acceptedMarketing,
			},
		});
	}

	private async createAndSend(
		opts: VerificationRequestData & { hashedPassword?: string },
	): Promise<{
		verificationToken: string;
		verificationRequest: CredentialVerificationRequest;
	}> {
		const details = this.createVerificationDetails();
		const newVerificationRequest = this.credentialVerificationRequestRepository.create({
			...opts,
			...details,
			lastSentAt: new Date(),
			sendCount: 1,
		});

		await this.credentialVerificationRequestRepository.getEntityManager().flush();
		const verificationToken = await this.createJwtForVerification(newVerificationRequest);
		await this.deliver(newVerificationRequest);
		return {
			verificationToken,
			verificationRequest: newVerificationRequest,
		};
	}

	private async deliver(request: CredentialVerificationRequest): Promise<void> {
		if (request.mobileNumber) await this.trySendMobileVerification(request);
		else await this.trySendEmailVerification(request);
	}

	private createVerificationDetails(): Pick<
		CredentialVerificationRequest,
		'code' | 'identifier' | 'expiresAt'
	> {
		const expiresAt = dayjs()
			.add(authConfig.VERIFICATION_TOKEN_EXPIRES_IN_MINUTES, 'minutes')
			.toDate();
		const identifier = crypto.randomBytes(32).toString('hex');
		const code =
			authConfig.VERIFICATION_DEFAULT_CODE ?
				authConfig.VERIFICATION_DEFAULT_CODE
			:	`${crypto.randomInt(100000, 999999)}`;
		// Never log `code`: these lines ship to the log aggregator, where a live code is a
		// working login for whoever reads them.
		this.logger.debug(`Created verification details`, { identifier, expiresAt });
		return { expiresAt, identifier, code };
	}

	private async createJwtForVerification(
		verificationRequest: CredentialVerificationRequest,
	): Promise<string> {
		// Seconds, not minutes: a resend keeps the row's original `expiresAt`, and a whole-minute
		// diff truncates to `0 minutes` in the last minute of its life — a token already expired
		// when it is handed out.
		const expiresInSeconds = Math.max(
			1,
			dayjs(verificationRequest.expiresAt).diff(dayjs(), 'seconds'),
		);
		const verificationToken = await this.jwtService.createForVerification(
			{ verificationIdentifier: verificationRequest.identifier },
			`${expiresInSeconds} seconds`,
		);
		return verificationToken;
	}

	private async trySendEmailVerification(verificationRequest: CredentialVerificationRequest) {
		if (!verificationRequest.email) {
			throw new Error('No email found in the request');
		}
		const mail = VERIFICATION_TYPE_TO_EMAIL[verificationRequest.type];
		if (!mail) {
			throw new Error('No email template found for this verification type');
		}

		const { code } = verificationRequest;
		await this.emailService.queueEmail(
			{
				subject: mail.subject,
				...(await renderEmail(mail.template, { code })),
				to: { email: verificationRequest.email },
			},
			{ highPriority: true },
		);
	}

	private async trySendMobileVerification(verificationRequest: CredentialVerificationRequest) {
		if (!verificationRequest.mobileNumber) {
			throw new Error(
				'This verification request does not have a mobile number related with it',
			);
		}

		await this.otpService.sendOtp({
			code: verificationRequest.code,
			to: verificationRequest.mobileNumber,
		});
	}
}
