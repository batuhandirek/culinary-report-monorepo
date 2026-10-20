import { tags } from 'typia';

import { PaginationRequest } from 'src/shared/interfaces/pagination-request.interface.js';

export interface ListNotificationsInputDto extends PaginationRequest {
	from?: string & tags.Format<'date'>;
	unreadOnly?: boolean;
}
