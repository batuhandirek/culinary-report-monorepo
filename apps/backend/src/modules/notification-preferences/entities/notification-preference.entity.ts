import type { Rel } from '@mikro-orm/core';
import { Entity, ManyToOne, Property, Unique } from '@mikro-orm/decorators/legacy';

import { User } from 'src/modules/auth/entities/user.entity.js';
import { MikroOrmEntityAbstractClass } from 'src/shared/abstractions/mikro-orm-entity.abstract-class.js';

import type {
	NotificationChannel,
	NotificationTopic,
} from '../constants/notification-preferences.constant.js';
import { NotificationPreferenceRepository } from '../repositories/notification-preference.repository.js';

// One switch a user set on `/profil/izinler`. Only switches they touched have a row; the
// rest fall back to `NOTIFICATION_PREFERENCE_DEFAULT`. `topic` and `channel` are plain
// text, so a new one needs no migration (`NOTIFICATION_TOPIC_CHANNELS` is the list).
@Entity({
	tableName: 'user_notification_preferences',
	repository: () => NotificationPreferenceRepository,
})
@Unique({ properties: ['user', 'topic', 'channel'] })
export class NotificationPreference extends MikroOrmEntityAbstractClass {
	@ManyToOne({ entity: () => User, deleteRule: 'cascade' })
	user: Rel<User>;

	@Property({ type: 'text' })
	topic: NotificationTopic;

	@Property({ type: 'text' })
	channel: NotificationChannel;

	@Property({ type: 'boolean' })
	enabled: boolean;
}
