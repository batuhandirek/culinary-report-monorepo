import { randomUUID } from 'crypto';

import { ExecutionContext, ForbiddenException } from '@nestjs/common';

import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { ExceptionCodes } from 'exceptions';

import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { EmailService } from 'src/modules/email/services/email.service.js';
import { OtpService } from 'src/modules/otp/services/otp.service.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { Platform } from 'src/shared/constants/platform.enum.const.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { UserRoleEnum } from '../constants/user-role.enum.constant.js';
import { BrandMemberRoleEnum } from '../constants/brand-member-role.enum.constant.js';
import { MeController } from '../controllers/me.controller.js';
import { User } from '../entities/user.entity.js';
import { UserSession } from '../entities/user-session.entity.js';
import { BrandMember } from '../entities/brand-member.entity.js';
import { BrandAccessGuard } from '../guards/brand-access.guard.js';
import { JwtService } from '../services/jwt.service.js';
import { LoginService } from '../services/login.service.js';
import { PasswordService } from '../services/password.service.js';
import { UserService } from '../services/user.service.js';
import { UserSessionService } from '../services/user-session.service.js';
import { BrandMemberService } from '../services/brand-member.service.js';
import { VerificationService } from '../services/verification.service.js';

import { userFactory } from './factories/user.factory.js';

/* The portal's access: an admin invites an address to a brand, the person signs in with a
 * code mailed to it (no password), and from then on the brand's portal routes let them in —
 * and nobody else but admins. */

