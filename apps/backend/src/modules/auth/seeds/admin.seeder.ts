import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';

import { Logger } from '@nestjs/common';

import { entityManagerManager } from '../../../shared/util/em.js';
import { User } from '../entities/user.entity.js';
import { userFactory } from '../tests/factories/user.factory.js';

const ADMINS = [
	{
		firstName: 'Batuhan',
		lastName: 'Direk',
		password: '12345678',
		email: 'batuhandirek94@gmail.com',
	},
	{
		firstName: 'Ongun',
		lastName: 'Nuray',
		password: '12345678',
		email: 'ongun@cutthebull.digital',
	},
];

export class AdminSeeder extends Seeder {
	private logger = new Logger(AdminSeeder.name);
	async run(em: EntityManager): Promise<void> {
		entityManagerManager.setEntityManager(em);
		for (const a of ADMINS) {
			try {
				const admin = userFactory.admin().signedUpWithEmail(a.email, a.password, a).build();
				await em.upsert(User, admin, { onConflictAction: 'ignore' });
				this.logger.log(
					`Upserted admin ${admin.firstName} ${admin.lastName} ${admin.email}`,
				);
			} catch (e) {
				this.logger.warn(
					`Failed to create admin "${a.firstName} ${a.lastName}": ${e.message}`,
				);
			}
		}
	}
}
