
import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';


import { Image } from 'src/modules/image/entities/image.entity.js';
import { ImageService } from 'src/modules/image/services/image.service.js';
import { NotificationPreference } from 'src/modules/notification-preferences/entities/notification-preference.entity.js';
import { NotificationPreferenceService } from 'src/modules/notification-preferences/services/notification-preference.service.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { User } from '../../entities/user.entity.js';
import { UserService } from '../../services/user.service.js';
import { userFactory } from '../factories/user.factory.js';

/* `PATCH /auth/me` carries any subset of the profile, so what is worth pinning down is
 * that each field only moves what it names: unlinking one login leaves the other, a photo
 * is only uploaded when it is a new one, and the bio — public text — is cleaned and
 * refused like a chat message when it carries a way to reach its author. */

describe('UserService.updateMe (pglite)', () => {
	let harness: PgliteTestingModule;
	let service: UserService;
	let preferences: NotificationPreferenceService;
	// Explicit mock (not the auto-mock) so uploads can be driven and counted.
	const imageService = {
		createImage: jest.fn<ImageService['createImage']>(),
	};

	const image = (name: string) =>
		harness.orm.em.create(Image, {
			remoteId: `remote-${name}`,
			width: 512,
			height: 512,
			aspectRatio: 1,
			path: `/user-profile-images/${name}.jpg`,
			fileName: `${name}.jpg`,
			fileType: 'image',
			fileSize: 2048,
			url: `https://cdn.example.com/user-profile-images/${name}.jpg`,
		});

	/** The row as the database holds it, read past the identity map. */
	const stored = (user: User) =>
		harness.orm.em.fork().findOneOrFail(User, { id: user.id }, { populate: ['profileImage'] });

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				UserService,
				NotificationPreferenceService,
				{ provide: ImageService, useValue: imageService },
			],
		});
		service = harness.moduleRef.get(UserService);
		preferences = harness.moduleRef.get(NotificationPreferenceService);
		entityManagerManager.setEntityManager(harness.orm.em);
	});

	beforeEach(() => {
		imageService.createImage.mockReset();
	});

	afterAll(async () => {
		await harness.stop();
	});

	describe('isMarkedForDeletion', () => {
		it('cancels a scheduled deletion on `false` only', async () => {
			const markedForDeletionAt = new Date('2026-10-01T09:00:00Z');
			const user = await userFactory.create({
				isMarkedForDeletion: true,
				markedForDeletionAt,
			});

			await service.updateMe(user, { isMarkedForDeletion: true });
			expect(await stored(user)).toMatchObject({
				isMarkedForDeletion: true,
				markedForDeletionAt,
			});

			await service.updateMe(user, { isMarkedForDeletion: false });
			expect(await stored(user)).toMatchObject({
				isMarkedForDeletion: false,
				markedForDeletionAt: null,
			});
		});
	});

	describe('profileImage', () => {
		it('uploads a data URL and makes it the photo', async () => {
			const user = await userFactory.create();
			const uploaded = image('new');
			imageService.createImage.mockResolvedValue(uploaded);
			const dataUrl = 'data:image/jpeg;base64,QQQQ';

			await service.updateMe(user, { profileImage: dataUrl });

			expect(imageService.createImage).toHaveBeenCalledTimes(1);
			expect(imageService.createImage).toHaveBeenCalledWith(
				dataUrl,
				'user-profile-images',
				user.id,
			);
			expect((await stored(user)).profileImage?.id).toBe(uploaded.id);
		});

		// What a form that didn't touch the photo sends back with a name change.
		it.each(['https', 'http'])(
			'uploads nothing for the current photo’s %s URL, and keeps it',
			async scheme => {
				const current = image(`current-${scheme}`);
				const user = await userFactory.create(
					{ firstName: 'Mert' },
					{ associations: { profileImage: current } },
				);

				await service.updateMe(user, {
					firstName: 'Murat',
					profileImage: current.url.replace('https', scheme),
				});

				expect(imageService.createImage).not.toHaveBeenCalled();
				const saved = await stored(user);
				expect(saved.profileImage?.id).toBe(current.id);
				// The rest of the body still applies
				expect(saved.firstName).toBe('Murat');
			},
		);
	});

	describe('description', () => {
		it('is saved trimmed', async () => {
			const user = await userFactory.create();

			await service.updateMe(user, {
				description: '  \n Plak ve pikap topluyorum.\nHafta içi kargolarım. \n ',
			});

			expect((await stored(user)).description).toBe(
				'Plak ve pikap topluyorum.\nHafta içi kargolarım.',
			);
		});

		it.each(['', '  \n\t '])('is cleared by %j', async empty => {
			const user = await userFactory.create({ description: 'Plak topluyorum.' });

			await service.updateMe(user, { description: empty });

			// Null, never an empty string
			expect((await stored(user)).description).toBeNull();
		});

		it('is left alone when the body does not carry it', async () => {
			const user = await userFactory.create({ description: 'Plak topluyorum.' });

			await service.updateMe(user, { firstName: 'Murat', acceptedMarketing: true });

			expect(await stored(user)).toMatchObject({
				firstName: 'Murat',
				description: 'Plak topluyorum.',
			});
		});
	});

	describe('notification preferences', () => {
		const ALL_ON = {
			reports: { email: true },
			alerts: { email: true, sms: true },
		};

		it('start with everything on', async () => {
			const user = await userFactory.create();

			expect(await preferences.getAll(user.id)).toEqual(ALL_ON);
		});

		it('change only the switches the body names, and keep them across later saves', async () => {
			const user = await userFactory.create();

			await service.updateMe(user, { notificationPreferences: { alerts: { email: false } } });
			await service.updateMe(user, {
				notificationPreferences: { reports: { email: false }, alerts: { sms: false } },
			});
			await service.updateMe(user, { firstName: 'Murat' });

			expect(await preferences.getAll(user.id)).toEqual({
				reports: { email: false },
				alerts: { email: false, sms: false },
			});

			// Back on: the same row flips, no second one for the switch.
			await service.updateMe(user, { notificationPreferences: { alerts: { email: true } } });
			expect((await preferences.getAll(user.id)).alerts).toEqual({ email: true, sms: false });
			expect(
				await harness.orm.em.fork().count(NotificationPreference, { user: user.id }),
			).toBe(3);
		});
	});
});
