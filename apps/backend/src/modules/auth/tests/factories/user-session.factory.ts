import { faker } from '@faker-js/faker';
import dayjs from 'dayjs';
import { Factory } from 'fishery';

import { Platform } from 'src/shared/constants/platform.enum.const.js';
import { getEntityManager } from 'src/shared/util/em.js';

import { UserSession } from '../../entities/user-session.entity.js';

export const userSessionFactory = Factory.define<UserSession>(
	({ params, associations, onCreate }) => {
		onCreate(async session => {
			await getEntityManager().flush();
			return session;
		});

		if (!params.user && !associations.user) {
			throw new Error('Cannot create a user session without a user');
		}

		return getEntityManager().create(UserSession, {
			expiresAt: dayjs().add(30, 'day').toDate(),
			platform: Platform.WEB,
			lastSeenAt: new Date(),
			visitorInfo: { ip: faker.internet.ipv4() },
			...params,
			...associations,
		} as UserSession);
	},
);
