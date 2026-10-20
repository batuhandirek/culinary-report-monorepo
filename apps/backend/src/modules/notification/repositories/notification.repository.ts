import { EntityRepository } from '@mikro-orm/postgresql';

import { Notification } from '../entities/notification.entity.js';

export class NotificationRepository extends EntityRepository<Notification> {}
