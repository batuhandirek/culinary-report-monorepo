import { EntityRepository } from '@mikro-orm/postgresql';

import { NotificationPreference } from '../entities/notification-preference.entity.js';

export class NotificationPreferenceRepository extends EntityRepository<NotificationPreference> {}
