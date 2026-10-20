import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';

import { User } from 'src/modules/auth/entities/user.entity.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { NotificationTypeEnum } from '../constants/notification-type.enum.constant.js';
import { NotificationsController } from '../controllers/notifications.controller.js';
import { Notification } from '../entities/notification.entity.js';
import { NotificationRepository } from '../repositories/notification.repository.js';

describe('NotificationsController (pglite)', () => {
	let harness: PgliteTestingModule;
	let controller: NotificationsController;
	let user: User;

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [NotificationsController],
		});
		controller = harness.moduleRef.get(NotificationsController);
		entityManagerManager.setEntityManager(harness.orm.em);

		const em = harness.orm.em;
		user = em.create(User, { firstName: 'Test', lastName: 'User', roles: [] });
		em.create(Notification, {
			user,
			type: NotificationTypeEnum.GENERAL,
			title: 'Fallback title',
			description: 'Fallback description',
		});
		em.create(Notification, {
			user,
			type: NotificationTypeEnum.GENERAL,
		});
		await em.flush();
		em.clear();
	});

	afterAll(async () => {
		await harness.stop();
	});

	it('lists notifications with fallback title/description when set, omitting them when null', async () => {
		const result = await controller.listNotifications(user, { page: 1, size: 10 });

		expect(result.totalItems).toBe(2);
		const withTexts = result.items.find(i => i.title);
		const withoutTexts = result.items.find(i => !i.title);

		expect(withTexts).toMatchObject({
			type: NotificationTypeEnum.GENERAL,
			title: 'Fallback title',
			description: 'Fallback description',
		});
		// skipNull: unset fallback texts must not appear in the payload at all
		expect(withoutTexts).toBeDefined();
		expect(withoutTexts).not.toHaveProperty('title');
		expect(withoutTexts).not.toHaveProperty('description');
	});

	it('persists title/description on the entity', async () => {
		const repository = harness.moduleRef.get(NotificationRepository);
		const stored = await repository.findOneOrFail({ title: 'Fallback title' });
		expect(stored.description).toBe('Fallback description');
	});
});
