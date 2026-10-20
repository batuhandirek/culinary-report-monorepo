import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';

import { Logger } from '@nestjs/common';

import { entityManagerManager } from '../../../shared/util/em.js';
import { SYSTEM_USER_EMAIL } from '../constants/system-user-email.constant.js';
import { User } from '../entities/user.entity.js';
import { userFactory } from '../tests/factories/user.factory.js';

const SYSTEM_USERS = [
	{
		firstName: 'System',
		lastName: 'Culinary Report',
		password: '12345678',
		email: SYSTEM_USER_EMAIL,
	},
];

export class SystemUserSeeder extends Seeder {
	private logger = new Logger(SystemUserSeeder.name);
	async run(em: EntityManager): Promise<void> {
		entityManagerManager.setEntityManager(em);
		for (const a of SYSTEM_USERS) {
			try {
				const systemUser = userFactory
					.systemUser()
					.signedUpWithEmail(a.email, a.password, a)
					.build();
				await em.upsert(User, systemUser, { onConflictAction: 'ignore' });
				this.logger.log(`Upserted system user ${systemUser.email}`);
			} catch (e) {
				this.logger.warn(
					`Failed to create admin "${a.firstName} ${a.lastName}": ${e.message}`,
				);
			}
		}
	}
}
