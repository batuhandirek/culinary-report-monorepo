import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';

import { Platform } from 'src/shared/constants/platform.enum.const.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { User } from '../entities/user.entity.js';
import { UserSession } from '../entities/user-session.entity.js';
import { UserSessionService } from '../services/user-session.service.js';

import { userFactory } from './factories/user.factory.js';

/* "Diğer tüm oturumları kapat": every session of the user but the one asking goes;
 * nobody else's does. */
describe('Sessions (pglite)', () => {
	let harness: PgliteTestingModule;
	let sessions: UserSessionService;

	const session = (user: User) =>
		harness.orm.em.create(UserSession, {
			user,
			expiresAt: new Date(Date.now() + 86_400_000),
			visitorInfo: {},
			platform: Platform.WEB,
			lastSeenAt: new Date(),
		} as UserSession);
	const remaining = async (user: User) =>
		(await harness.orm.em.fork().find(UserSession, { user: user.id })).map(s => s.id).sort();

	beforeAll(async () => {
		harness = await createPgliteTestingModule({ providers: [UserSessionService] });
		sessions = harness.moduleRef.get(UserSessionService);
		entityManagerManager.setEntityManager(harness.orm.em);
	});

	afterAll(async () => {
		await harness.stop();
	});

	it('revokes every other session of the user and keeps the current one', async () => {
		const [me, someone] = [userFactory.build(), userFactory.build()];
		const [current, phone, laptop] = [session(me), session(me), session(me)];
		const theirs = session(someone);
		await harness.orm.em.flush();

		await expect(sessions.revokeOtherSessions(me.id, current.id)).resolves.toBe(2);

		expect(await remaining(me)).toEqual([current.id]);
		expect(await remaining(someone)).toEqual([theirs.id]);
		expect([phone.id, laptop.id].sort()).not.toEqual(await remaining(me));
		// Nothing left to end: zero, not an error.
		await expect(sessions.revokeOtherSessions(me.id, current.id)).resolves.toBe(0);
	});
});
