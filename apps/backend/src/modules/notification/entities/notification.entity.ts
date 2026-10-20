import type { Rel } from '@mikro-orm/core';
import { Entity, Enum, ManyToOne, Property } from '@mikro-orm/decorators/legacy';

import { MikroOrmEntityAbstractClass } from 'src/shared/abstractions/mikro-orm-entity.abstract-class.js';

import { User } from '../../auth/entities/user.entity.js';
import { NotificationTypeEnum } from '../constants/notification-type.enum.constant.js';
import { NotificationRepository } from '../repositories/notification.repository.js';

@Entity({
	tableName: 'notifications',
	repository: () => NotificationRepository,
})
export class Notification extends MikroOrmEntityAbstractClass {
	@Enum(() => NotificationTypeEnum)
	type: NotificationTypeEnum;

	// Fallback texts: in case a type is added later that a client has no wording for,
	// these are shown as they are
	@Property({ type: 'text', nullable: true })
	title?: string | null;

	@Property({ type: 'text', nullable: true })
	description?: string | null;

	// App path the notification opens, e.g. `/reports/123`
	@Property({ type: 'text', nullable: true })
	path?: string | null;

	@Property({ type: 'timestamp', nullable: true })
	readAt?: Date | null;

	@ManyToOne({
		entity: () => User,
		deleteRule: 'cascade',
	})
	user: Rel<User>;
}
