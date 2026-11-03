import { BadRequestException, UnprocessableEntityException } from '@nestjs/common';

import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import bcrypt from 'bcrypt';

import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import type { AssignableUserRole } from '../../constants/assignable-user-roles.constant.js';
import { UserRoleEnum } from '../../constants/user-role.enum.constant.js';
import { User } from '../../entities/user.entity.js';
import { UserSession } from '../../entities/user-session.entity.js';
import { PasswordService } from '../../services/password.service.js';
import { UserService } from '../../services/user.service.js';
import { userFactory } from '../factories/user.factory.js';
import { userSessionFactory } from '../factories/user-session.factory.js';

/* Accounts an admin makes and passwords an admin sets, from the admin panel: the way in while
 * e-mail is off, so nothing can verify an address or reset a password by mail. */

describe('UserService.createUser / setPassword (pglite)', () => {
	let harness: PgliteTestingModule;
	let service: UserService;

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [UserService, PasswordService],
		});
		service = harness.moduleRef.get(UserService);
		entityManagerManager.setEntityManager(harness.orm.em);
	});

	afterAll(async () => {
		await harness.stop();
	});

	it('creates an admin who can sign in with the password, e-mail verified', async () => {
		const user = await service.createUser({
			firstName: ' Ada ',
			lastName: 'Lovelace',
			email: 'Ada@Munchwerk.com',
			password: 'correct horse',
			roles: [UserRoleEnum.ADMIN],
		});

		harness.orm.em.clear();
		const stored = await harness.orm.em.findOneOrFail(User, { id: user.id });
		expect(stored.email).toBe('ada@munchwerk.com');
		expect(stored.firstName).toBe('Ada');
		expect(stored.emailVerifiedAt).toBeInstanceOf(Date);
		expect(stored.roles.sort()).toEqual([UserRoleEnum.ADMIN, UserRoleEnum.USER].sort());
		expect(await bcrypt.compare('correct horse', stored.hashedPassword!)).toBe(true);
	});

	it('refuses an address that already has an account', async () => {
		await userFactory.user().create({ email: 'taken@munchwerk.com' });

		await expect(
			service.createUser({
				firstName: 'Twin',
				lastName: '',
				email: 'TAKEN@munchwerk.com',
				password: '12345678',
				roles: [],
			}),
		).rejects.toBeInstanceOf(UnprocessableEntityException);
	});

	it('never hands out the system role', async () => {
		await expect(
			service.createUser({
				firstName: 'Sneaky',
				lastName: '',
				email: 'sneaky@munchwerk.com',
				password: '12345678',
				roles: [UserRoleEnum.SYSTEM as unknown as AssignableUserRole],
			}),
		).rejects.toBeInstanceOf(BadRequestException);
	});

	it("sets another user's password and signs them out everywhere", async () => {
		const admin = userFactory.admin().build();
		const user = userFactory.user().build();
		const adminSession = userSessionFactory.build({}, { associations: { user: admin } });
		userSessionFactory.build({}, { associations: { user } });
		userSessionFactory.build({}, { associations: { user } });
		await harness.orm.em.flush();

		await service.setPassword(user, 'new password', adminSession.id);

		expect(await bcrypt.compare('new password', user.hashedPassword!)).toBe(true);
		expect(await harness.orm.em.count(UserSession, { user })).toBe(0);
		expect(await harness.orm.em.count(UserSession, { user: admin })).toBe(1);
	});

	it('keeps the session an admin sets their own password from, and ends the others', async () => {
		const admin = userFactory.admin().build();
		const current = userSessionFactory.build({}, { associations: { user: admin } });
		userSessionFactory.build({}, { associations: { user: admin } });
		await harness.orm.em.flush();

		await service.setPassword(admin, 'my new password', current.id);

		const left = await harness.orm.em.find(UserSession, { user: admin });
		expect(left.map(s => s.id)).toEqual([current.id]);
		expect(await bcrypt.compare('my new password', admin.hashedPassword!)).toBe(true);
	});
});