describe('brand members and the code login (pglite)', () => {
	let harness: PgliteTestingModule;
	let members: BrandMemberService;
	let verification: VerificationService;
	let login: LoginService;
	let users: UserService;
	let guard: BrandAccessGuard;
	let me: MeController;
	let count = 0;

	const otpService = { sendOtp: jest.fn<OtpService['sendOtp']>(async () => undefined) };
	const emailService = {
		queueEmail: jest.fn<EmailService['queueEmail']>(async () => undefined),
	};

	/** A one-branch brand, as every scraped venue is. */
	const newBrand = async (name = `Venue ${count}`) => {
		const venue = harness.orm.em.create(Venue, { city: testCity(harness.orm.em), placeId: `place-${count++}`, name });
		await harness.orm.em.flush();
		return venue.brand;
	};

	const reload = (email: string) => {
		harness.orm.em.clear();
		return harness.orm.em.findOneOrFail(User, { email });
	};

	/** Asks for a code and trades it for a session, the way `/portal/login` does. */
	const codeLogin = async (email: string) => {
		const { verificationToken, verificationRequest } =
			await verification.createForEmailLogin(email, {});
		return login.loginWithCode(
			{ token: verificationToken, code: verificationRequest.code },
			{},
			Platform.WEB,
		);
	};

	const guardLets = (userId: string, roles: UserRoleEnum[], brandId: string) =>
		guard.canActivate({
			switchToHttp: () => ({ getRequest: () => ({ userId, userRoles: roles, params: { brandId } }) }),
		} as unknown as ExecutionContext);

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				BrandMemberService,
				BrandAccessGuard,
				VerificationService,
				LoginService,
				UserService,
				UserSessionService,
				PasswordService,
				JwtService,
				MeController,
				{ provide: OtpService, useValue: otpService },
				{ provide: EmailService, useValue: emailService },
			],
		});
		members = harness.moduleRef.get(BrandMemberService);
		verification = harness.moduleRef.get(VerificationService);
		login = harness.moduleRef.get(LoginService);
		users = harness.moduleRef.get(UserService);
		guard = harness.moduleRef.get(BrandAccessGuard);
		me = harness.moduleRef.get(MeController);
		entityManagerManager.setEntityManager(harness.orm.em);
	});

	afterAll(async () => {
		await harness.stop();
	});

	beforeEach(() => {
		emailService.queueEmail.mockClear();
		harness.orm.em.clear();
	});

	it('an invite makes a passwordless account and the membership, and mails the portal link', async () => {
		const brand = await newBrand('Kranzler Eck');
		const admin = await userFactory.admin().create();

		const member = await members.invite({
			brandId: brand.id,
			email: ' Owner@Kranzler.de ',
			name: 'Greta Weiss',
			invitedById: admin.id,
			language: 'de',
		});

		const owner = await reload('owner@kranzler.de');
		expect(owner).toMatchObject({ firstName: 'Greta', lastName: 'Weiss', hashedPassword: null });
		expect(owner.emailVerifiedAt).toBeFalsy();
		expect(owner.roles).toEqual([UserRoleEnum.USER]);
		expect(member).toMatchObject({ role: BrandMemberRoleEnum.OWNER, acceptedAt: undefined });

		expect(emailService.queueEmail).toHaveBeenCalledTimes(1);
		const [mail] = emailService.queueEmail.mock.calls[0];
		expect(mail.to.email).toBe('owner@kranzler.de');
		expect(mail.subject).toContain('Kranzler Eck');
		expect(mail.html).toContain('/portal/login?email=owner%40kranzler.de');

		// Again: still one membership, the mail goes out again
		await members.invite({ brandId: brand.id, email: 'owner@kranzler.de' });
		expect(await harness.orm.em.count(BrandMember, { brand })).toBe(1);
		expect(emailService.queueEmail).toHaveBeenCalledTimes(2);
	});

	it('the code login opens a session for a passwordless account and accepts its invites', async () => {
		const first = await newBrand();
		const second = await newBrand();
		await members.invite({ brandId: first.id, email: 'chain@example.com' });
		await members.invite({ brandId: second.id, email: 'chain@example.com' });

		const session = await codeLogin('chain@example.com');
		expect(session.accessToken).toEqual(expect.any(String));
		expect(session.refreshToken).toEqual(expect.any(String));

		const owner = await reload('chain@example.com');
		expect(owner.roles).toEqual([UserRoleEnum.USER, UserRoleEnum.VENUE_OWNER]);
		expect(owner.emailVerifiedAt).toBeInstanceOf(Date);
		expect(await harness.orm.em.count(UserSession, { user: owner })).toBe(1);
		const accepted = await harness.orm.em.find(BrandMember, { user: owner });
		expect(accepted).toHaveLength(2);
		expect(accepted.every(member => member.acceptedAt instanceof Date)).toBe(true);

		// `GET /auth/me` lists both brands
		const answer = await me.getMe(owner.id, randomUUID());
		expect(answer.brandMemberships.map(member => member.brand.id).sort()).toEqual(
			[first.id, second.id].sort(),
		);
	});

	it('refuses an unknown address and a code that was not asked for a login', async () => {
		await expect(verification.createForEmailLogin('nobody@example.com', {})).rejects.toMatchObject({
			response: { code: ExceptionCodes.USER_DOES_NOT_EXIST },
		});

		const { verificationToken, verificationRequest } =
			await verification.validateAndCreateForEmailSignup(
				{
					email: 'signup@example.com',
					password: 'sifre12345',
					firstName: 'Sign',
					lastName: 'Up',
					acceptedTerms: true,
					acceptedMarketing: false,
				},
				{},
			);
		await expect(
			login.loginWithCode(
				{ token: verificationToken, code: verificationRequest.code },
				{},
				Platform.WEB,
			),
		).rejects.toMatchObject({ response: { code: ExceptionCodes.INVALID_CREDENTIALS } });
	});

	it('the portal guard lets in members and admins, and no one else', async () => {
		const brand = await newBrand();
		const other = await newBrand();
		const member = await members.invite({ brandId: brand.id, email: 'member@example.com' });
		const stranger = await userFactory.user().create();
		const admin = await userFactory.admin().create();
		const memberId = member.user.id;

		await expect(guardLets(memberId, [UserRoleEnum.USER], brand.id)).resolves.toBe(true);
		await expect(guardLets(memberId, [UserRoleEnum.USER], other.id)).rejects.toBeInstanceOf(
			ForbiddenException,
		);
		await expect(
			guardLets(stranger.id, [UserRoleEnum.USER], brand.id),
		).rejects.toBeInstanceOf(ForbiddenException);
		await expect(guardLets(stranger.id, [UserRoleEnum.USER], 'not-a-uuid')).rejects.toMatchObject(
			{ response: { code: ExceptionCodes.NO_BRAND_ACCESS } },
		);
		await expect(
			guardLets(admin.id, [UserRoleEnum.USER, UserRoleEnum.ADMIN], other.id),
		).resolves.toBe(true);
	});

	it('removing the last membership shuts the door and takes the role', async () => {
		const brand = await newBrand();
		const member = await members.invite({ brandId: brand.id, email: 'leaving@example.com' });
		await codeLogin('leaving@example.com');
		expect((await reload('leaving@example.com')).roles).toContain(UserRoleEnum.VENUE_OWNER);

		await members.remove(brand.id, member.id);
		const user = await reload('leaving@example.com');
		expect(user.roles).toEqual([UserRoleEnum.USER]);
		await expect(guardLets(user.id, user.roles, brand.id)).rejects.toBeInstanceOf(
			ForbiddenException,
		);
	});

	it("an admin's role edit keeps venue_owner", async () => {
		const brand = await newBrand();
		await members.invite({ brandId: brand.id, email: 'kept@example.com' });
		await codeLogin('kept@example.com');
		const admin = await userFactory.admin().create();

		const user = await reload('kept@example.com');
		await users.updateUserRoles(user, [UserRoleEnum.USER, UserRoleEnum.PROMOTER], admin.id);
		expect((await reload('kept@example.com')).roles.sort()).toEqual(
			[UserRoleEnum.PROMOTER, UserRoleEnum.USER, UserRoleEnum.VENUE_OWNER].sort(),
		);
	});
});
