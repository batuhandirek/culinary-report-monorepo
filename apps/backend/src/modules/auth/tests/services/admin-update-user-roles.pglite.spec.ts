import { BadRequestException } from '@nestjs/common';

import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';

import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { UserRoleEnum } from '../../constants/user-role.enum.constant.js';
import { User } from '../../entities/user.entity.js';
import { UserSession } from '../../entities/user-session.entity.js';
import { UserService } from '../../services/user.service.js';
import { userFactory } from '../factories/user.factory.js';
import { userSessionFactory } from '../factories/user-session.factory.js';

/* Role editing from the admin panel. Two things worth pinning down: what it refuses —
 * nothing here can be undone from the panel afterwards, so `system` is never handed out
 * or taken away and an admin cannot demote themselves out of the panel — and that it
 * drops the user's sessions, which is what makes the new roles reach them (they are
 * baked into the access token at login). */

describe('UserService.updateUserRoles (pglite)', () => {
	let harness: PgliteTestingModule;
	let service: UserService;

	let admin: User;
	let member: User;
	let otherAdmin: User;
	let systemUser: User;

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [UserService],
		});
		service = harness.moduleRef.get(UserService);
		entityManagerManager.setEntityManager(harness.orm.em);

		admin = userFactory.admin().build();
		otherAdmin = userFactory.admin().build();
		member = userFactory.user().build();
		systemUser = userFactory.systemUser().build();
		await harness.orm.em.flush();
	});

	afterAll(async () => {
		await harness.stop();
	});

	it('promotes a user to admin', async () => {
		await service.updateUserRoles(member, [UserRoleEnum.ADMIN], admin.id);

		expect(member.roles.sort()).toEqual([UserRoleEnum.ADMIN, UserRoleEnum.USER].sort());
	});

	it('keeps the baseline user role even when it is not sent', async () => {
		const user = await userFactory.user().create();

		await service.updateUserRoles(user, [UserRoleEnum.ADMIN], admin.id);

		expect(user.roles).toContain(UserRoleEnum.USER);
	});

	it('grants several roles at once', async () => {
		const user = await userFactory.user().create();

		await service.updateUserRoles(user, [UserRoleEnum.ADMIN, UserRoleEnum.PROMOTER], admin.id);

		expect(user.roles.sort()).toEqual(
			[UserRoleEnum.ADMIN, UserRoleEnum.PROMOTER, UserRoleEnum.USER].sort(),
		);
	});

	it('drops a role that is left out', async () => {
		const user = await userFactory.user().create();

		await service.updateUserRoles(user, [UserRoleEnum.PROMOTER], admin.id);
		await service.updateUserRoles(user, [UserRoleEnum.ADMIN], admin.id);

		expect(user.roles).not.toContain(UserRoleEnum.PROMOTER);
		expect(user.roles).toContain(UserRoleEnum.ADMIN);
	});

	it('demotes an admin back to a plain user', async () => {
		await service.updateUserRoles(otherAdmin, [UserRoleEnum.USER], admin.id);

		expect(otherAdmin.roles).toEqual([UserRoleEnum.USER]);
	});

	it('persists the change', async () => {
		const user = await userFactory.user().create();

		await service.updateUserRoles(user, [UserRoleEnum.ADMIN], admin.id);
		harness.orm.em.clear();

		const reloaded = await harness.orm.em.findOneOrFail(User, { id: user.id });
		expect(reloaded.roles).toContain(UserRoleEnum.ADMIN);
	});

	it('refuses to assign a role that is not assignable from the panel', async () => {
		const user = await userFactory.user().create();

		await expect(
			service.updateUserRoles(user, [UserRoleEnum.SYSTEM as never], admin.id),
		).rejects.toThrow(BadRequestException);
		expect(user.roles).toEqual([UserRoleEnum.USER]);
	});

	it('refuses to touch the system account', async () => {
		await expect(
			service.updateUserRoles(systemUser, [UserRoleEnum.ADMIN], admin.id),
		).rejects.toThrow(BadRequestException);
		expect(systemUser.roles).toEqual([UserRoleEnum.SYSTEM]);
	});

	it('drops the sessions of the user whose roles changed', async () => {
		const user = await userFactory.user().create();
		userSessionFactory.build({}, { associations: { user } });
		userSessionFactory.build({}, { associations: { user } });
		const bystander = await userFactory.user().create();
		userSessionFactory.build({}, { associations: { user: bystander } });
		await harness.orm.em.flush();

		await service.updateUserRoles(user, [UserRoleEnum.ADMIN], admin.id);

		expect(await harness.orm.em.count(UserSession, { user })).toBe(0);
		expect(await harness.orm.em.count(UserSession, { user: bystander })).toBe(1);
	});

	it('keeps the sessions when the change is refused', async () => {
		const user = await userFactory.user().create();
		userSessionFactory.build({}, { associations: { user } });
		await harness.orm.em.flush();

		await expect(
			service.updateUserRoles(user, [UserRoleEnum.SYSTEM as never], admin.id),
		).rejects.toThrow(BadRequestException);
		expect(await harness.orm.em.count(UserSession, { user })).toBe(1);
	});

	it('refuses to let an admin change their own roles', async () => {
		await expect(service.updateUserRoles(admin, [UserRoleEnum.USER], admin.id)).rejects.toThrow(
			BadRequestException,
		);
		expect(admin.roles).toContain(UserRoleEnum.ADMIN);
	});
});
