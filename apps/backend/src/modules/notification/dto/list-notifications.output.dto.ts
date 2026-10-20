import { PaginatedResult } from 'src/shared/interfaces/paginated-result.interface.js';

import { NotificationTypeEnum } from '../constants/notification-type.enum.constant.js';
import { Notification } from '../entities/notification.entity.js';

interface ListNotificationsItem {
	id: Notification['id'];
	createdAt: Date;
	type: NotificationTypeEnum;
	readAt?: Date;

	// Fallback texts: in case a type is added later that a client has no wording for,
	// these are shown as they are
	title?: string;
	description?: string;
	path?: string;
}

export interface ListNotificationsOutputDto extends PaginatedResult<ListNotificationsItem> {}
